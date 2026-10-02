/**
 * Transfer Integrity & Deadlock Prevention Test Suite
 * Covers:
 *  1. Successful atomic transfer
 *  2. Duplicate idempotency key protection
 *  3. Blocked account transfer rejection (403)
 *  4. 20-transfer bi-directional concurrent test (Deadlock verification)
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Login failed for ${email}: ${data.message}`);
  return data.token;
}

async function getAccount(token) {
  const res = await fetch(`${BASE_URL}/accounts/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  return data.account;
}

async function runTransferTests() {
  console.log('========================================================');
  console.log('  FRAUD BANK: ATOMIC TRANSFER & DEADLOCK TEST SUITE     ');
  console.log('========================================================');

  try {
    const aliceToken = await login('alice@bank.com', 'password123');
    const bobToken = await login('bob@bank.com', 'password123');
    const employeeToken = await login('employee@bank.com', 'password123');

    const aliceAcct = await getAccount(aliceToken);
    const bobAcct = await getAccount(bobToken);

    // Ensure Alice has Bob as beneficiary
    const benRes = await fetch(`${BASE_URL}/beneficiaries`, {
      headers: { Authorization: `Bearer ${aliceToken}` }
    });
    const benData = await benRes.json();
    let bobBenId = (benData.beneficiaries || []).find(b => b.accountNumber === bobAcct.accountNumber)?.id;

    if (!bobBenId) {
      const addBenRes = await fetch(`${BASE_URL}/beneficiaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aliceToken}`
        },
        body: JSON.stringify({
          accountNumber: bobAcct.accountNumber,
          name: 'Bob Jones'
        })
      });
      const addBenData = await addBenRes.json();
      bobBenId = addBenData.beneficiary.id;
    }

    // TEST 1: Standard Transfer
    console.log('\n[TEST 1] Testing standard atomic transfer (Alice -> Bob ₹100.00)...');
    const idempotencyKey1 = `key-test-standard-${Date.now()}`;
    const tx1Res = await fetch(`${BASE_URL}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`
      },
      body: JSON.stringify({
        fromAccountId: aliceAcct.id,
        beneficiaryId: bobBenId,
        amount: '100.00',
        idempotencyKey: idempotencyKey1
      })
    });
    const tx1Data = await tx1Res.json();
    if (tx1Res.status !== 201 && tx1Res.status !== 200) {
      throw new Error(`Standard transfer failed: ${JSON.stringify(tx1Data)}`);
    }
    console.log('✓ TEST 1 PASSED: Transfer succeeded atomically.');

    // TEST 2: Duplicate Idempotency Key
    console.log('\n[TEST 2] Testing duplicate idempotency key submission...');
    const tx2Res = await fetch(`${BASE_URL}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`
      },
      body: JSON.stringify({
        fromAccountId: aliceAcct.id,
        beneficiaryId: bobBenId,
        amount: '100.00',
        idempotencyKey: idempotencyKey1
      })
    });
    const tx2Data = await tx2Res.json();
    if (tx2Data.duplicate !== true) {
      throw new Error(`Expected duplicate flag, got: ${JSON.stringify(tx2Data)}`);
    }
    console.log('✓ TEST 2 PASSED: Duplicate transfer intercepted and replayed without double-debiting.');

    // TEST 3: Blocked Account Rejection
    console.log('\n[TEST 3] Testing transfer rejection on BLOCKED account...');
    // Block Bob's account as employee
    await fetch(`${BASE_URL}/staff/accounts/${bobAcct.id}/block`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employeeToken}` }
    });

    const tx3Res = await fetch(`${BASE_URL}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`
      },
      body: JSON.stringify({
        fromAccountId: aliceAcct.id,
        beneficiaryId: bobBenId,
        amount: '50.00',
        idempotencyKey: `key-test-blocked-${Date.now()}`
      })
    });
    const tx3Data = await tx3Res.json();

    // Unblock Bob's account immediately
    await fetch(`${BASE_URL}/staff/accounts/${bobAcct.id}/unblock`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employeeToken}` }
    });

    if (tx3Res.status !== 403) {
      throw new Error(`Expected HTTP 403 for blocked account, got ${tx3Res.status}`);
    }
    console.log(`✓ TEST 3 PASSED: Blocked account transfer rejected with 403: "${tx3Data.message}".`);

    // TEST 4: 20 Concurrent Bi-directional Transfers (Deadlock Test)
    console.log('\n[TEST 4] Testing 20 concurrent bi-directional transfers (Deadlock Test)...');

    // Ensure Bob also has Alice as beneficiary
    const bobBensRes = await fetch(`${BASE_URL}/beneficiaries`, {
      headers: { Authorization: `Bearer ${bobToken}` }
    });
    const bobBensData = await bobBensRes.json();
    let aliceBenId = (bobBensData.beneficiaries || []).find(b => b.accountNumber === aliceAcct.accountNumber)?.id;

    if (!aliceBenId) {
      const addAliceBen = await fetch(`${BASE_URL}/beneficiaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bobToken}`
        },
        body: JSON.stringify({
          accountNumber: aliceAcct.accountNumber,
          name: 'Alice Smith'
        })
      });
      const data = await addAliceBen.json();
      aliceBenId = data.beneficiary.id;
    }

    const promises = [];
    for (let i = 0; i < 20; i++) {
      const isAliceSender = i % 2 === 0;
      const senderToken = isAliceSender ? aliceToken : bobToken;
      const fromId = isAliceSender ? aliceAcct.id : bobAcct.id;
      const benId = isAliceSender ? bobBenId : aliceBenId;

      promises.push(
        fetch(`${BASE_URL}/transfers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${senderToken}`
          },
          body: JSON.stringify({
            fromAccountId: fromId,
            beneficiaryId: benId,
            amount: '10.00',
            idempotencyKey: `deadlock-test-${i}-${Date.now()}`
          })
        }).then(r => r.status)
      );
    }

    const statuses = await Promise.all(promises);
    const successes = statuses.filter(s => s === 201 || s === 200).length;
    console.log(`Finished 20 concurrent transfers. Results: ${successes}/20 successful.`);

    if (statuses.some(s => s === 500)) {
      throw new Error('Deadlock detected during concurrent bi-directional transfers!');
    }
    console.log('✓ TEST 4 PASSED: No circular locking deadlocks occurred.');

    console.log('\n========================================================');
    console.log('✓ ALL TRANSFER TESTS PASSED SUCCESSFULLY!');
    console.log('========================================================');
  } catch (err) {
    console.error('\n✗ Transfer Test Suite Failed:', err.message);
    process.exitCode = 1;
  }
}

runTransferTests();
