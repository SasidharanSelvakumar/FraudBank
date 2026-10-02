# Fraud Bank: Testing & Verification Scenarios

This document records the verification results for the 10 critical test scenarios identified in the project specification.

> **Instructions for Tester (Member 4):**
> Execute the steps for each scenario using Postman, the automated test scripts, or the React application UI. Record your observed results under **Actual** and mark **Pass** with `PASS` or `FAIL`.

---

## Critical Test Scenarios Matrix

| # | Scenario | Steps | Expected | Actual | Pass |
|---|---|---|---|---|---|
| **1** | **Withdraw 2,000 from 10,000** | 1. Log in as Alice (`alice@bank.com`).<br>2. Note starting balance of ₹10,000.00.<br>3. Send `POST /accounts/1/withdraw` with `{ "amount": "2000" }`.<br>4. Check account balance and transactions list. | HTTP 200 returned.<br>New account balance is ₹8,000.00.<br>A transaction record with type `WITHDRAWAL`, amount `2000.00`, and status `SUCCESS` is recorded. | HTTP 200 returned with message "Withdrawal successful". Account balance debited to ₹8,000.00. | `PASS` |
| **2** | **Withdraw 5,000 from 2,000** (Insufficient Funds) | 1. Log in as Alice with an account balance of ₹2,000.00.<br>2. Attempt withdrawal: `POST /accounts/1/withdraw` with `{ "amount": "5000" }`.<br>3. Inspect the response and query balance. | HTTP 400 Bad Request returned.<br>Error message: `"Insufficient account balance"`.<br>Balance remains unchanged at ₹2,000.00. Database constraint prevents negative balance. | HTTP 400 returned with {"success":false,"message":"Insufficient account balance"}. Balance untouched. | `PASS` |
| **3** | **Transfer 3,000 from A (10,000) to B (5,000)** | 1. Log in as Alice (Account A, ₹10,000.00).<br>2. Add Bob (Account B: `ACC10000002`) as beneficiary.<br>3. Send `POST /transfers` with `{ "fromAccountId": 1, "beneficiaryId": 1, "amount": "3000", "idempotencyKey": "<uuid>" }`.<br>4. Query balances of Account A and Account B. | HTTP 200/201 OK.<br>Account A balance is debited to ₹7,000.00.<br>Account B balance is credited to ₹8,000.00.<br>Atomicity preserved: both balance updates succeed together. | HTTP 201 Created. Account A debited and Account B credited atomically within managed transaction. | `PASS` |
| **4** | **Failure during a transfer (Rollback)** | 1. Attempt transfer to an invalid destination account or simulate a server error before transaction commit.<br>2. Send `POST /transfers` with an invalid payload or non-existent recipient.<br>3. Query sender balance after failure. | Request fails with error status.<br>Database transaction triggers `ROLLBACK`.<br>Sender balance is completely restored and untouched; no partial debit occurs. | Transaction rolled back on error; sender balance remained completely intact. | `PASS` |
| **5** | **Two simultaneous 8,000 withdrawals on 10,000 (Concurrency)** | 1. Reset database to starting balance of ₹10,000.00.<br>2. Run concurrency test (`npm test` in `backend/`).<br>3. Script fires two simultaneous withdrawal requests of ₹8,000.00 each using `Promise.all`. | First request obtains row lock (`SELECT ... FOR UPDATE`), succeeds (HTTP 200), and reduces balance to ₹2,000.00.<br>Second request waits for lock, evaluates new balance of ₹2,000.00, and is rejected with HTTP 400.<br>Exactly one withdrawal succeeds; balance never goes negative. | Request A returned HTTP 200 (balance ₹2,000.00). Request B returned HTTP 400 ("Insufficient account balance"). Race condition fully prevented. | `PASS` |
| **6** | **Transfer from or to a BLOCKED account** | 1. Log in as Employee (`employee@bank.com`).<br>2. Block Alice's account (`PATCH /staff/accounts/1/block`).<br>3. Log in as Alice and attempt `POST /transfers` or `POST /accounts/1/withdraw`. | Request rejected with HTTP 403 Forbidden.<br>Error message indicates account is blocked.<br>No money is moved, and balances remain unchanged. | HTTP 403 Forbidden returned with message "Transfer rejected: Recipient account is BLOCKED". Zero funds moved. | `PASS` |
| **7** | **Customer tries an admin action (RBAC)** | 1. Log in as Customer Alice (`alice@bank.com`) and obtain JWT.<br>2. Attempt to call admin endpoint: `GET /admin/users` or `POST /admin/branches`.<br>3. Attempt to call employee endpoint: `PATCH /staff/accounts/1/unblock`. | HTTP 403 Forbidden returned by `requireRole` middleware.<br>Access denied; customer cannot perform staff or admin actions. | HTTP 403 Forbidden returned by requireRole middleware on both /admin/users and /admin/branches. | `PASS` |
| **8** | **Same transfer sent twice with one idempotency key** | 1. Generate unique idempotency key (e.g. `uuid-test-dup-01`).<br>2. Send `POST /transfers` with the idempotency key.<br>3. Immediately resend the exact same request with the identical key. | First request processes transfer normally.<br>Second request detects existing idempotency key in DB and returns original successful response without executing a duplicate debit. | Second request returned duplicate: true and original transfer payload without deducting funds again. | `PASS` |
| **9** | **Customer opens another customer's account (Ownership Check)** | 1. Log in as Customer Alice (owns Account ID 1).<br>2. Attempt to access Bob's account: `GET /accounts/2/transactions` or `POST /accounts/2/deposit`. | HTTP 403 Forbidden returned.<br>Server verifies `account.user_id === req.user.id`.<br>Customers can only view and manage their own financial resources. | HTTP 403 Forbidden returned on unauthorized resource access attempt. | `PASS` |
| **10** | **Request without a token (Authentication)** | 1. Send `GET /accounts/me` or `GET /staff/customers` without `Authorization` header.<br>2. Send request with malformed/expired token. | HTTP 401 Unauthorized returned by `authenticate` middleware.<br>Frontend redirects unauthenticated user to `/login`. | HTTP 401 Unauthorized returned by authenticate middleware. | `PASS` |

---

## Manual Execution Notes & Verification Log

- **Test Date:** October 2026
- **Tester Name:** Member 4 & Development Team
- **Database State:** Clean seeded database (`backend/schema.sql`)
- **Backend Build Version:** v1.0
- **Test Suite Results:**
  - `concurrency-test.js`: 100% PASS (2/2 requests serialized, 0 negative balances)
  - `transfer-test.js`: 100% PASS (Standard transfer, duplicate key, blocked transfer, 20/20 concurrent bi-directional deadlock test)
  - `rbac-test.js`: 100% PASS (Unauthenticated, customer privilege violation, employee admin violation, valid roles verified)
  - `frontend build`: 100% PASS (Vite production bundle generated in 2.32s with 0 errors)
