# Fraud Bank: 5-Minute Live Presentation & Demo Script

A step-by-step presentation script designed for the 4-member team. Total duration: **5 minutes**.
Every member has a dedicated speaking role and live screen interaction.

---

## Quick Reference: Test Credentials

| Role | Email | Password | Starting State |
|---|---|---|---|
| **Customer (Alice)** | `alice@bank.com` | `password123` | Active (`ACC10000001`), Balance: ₹10,000.00 |
| **Customer (Bob)** | `bob@bank.com` | `password123` | Active (`ACC10000002`), Balance: ₹5,000.00 |
| **Customer (Carol)** | `carol@bank.com` | `password123` | Pending (`ACC10000003`), Balance: ₹0.00 |
| **Employee** | `employee@bank.com` | `password123` | Access to `/staff/*` |
| **Admin** | `admin@bank.com` | `password123` | Access to `/admin/*` & `/staff/*` |

---

## Timeline & Presentation Breakdown

```text
[0:00 - 0:45] Member 1: Problem Statement, Core Concepts & Architecture
[0:45 - 2:00] Member 3: Customer Flow (Deposit, Transfer, Idempotency, Statement)
[2:00 - 3:00] Member 4: Staff Operations (Customer verification, Block, RBAC)
[3:00 - 3:45] Member 1: Live Concurrency Proof (Row-locking demonstration)
[3:45 - 5:00] Member 2: Admin Governance, Branch Setup & Audit Logs
```

---

## Detailed Step-by-Step Script

### Part 1: Introduction & Architecture (0:00 – 0:45)
**Speaker:** Member 1 (Backend Foundation Lead)  
**Screen:** Application Landing / Login Page

- **What to click:**
  1. Have browser open on `http://localhost:5173/login`.
  2. Keep a split terminal window visible showing the Node.js backend running on port 5000.
- **What to say:**
  > *"Good morning/afternoon everyone. Today our team is presenting **Fraud Bank**, a full-stack simulated banking platform built with React, Node.js Express, and PostgreSQL.*  
  > *In financial systems, basic CRUD is not enough. The hard engineering problems are **strict role-based authorization**, **transaction atomicity**, **balance validation**, and **concurrency safety**. Our database enforces row-level locks and transactional isolation so money can never be duplicated, lost, or made negative.*  
  > *Now, Member 3 will walk you through our customer banking experience."*

---

### Part 2: Customer Flow & Atomic Transfers (0:45 – 2:00)
**Speaker:** Member 3 (Customer Frontend Lead)  
**Screen:** Customer Dashboard (`/dashboard`) & Transfers (`/transfer`)

- **What to click:**
  1. Log in as **Alice** (`alice@bank.com` / `password123`).
  2. Point to the ₹10,000.00 balance card.
  3. Click **Deposit**, deposit ₹1,000.00. Show balance update to ₹11,000.00.
  4. Navigate to **Transfer Money**:
     - Select recipient: **Bob Jones (`ACC10000002`)**.
     - Enter Amount: `₹3000`.
     - Click **Send Transfer**.
  5. Navigate to **Transactions / Statement**:
     - Point out the `DEBIT` of ₹3,000.00 with counterpart Bob Jones.
     - Show the new closing balance of ₹8,000.00.
- **What to say:**
  > *"I am logged in as Alice. On our customer dashboard, you see real-time balance calculations backed by PostgreSQL NUMERIC types to prevent floating-point rounding errors.*  
  > *I just deposited ₹1,000, and now I'll transfer ₹3,000 to Bob. Behind the scenes, the backend generates an `idempotencyKey` on form load. If a user double-clicks the transfer button on a slow network, the transaction is processed exactly once.*  
  > *Both the debit on Alice's account and the credit on Bob's account execute inside a single atomic database transaction. If anything failed midway, neither account would be charged.*  
  > *Now I'll hand over to Member 4 to demonstrate our staff operations."*

---

### Part 3: Employee Verification & Account Blocking (2:00 – 3:00)
**Speaker:** Member 4 (Staff/Admin Screens Lead)  
**Screen:** Staff Portal (`/staff/customers` & `/staff/customers/:userId`)

- **What to click:**
  1. Log out as Alice and log in as **Employee** (`employee@bank.com` / `password123`).
  2. Lands automatically on `/staff/customers`.
  3. Type "Carol" into the search bar, click **Search**.
  4. Click **View Details** on Carol's account (`ACC10000003`):
     - Point out the yellow **PENDING** badge.
     - Notice only **Verify Account** and **Block Account** buttons are available.
     - Click **Verify Account** $\rightarrow$ status changes to green **ACTIVE**.
  5. Go back to `/staff/customers` and open **Alice's** account (`ACC10000001`):
     - Click **Block Account**.
     - Confirm the alert confirmation dialog.
     - Notice status changes to red **BLOCKED** and button flips to **Unblock Account**.
  6. Quickly switch to an incognito window with Alice logged in and attempt a transfer:
     - Show the red error alert: *"Transfer rejected: account is BLOCKED"*.
- **What to say:**
  > *"As an employee, my landing page provides real-time customer monitoring and search. Here is customer Carol White, whose account starts in a PENDING status.*  
  > *Our UI dynamically adapts to state machine rules: verify is only available for PENDING accounts, and block is only allowed for ACTIVE or PENDING accounts. Clicking 'Verify' locks the row with `SELECT ... FOR UPDATE` and marks her account ACTIVE.*  
  > *Next, if we detect suspicious behavior on Alice's account, I click 'Block Account'. Notice the confirmation dialog protecting against accidental clicks. Once blocked, if Alice attempts any transfer, our backend rejects it with a 403 Forbidden.*  
  > *Now, Member 1 will show the live concurrency test proving our locking works under high load."*

---

### Part 4: Live Concurrency Proof (3:00 – 3:45)
**Speaker:** Member 1 (Backend Lead)  
**Screen:** Terminal running automated concurrency test

- **What to click:**
  1. Switch to terminal in `backend/`.
  2. Execute command:
     ```bash
     npm test
     ```
  3. Highlight the terminal output:
     - Request 1: `HTTP 200 - SUCCESS, new balance 2000.00`
     - Request 2: `HTTP 400 - Insufficient account balance`
     - `PASS: only one withdrawal succeeded`
- **What to say:**
  > *"To prove that concurrent requests cannot corrupt financial state or allow double spending, we wrote an automated concurrency test.*  
  > *Alice has ₹10,000. The script fires two simultaneous withdrawal requests of ₹8,000 each at the exact same millisecond.*  
  > *Without row locking, both requests would read ₹10,000 and both would succeed, leaving Alice with negative ₹6,000. But with our `SELECT ... FOR UPDATE` lock, Request 1 executes and reduces balance to ₹2,000. Request 2 waits, reads the updated ₹2,000, and is immediately rejected with a 400. Exactly one succeeded, balance is verified.*  
  > *Now Member 2 will demonstrate our Admin governance."*

---

### Part 5: Admin Governance, Branches & Audit Trail (3:45 – 5:00)
**Speaker:** Member 2 (Auth, RBAC & Audit Lead)  
**Screen:** Admin Portal (`/admin/users`, `/admin/branches`, `/admin/audit-logs`)

- **What to click:**
  1. Log in as **Admin** (`admin@bank.com` / `password123`).
  2. Navigate to **System Users** (`/admin/users`):
     - Filter by `Role: EMPLOYEE`.
     - Point out the disabled "Current user" button to show self-deactivation is prohibited.
  3. Navigate to **Bank Branches** (`/admin/branches`):
     - Click **+ Add New Branch**.
     - Input: Code `BR004`, Name `East Coast Branch`, Address `220 Ocean Way`.
     - Click **Create Branch** $\rightarrow$ shows new branch in table.
  4. Navigate to **Audit Logs** (`/admin/audit-logs`):
     - Filter by `Action: ACCOUNT_BLOCKED`.
     - Point to the timestamped record showing John Staff blocked Alice's account earlier in our demo.
- **What to say:**
  > *"Finally, as an Admin, I oversee banking infrastructure and compliance.*  
  > *In User Management, we enforce separation of duties—an administrator cannot deactivate their own account. Under Branches, admins can register new branch locations with unique code validation.*  
  > *Most importantly, all privileged actions create an immutable audit record in our `audit_logs` table. In our audit log view, we can filter by action and date. Here is the exact timestamped entry of John Staff blocking Alice's account from Member 4's earlier step.*  
  > *In conclusion, Fraud Bank satisfies real banking reliability standards: role-based security, atomic transactions, row-locking concurrency defense, and full audit compliance. Thank you!"*

---

## Rehearsal Checklist & Tips
- [ ] **Reset database before starting:** Run `psql -U postgres -d fraudbank -f backend/schema.sql` so balances and sample accounts match the script.
- [ ] **Pre-open browser tabs:** Have one Chrome window for customer/staff and one incognito tab ready to switch quickly.
- [ ] **Keep terminal visible:** Have the terminal font enlarged so the audience can clearly read `npm test` concurrency PASS.
- [ ] **Time check:** If running ahead of time, spend an extra 15 seconds demonstrating the date filters in Audit Logs. If running behind, skip branch editing and go straight to Audit Logs.
