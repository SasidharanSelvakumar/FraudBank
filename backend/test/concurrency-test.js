/**
 * Automated Concurrency Test
 * Simulates two simultaneous withdrawals of 8,000 against a starting balance of 10,000.
 * Proves that pessimistic row locking (SELECT ... FOR UPDATE) prevents double spending.
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';

async function runTest() {
  console.log('====================================================');
  console.log('  FRAUD BANK: CONCURRENCY TEST (Simultaneous Debit) ');
  console.log('====================================================');

  try {
    // 1. Log in as Alice
    console.log('[1/4] Authenticating as Alice (alice@bank.com)...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@bank.com', password: 'password123' })
    });

    const loginData = await loginRes.json();
    if (!loginData.success) {
      throw new Error(`Login failed: ${loginData.message}`);
    }

    const token = loginData.token;
    console.log('✓ Logged in successfully.');

    // 2. Query starting balance
    console.log('[2/4] Fetching account details...');
    const acctRes = await fetch(`${BASE_URL}/accounts/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const acctData = await acctRes.json();
    const account = acctData.account;
    console.log(`✓ Account ${account.accountNumber} starting balance: ₹${account.balance}`);

    // If balance is less than 10000, deposit to replenish
    if (Number(account.balance) < 10000) {
      const topUp = (10000 - Number(account.balance)).toFixed(2);
      console.log(`Top-up required: Depositing ₹${topUp}...`);
      await fetch(`${BASE_URL}/accounts/${account.id}/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: topUp })
      });
    }

    // 3. Fire two simultaneous withdrawal requests of ₹8,000 each
    console.log('[3/4] Firing two simultaneous withdrawals of ₹8,000.00 each...');
    const withdrawRequest = (id) =>
      fetch(`${BASE_URL}/accounts/${account.id}/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: '8000' })
      }).then(async (r) => ({
        id,
        status: r.status,
        body: await r.json()
      }));

    const [res1, res2] = await Promise.all([
      withdrawRequest('Request A'),
      withdrawRequest('Request B')
    ]);

    console.log(`- Request A returned HTTP ${res1.status}: ${JSON.stringify(res1.body)}`);
    console.log(`- Request B returned HTTP ${res2.status}: ${JSON.stringify(res2.body)}`);

    // 4. Verification
    console.log('[4/4] Evaluating concurrency safety assertions...');
    const onePassed = (res1.status === 200 && res2.status === 400) || (res2.status === 200 && res1.status === 400);

    // Verify closing balance
    const checkRes = await fetch(`${BASE_URL}/accounts/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const checkData = await checkRes.json();
    console.log(`Closing balance: ₹${checkData.account.balance}`);

    if (onePassed && Number(checkData.account.balance) >= 0) {
      console.log('====================================================');
      console.log('✓ PASS: Concurrency race condition prevented!');
      console.log('  Exactly one withdrawal succeeded. Balance remained positive.');
      console.log('====================================================');
    } else {
      console.error('====================================================');
      console.error('✗ FAIL: Race condition detected or unexpected response.');
      console.error('====================================================');
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Test execution failed with error:', err.message);
    process.exitCode = 1;
  }
}

runTest();
