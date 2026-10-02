# Fraud Bank Application

A **simulated banking application** that lets customers, employees and admins perform common banking operations using **virtual money**. The project focuses on the engineering problems that make real banking software hard: **role-based access, atomic transfers, balance validation and safe handling of concurrent requests.**

> No real money is involved. This is a learning and demonstration project.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Features and Roles](#3-features-and-roles)
4. [Tech Stack](#4-tech-stack)
5. [System Architecture](#5-system-architecture)
6. [Database Design](#6-database-design)
7. [How Money Operations Work](#7-how-money-operations-work)
8. [API Reference](#8-api-reference)
9. [Project Structure](#9-project-structure)
10. [Setup and Installation](#10-setup-and-installation)
11. [Sample Accounts](#11-sample-accounts)
12. [Testing](#12-testing)
13. [Demo Script](#13-demo-script)
14. [Security](#14-security)
15. [Project Status](#15-project-status)
16. [Scope Decisions and Future Enhancements](#16-scope-decisions-and-future-enhancements)
17. [Team Workflow](#17-team-workflow)

---

## 1. Project Overview

Fraud Bank is a web application with a REST API backend and a React frontend. Users sign in and, depending on their role, can manage accounts, move virtual money, review transaction history, or administer the bank.

The main idea the project demonstrates:

```text
Login  ->  Who are you?
Role   ->  What are you allowed to do?
Database transaction + row locking  ->  Is the money operation safe?
```

---

## 2. Problem Statement

People use banking systems for account management, deposits, withdrawals, transfers and transaction tracking. A banking application must provide these operations **and** keep financial data correct when many requests arrive at the same time.

The system must ensure that:

- Only authorized users can perform specific operations.
- Balances are validated before every financial operation.
- Transfers are **atomic** (they fully succeed or fully fail).
- Concurrent transactions never corrupt account balances.
- Every financial operation is recorded.
- Administrative actions can be audited.

**Key entities:** User, Account, Transaction, Beneficiary, BankBranch
**Key concepts:** database transactions, concurrency, balance validation, transaction atomicity

---

## 3. Features and Roles

### Customer
- Register and log in
- Create a bank account
- View account and check balance
- Deposit and withdraw money
- Add, view and remove beneficiaries
- Transfer money to a beneficiary
- View transaction history and account statement (filter by type and date, with pagination)

### Employee
- Log in
- View customers and their accounts
- Verify new accounts
- Block and unblock accounts
- Monitor and search all transactions

### Admin
- Everything an employee can do
- Manage users and employees
- Manage bank branches
- View audit logs

### Rules enforced by the system
- A customer can only access **their own** account and transactions.
- Employees cannot change customer balances directly (least privilege).
- Only accounts with status `ACTIVE` can deposit, withdraw or transfer.
- New accounts start as `PENDING` until an employee verifies them.
- Balance can never go below zero (checked in code **and** by a database constraint).

---

## 4. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React (Vite) | Component-based, easy to split into pages |
| Backend | Node.js + Express | One language across the project, quick to build |
| Database | PostgreSQL | Real transactions and row-level locking |
| DB driver | `pg` (node-postgres) | Lets us write `BEGIN / FOR UPDATE / COMMIT` directly |
| Authentication | JWT + `bcryptjs` | Simple, stateless login |
| Tooling | Git, GitHub, Postman, VS Code | Collaboration and testing |

---

## 5. System Architecture

A simple three-layer design: the React app talks to the Express API, which talks to PostgreSQL. PostgreSQL is the **single source of truth** for all financial data.

```text
+-----------------+       HTTP / JSON       +----------------------+
|  React Frontend | ----------------------> |  Express Backend API |
|  (Customer,     | <---------------------- |                      |
|  Employee,      |      JWT in header      |  Auth  + RBAC        |
|  Admin screens) |                         |  Accounts            |
+-----------------+                         |  Transactions        |
                                            |  Transfers           |
                                            |  Beneficiaries       |
                                            |  Staff / Admin       |
                                            |  Audit logs          |
                                            +----------+-----------+
                                                       |
                                                       v
                                            +----------------------+
                                            |      PostgreSQL      |
                                            |  (source of truth)   |
                                            +----------------------+
```

### Request flow for a protected API call

```text
Request
  |
  v
authenticate   -> checks the JWT          (fails: 401 Unauthorized)
  |
  v
requireRole    -> checks the user's role  (fails: 403 Forbidden)
  |
  v
Route handler  -> checks ownership, validates input, runs the DB transaction
  |
  v
JSON response  -> { success: true/false, ... }
```

---

## 6. Database Design

Six tables. `users.role` is a single column (`CUSTOMER`, `EMPLOYEE` or `ADMIN`) to keep authorization simple.

```text
users            id, name, email (unique), password_hash, role, created_at
bank_branches    id, branch_code (unique), name, address, created_at
accounts         id, account_number (unique), user_id (unique), branch_id,
                 balance NUMERIC(15,2) CHECK (balance >= 0),
                 status (PENDING | ACTIVE | BLOCKED), created_at, updated_at
beneficiaries    id, user_id, beneficiary_account_id, name, created_at
                 UNIQUE (user_id, beneficiary_account_id)
transactions     id, from_account_id, to_account_id,
                 type (DEPOSIT | WITHDRAWAL | TRANSFER),
                 amount CHECK (amount > 0),
                 status (PENDING | SUCCESS | FAILED),
                 idempotency_key (unique), created_at
audit_logs       id, user_id, action, target_id, details, created_at
```

### Relationships

```text
users 1 ---- 1 accounts          (one account per customer)
users 1 ---- * beneficiaries     (a beneficiary points to another account)
bank_branches 1 ---- * accounts
accounts 1 ---- * transactions   (as sender and/or receiver)
users 1 ---- * audit_logs        (who performed an action)
```

### Design decisions
- **Money is `NUMERIC(15,2)`**, never a float, so there are no rounding errors.
- **`CHECK (balance >= 0)`** is a database-level safety net behind the application checks.
- **One transactions table** covers all three types:
  - `DEPOSIT`: `from_account_id` is NULL
  - `WITHDRAWAL`: `to_account_id` is NULL
  - `TRANSFER`: both are set
- **`idempotency_key`** stops a double-clicked transfer from being processed twice.

The full SQL (with sample data) is in `backend/schema.sql`.

---

## 7. How Money Operations Work

All financial operations run inside a **database transaction** and **lock the account row(s)** with `SELECT ... FOR UPDATE` before checking the balance.

### Deposit
```text
Check ownership -> BEGIN -> lock account -> check ACTIVE
 -> balance + amount -> record transaction -> COMMIT
```

### Withdrawal
```text
Check ownership -> BEGIN -> lock account -> check ACTIVE
 -> check balance >= amount -> balance - amount -> record transaction -> COMMIT
```

### Transfer
```text
Validate sender owns the account
Validate beneficiary belongs to the sender
Reject transfer to the same account
Duplicate idempotency key? -> return the original result
BEGIN
  Lock BOTH accounts (lowest id first)
  Both ACTIVE?            no -> reject (403)
  Sender has enough?      no -> reject (400)
  Debit sender
  Credit receiver
  Record transaction
COMMIT        (any error -> ROLLBACK, balances unchanged)
```

### Why locking matters (concurrency)

```text
Balance = 10,000
Request A: withdraw 8,000        Request B: withdraw 8,000

A: lock account -> check 10,000 -> withdraw -> balance 2,000 -> commit
B: waits for lock ........................ reads 2,000 -> 8,000 > 2,000 -> REJECT
```

Without the lock, both requests could read 10,000 and both succeed, leaving a negative or incorrect balance.

### Why transfers lock the lowest id first
If A->B and B->A run at the same moment, each could lock one account and wait forever for the other (a **deadlock**). Always locking in the same order (ascending id) prevents this.

### Atomicity
The debit, the credit and the transaction record are one unit. If any step fails, `ROLLBACK` restores the original balances.

---

## 8. API Reference

Base URL: `http://localhost:5000`
Protected routes need the header: `Authorization: Bearer <token>`

### Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Create a customer user |
| POST | `/auth/login` | Public | Returns a JWT token |
| GET | `/auth/me` | Logged in | Current user info |

### Accounts and transactions
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/accounts` | Customer | Create my account (starts `PENDING`) |
| GET | `/accounts/me` | Customer | My account and balance |
| POST | `/accounts/:id/deposit` | Customer (owner) | Body: `{ "amount": "500" }` |
| POST | `/accounts/:id/withdraw` | Customer (owner) | Body: `{ "amount": "200" }` |
| GET | `/accounts/:id/transactions` | Owner or staff | History and transactions list |
| GET | `/accounts/:id/statement` | Owner or staff | Detailed account statement with totals |

Transaction history query parameters: `page`, `limit`, `type`, `from` (date), `to` (date).
Each row includes `direction`: `CREDIT` or `DEBIT`.

### Beneficiaries
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/beneficiaries` | Customer | Body: `{ "accountNumber": "ACC10000002", "name": "Bob" }` |
| GET | `/beneficiaries` | Customer | List my beneficiaries |
| DELETE | `/beneficiaries/:id` | Customer | Remove a beneficiary |

### Transfers
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/transfers` | Customer | Atomic transfer |
| GET | `/transfers/:id` | Customer | View one of my transfers |

Example request:
```json
{
  "fromAccountId": 1,
  "beneficiaryId": 1,
  "amount": "1000",
  "idempotencyKey": "unique-key-from-client"
}
```

### Notifications
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/notifications` | Logged in | List my in-app notifications |
| PATCH | `/notifications/:id/read` | Logged in | Mark single notification as read |
| PATCH | `/notifications/read-all` | Logged in | Mark all notifications as read |

### Branches
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/branches` | Public, Logged in | List all bank branches |
| POST | `/admin/branches` | Admin | Create bank branch |
| PUT | `/admin/branches/:id` | Admin | Update branch details |

### Staff and admin
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/staff/customers` | Employee, Admin | List customers and accounts (search, paginate) |
| GET | `/staff/customers/:userId` | Employee, Admin | View customer & account details |
| PATCH | `/staff/accounts/:id/verify` | Employee, Admin | `PENDING` to `ACTIVE` |
| PATCH | `/staff/accounts/:id/block` | Employee, Admin | Block an account |
| PATCH | `/staff/accounts/:id/unblock` | Employee, Admin | Unblock an account |
| GET | `/staff/transactions` | Employee, Admin | Search and filter all transactions |
| POST | `/admin/employees` | Admin | Create an employee |
| GET | `/admin/users` | Admin | Manage users (filter by role, search) |
| PATCH | `/admin/users/:id/activate` | Admin | Activate a user |
| PATCH | `/admin/users/:id/deactivate` | Admin | Deactivate a user |
| GET | `/admin/audit-logs` | Admin | View audit logs (filter by action, date) |

### Response format and status codes
```json
{ "success": false, "message": "Insufficient account balance" }
```

| Code | Meaning |
|---|---|
| 200 / 201 | Success / created |
| 400 | Invalid input or insufficient balance |
| 401 | Not logged in or invalid token |
| 403 | Not allowed (wrong role, not your account, account blocked) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, duplicate beneficiary, duplicate transfer) |
| 500 | Unexpected server error |

---

## 9. Project Structure

```text
fraud-bank/
├── backend/
│   ├── src/
│   │   ├── server.js              App entry, routes, error handler
│   │   ├── db.js                  DB pool, withTransaction(), HttpError, parseAmount()
│   │   ├── middleware/
│   │   │   └── auth.js            authenticate (JWT) and requireRole (RBAC)
│   │   └── routes/
│   │       ├── auth.js            register, login, me
│   │       ├── accounts.js        account, deposit, withdraw, history
│   │       ├── beneficiaries.js   add, list, remove
│   │       └── transfers.js       atomic transfer
│   ├── test/
│   │   └── concurrency-test.js    simultaneous withdrawal demo
│   ├── schema.sql                 tables and sample data
│   ├── .env.example
│   └── package.json
├── frontend/                      React app (to be built)
├── README.md
└── .gitignore                     includes .env and node_modules
```

---

## 10. Setup and Installation

### Prerequisites
- Node.js (LTS)
- PostgreSQL (with pgAdmin, optional)
- Git

### Steps

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd fraud-bank

# 2. Create the database
createdb -U postgres fraudbank

# 3. Load the schema and sample data
psql -U postgres -d fraudbank -f backend/schema.sql

# 4. Install backend dependencies
cd backend
npm install

# 5. Configure environment variables
cp .env.example .env
#   then edit .env and set your PostgreSQL password

# 6. Start the API
npm run dev
```

The API runs at `http://localhost:5000`. Check it with `GET /health`.

### Environment variables (`backend/.env`)
```env
PORT=5000
DATABASE_URL=postgres://postgres:<your-password>@localhost:5432/fraudbank
JWT_SECRET=<a-long-random-string>
```
Never commit `.env` to Git.

---

## 11. Sample Accounts

The schema creates these users. **The password for all is `password123`.**

| Role | Email | Account | Starting balance |
|---|---|---|---|
| Admin | admin@bank.com | none | none |
| Employee | employee@bank.com | none | none |
| Customer | alice@bank.com | ACC10000001 | 10,000.00 |
| Customer | bob@bank.com | ACC10000002 | 5,000.00 |

---

## 12. Testing

### Automated concurrency test
With the server running:
```bash
cd backend
npm test
```
It logs in as Alice and fires two withdrawals at the same instant, each for 80% of her balance.

Expected output:
```text
Request 1: HTTP 200 - SUCCESS, new balance 2000.00
Request 2: HTTP 400 - Insufficient account balance
PASS: only one withdrawal succeeded
```
To re-run it, reset the data: `psql -U postgres -d fraudbank -f backend/schema.sql`

### Critical test scenarios

| # | Scenario | Expected result |
|---|---|---|
| 1 | Withdraw 2,000 from 10,000 | Balance 8,000, transaction `SUCCESS` |
| 2 | Withdraw 5,000 from 2,000 | Rejected (400), balance unchanged |
| 3 | Transfer 3,000 from A (10,000) to B (5,000) | A = 7,000, B = 8,000 |
| 4 | Failure during a transfer | `ROLLBACK`, sender balance unchanged |
| 5 | Two simultaneous 8,000 withdrawals on 10,000 | Exactly one succeeds |
| 6 | Transfer from or to a `BLOCKED` account | Rejected (403) |
| 7 | Customer tries an admin action | 403 Forbidden |
| 8 | Same transfer sent twice with one idempotency key | Processed once, second call returns the original |
| 9 | Customer opens another customer's account | 403 Forbidden |
| 10 | Request without a token | 401 Unauthorized |

### Manual testing with Postman
1. `POST /auth/login` and copy the `token`.
2. Add `Authorization: Bearer <token>` to later requests.

---

## 13. Demo Script

A suggested 5-minute walkthrough for the presentation:

1. **Login as Alice** and show the dashboard and balance.
2. **Deposit and withdraw**, then show the transaction history.
3. **Add Bob as a beneficiary and transfer money.** Show both balances change.
4. **Login as the employee, block Alice's account.** Try a transfer and show it is rejected.
5. **Login as Alice and try an admin action.** Show `403 Forbidden`.
6. **Run `npm test`** to show two simultaneous withdrawals where only one succeeds. This is the key concurrency demonstration.
7. **Login as admin** and show the audit log of the block action.

---

## 14. Security

- Passwords are hashed with **bcrypt**, never stored in plain text.
- Authentication uses **JWT** with an 8-hour expiry.
- **RBAC is enforced in the backend**, not just hidden in the UI.
- Ownership checks: a customer can only touch their own account, beneficiaries and transfers.
- All SQL uses **parameterized queries** (no SQL injection).
- Amounts are validated: positive, maximum two decimals.
- Database constraints (`CHECK`, `UNIQUE`, foreign keys) back up the application logic.
- Secrets live in `.env`, which is excluded from Git.
- Public sign-up can only create `CUSTOMER` users. Staff accounts are created by an admin.

---

## 15. Project Status

| Area | Status |
|---|---|
| Database schema and sample data | Done |
| Register, login, JWT, role middleware | Done |
| Account creation, balance | Done |
| Deposit and withdrawal (locked, atomic) | Done |
| Beneficiary management | Done |
| Atomic transfers with locking and idempotency | Done |
| Transaction history and statement (filters, pagination) | Done |
| Concurrency test script | Done |
| Staff routes (verify, block, unblock, monitor) | Done |
| Admin routes (users, employees, branches) | Done |
| Audit logging | Done |
| In-app notifications | Done |
| React frontend | Done |
| Dockerization and deployment | In progress |

### Definition of done
- [x] All three roles can log in and see only what they are allowed to
- [x] Customer can deposit, withdraw, transfer, and manage beneficiaries
- [x] Customer can view history and statement
- [x] Employee can verify, block and unblock accounts
- [x] Admin can manage employees and branches, and view audit logs
- [x] Balance validation, atomic transfers and concurrency handling are demonstrated
- [x] README, API documentation and demo script are complete

---

## 16. Scope Decisions and Future Enhancements

To deliver a working project in limited time, the larger design was simplified. These were **deliberate choices**, and each one has a clear upgrade path:

| Left out for now | What we do instead | How it would be added later |
|---|---|---|
| Google OAuth | Email + password with JWT | Add an OAuth login route that maps to the same `users` table |
| Kafka event streaming | In-app notifications saved in the database | Publish a transaction event to Kafka after `COMMIT` (ideally with an outbox table) |
| Redis caching | Direct database reads | Cache branch data and non-critical lookups (never balances) |
| Amazon S3 | Not needed | Store profile images or KYC documents, keep only the file reference in the DB |
| Load balancer / multiple instances | Single backend instance | The backend is stateless (JWT), so several instances can run behind a load balancer |
| Email / SMS | Not needed | Add a notification consumer |
| Separate roles tables | Single `role` column | Move to `roles` and `user_roles` if multi-role users are needed |

### Other future ideas
- Two-factor authentication
- Fraud detection and transaction limits
- Scheduled and recurring transfers
- Multiple accounts per customer, account types
- Interest calculation and loans
- Dashboards and analytics
- Mobile application

---

## 17. Team Workflow

### Suggested work split (4 members)

| Member | Responsibility |
|---|---|
| 1 | Database, deposit, withdraw, transfer, locking, concurrency tests |
| 2 | Auth, RBAC, accounts, beneficiaries, staff/admin routes, branches, audit logs |
| 3 | Frontend: login, customer dashboard, transfer, beneficiaries, history |
| 4 | Frontend: employee/admin panels, API docs, test scenarios, demo, report |

### Git branches
```text
main
 └── develop
      ├── feature/auth
      ├── feature/account
      ├── feature/transfer
      ├── feature/staff-admin
      ├── feature/frontend-customer
      └── feature/frontend-staff
```
Work on a feature branch, then open a pull request into `develop`. Merge `develop` into `main` for the final version.

### Commit messages
```text
feat: new feature          fix: bug fix
refactor: restructuring    docs: documentation
test: tests                chore: config/build changes
```
Examples: `feat: implement atomic money transfer`, `fix: prevent negative balance`

### Build order
1. Setup: repo, schema, agree on the API list
2. Auth, roles, accounts (with login and dashboard screens)
3. Deposit, withdraw, history
4. Beneficiaries and transfers
5. Staff and admin features, audit logs
6. Testing and demo preparation

---

**Project type:** Simulated banking application (no real money)
**Architecture:** Modular monolith (React + Express + PostgreSQL)
**Primary focus:** RBAC, transaction atomicity, concurrency safety, data consistency
