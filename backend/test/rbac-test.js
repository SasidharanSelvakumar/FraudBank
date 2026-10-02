/**
 * Role-Based Access Control (RBAC) Test Suite
 * Verifies that route guards strictly enforce permissions across roles:
 *  - Unauthenticated access returns 401
 *  - Customer accessing /admin/users returns 403
 *  - Employee accessing /admin/branches returns 403
 *  - Employee accessing /staff/customers returns 200
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

async function runRbacTests() {
  console.log('========================================================');
  console.log('  FRAUD BANK: RBAC ACCESS CONTROL TEST SUITE            ');
  console.log('========================================================');

  try {
    const customerToken = await login('alice@bank.com', 'password123');
    const employeeToken = await login('employee@bank.com', 'password123');
    const adminToken = await login('admin@bank.com', 'password123');

    // 1. Unauthenticated request without token -> 401
    console.log('\n[TEST 1] Request without authentication header...');
    const noAuthRes = await fetch(`${BASE_URL}/accounts/me`);
    if (noAuthRes.status !== 401) {
      throw new Error(`Expected HTTP 401, got ${noAuthRes.status}`);
    }
    console.log('✓ TEST 1 PASSED: Unauthenticated access blocked with HTTP 401.');

    // 2. Customer accessing admin endpoint -> 403
    console.log('\n[TEST 2] Customer attempting to access /admin/users...');
    const custAdminRes = await fetch(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    if (custAdminRes.status !== 403) {
      throw new Error(`Expected HTTP 403 for Customer on /admin/users, got ${custAdminRes.status}`);
    }
    console.log('✓ TEST 2 PASSED: Customer access to admin panel blocked with HTTP 403.');

    // 3. Employee accessing admin endpoint -> 403
    console.log('\n[TEST 3] Employee attempting to access /admin/branches...');
    const empAdminRes = await fetch(`${BASE_URL}/admin/branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({
        branchCode: 'TEST999',
        name: 'Unauthorized Branch',
        address: 'Nowhere'
      })
    });
    if (empAdminRes.status !== 403) {
      throw new Error(`Expected HTTP 403 for Employee on /admin/branches, got ${empAdminRes.status}`);
    }
    console.log('✓ TEST 3 PASSED: Employee access to admin operations blocked with HTTP 403.');

    // 4. Employee accessing staff endpoint -> 200
    console.log('\n[TEST 4] Employee accessing /staff/customers...');
    const empStaffRes = await fetch(`${BASE_URL}/staff/customers`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    if (empStaffRes.status !== 200) {
      throw new Error(`Expected HTTP 200 for Employee on /staff/customers, got ${empStaffRes.status}`);
    }
    console.log('✓ TEST 4 PASSED: Employee access to staff customer directory allowed with HTTP 200.');

    // 5. Admin accessing admin endpoint -> 200
    console.log('\n[TEST 5] Admin accessing /admin/users...');
    const adminRes = await fetch(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (adminRes.status !== 200) {
      throw new Error(`Expected HTTP 200 for Admin on /admin/users, got ${adminRes.status}`);
    }
    console.log('✓ TEST 5 PASSED: Admin full access confirmed with HTTP 200.');

    console.log('\n========================================================');
    console.log('✓ ALL RBAC TESTS PASSED SUCCESSFULLY!');
    console.log('========================================================');
  } catch (err) {
    console.error('\n✗ RBAC Test Suite Failed:', err.message);
    process.exitCode = 1;
  }
}

runRbacTests();
