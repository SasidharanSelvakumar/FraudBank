# Fraud Bank: Engineering Project Report

**Project Title:** Fraud Bank - Simulated Concurrent Banking System  
**Team Members:** Member 1, Member 2, Member 3, Member 4  
**Date:** October 2026  
**Repository:** `fraud-bank`  

---

## 1. Executive Summary

Fraud Bank is a full-stack simulated financial application designed to address the foundational engineering challenges of modern digital banking: **transaction atomicity, concurrency safety, data consistency, and role-based access control (RBAC)**. 

While the system operates strictly with virtual money, it is engineered to production-level consistency standards. By leveraging PostgreSQL's ACID transaction engine, pessimistic row-level locking (`SELECT ... FOR UPDATE`), database constraints, and cryptographic idempotency tokens, the application prevents double spending, race conditions, overdrafts, and unauthorized financial modifications.

---

## 2. Problem Statement

Consumer banking systems process thousands of concurrent read and write operations every second. Unlike conventional social media or content management applications where eventual consistency is acceptable, financial software must operate with **strict consistency**.

The primary technical challenges addressed in this project include:
1. **The Double-Spending Problem (Race Conditions):** When two withdrawal or transfer requests arrive simultaneously for the same account, naive read-then-write logic will allow both requests to pass based on the initial balance, resulting in an illegal negative balance.
2. **Transaction Atomicity:** Money transfers involve debiting one party and crediting another. If network or system failures occur between these operations, funds must not disappear or multiply.
3. **Deadlocks in Bi-directional Transfers:** When Customer A transfers to Customer B while Customer B transfers to Customer A at the exact same moment, unmanaged row-locking can result in a circular lock deadlock.
4. **Network Retries & Duplicate Submissions:** Network latency frequently causes clients or users to double-click submission buttons. The system must process transactions exactly once.
5. **Enforcement of Least Privilege:** Employees must be able to audit accounts and inspect transactions without possessing the power to manually alter account balances.

---

## 3. System Architecture & Design

### 3.1 Three-Tier Architecture

The system is constructed as a modular monolith comprising three distinct layers:

```text
+-------------------------------------------------------------+
|                      React Frontend (Vite)                  |
|  - Customer Portal (Dashboard, Transfers, Statements)       |
|  - Staff Portal (Customer Management, Status Transitions)   |
|  - Admin Portal (User Controls, Branch Directory, Auditing) |
+-------------------------------------------------------------+
                              |
                     HTTP / JSON (REST API)
                     Bearer JWT Authentication
                              v
+-------------------------------------------------------------+
|                     Node.js / Express API                   |
|  - Authentication & JWT Verification Middleware             |
|  - Role-Based Access Control (RBAC) Enforcement             |
|  - Atomic Money Operation Orchestration                     |
|  - Input Validation & Error Handling                        |
+-------------------------------------------------------------+
                              |
                       node-postgres (pg)
                      Direct SQL Connection
                              v
+-------------------------------------------------------------+
|                     PostgreSQL Database                     |
|  - ACID Transaction Management (BEGIN / COMMIT / ROLLBACK)  |
|  - Row-Level Locking (SELECT ... FOR UPDATE)                |
|  - Integrity Constraints (CHECK balance >= 0, UNIQUE keys)  |
|  - Immutable Audit Logging & Historical Ledgers             |
+-------------------------------------------------------------+
```

### 3.2 Database Schema & Entity Relationships

The relational model consists of six primary tables designed to eliminate redundant state and ensure referential integrity:

```text
       +---------------+ 1         1 +-----------------+
       |     users     |-------------|    accounts     |
       +---------------+             +-----------------+
        | 1           | 1             | 1             | 1
        |             |               |               |
        | *           | *             | *             | *
+----------------+  +---------------+ |          +------------------+
|   audit_logs   |  | beneficiaries | |          |   transactions   |
+----------------+  +---------------+ |          +------------------+
                                      |                   |
                                    * | 1                 |
                              +-----------------+         |
                              |  bank_branches  |         |
                              +-----------------+         |
                                                          |
  (from_account_id & to_account_id map to accounts) <-----+
```

- **`users`:** Identity store holding credentials, email addresses, and security roles (`CUSTOMER`, `EMPLOYEE`, `ADMIN`).
- **`accounts`:** Stores unique account numbers, branch references, status (`PENDING`, `ACTIVE`, `BLOCKED`), and balances represented as `NUMERIC(15,2)`.
- **`transactions`:** Unified ledger capturing deposits (`from_account_id IS NULL`), withdrawals (`to_account_id IS NULL`), and transfers (`from_account_id` and `to_account_id` both populated).
- **`beneficiaries`:** Pre-registered transfer counterparties linked to specific customer accounts.
- **`bank_branches`:** Physical branch directory mapped to customer accounts.
- **`audit_logs`:** Tamper-evident trail tracking administrative events, target IDs, timestamps, and caller IDs.

### 3.3 Concurrency Control & Row Locking

To prevent race conditions during concurrent financial operations, every balance modification executes inside an explicit database transaction utilizing PostgreSQL row-level locks:

```sql
BEGIN;
SELECT id, balance, status FROM accounts WHERE id = $1 FOR UPDATE;
-- Validation: Check status == 'ACTIVE' and balance >= withdraw_amount
UPDATE accounts SET balance = balance - $2 WHERE id = $1;
INSERT INTO transactions (from_account_id, to_account_id, type, amount, status)
VALUES ($1, NULL, 'WITHDRAWAL', $2, 'SUCCESS');
COMMIT;
```

#### Deadlock Prevention in Transfers
For bi-directional transfers between two accounts ($A$ and $B$), the backend always sorts account IDs numerically before acquiring row locks (`ORDER BY id ASC`). Regardless of whether $A \rightarrow B$ or $B \rightarrow A$ executes, both transactions request locks in identical order ($min(A, B)$ then $max(A, B)$), mathematically eliminating circular wait conditions.

### 3.4 Idempotency Token Architecture
To guarantee that identical requests submitted multiple times (e.g., due to double clicks or network retry storms) execute only once, transfer operations require an `idempotencyKey` UUID generated on the client. 
1. The server checks the `transactions` table for the existence of the `idempotencyKey`.
2. If already processed, the server immediately returns the previously committed transaction record without touching account balances.
3. If new, the transaction proceeds and permanently stores the key with a database-level `UNIQUE` constraint.

---

## 4. Technology Stack & Justification

| Technology | Layer | Justification |
|---|---|---|
| **React (Vite)** | Frontend | Modern component-based view library with fast Hot Module Replacement (HMR), enabling rapid modular UI development across independent feature branches. |
| **Vanilla CSS** | Styling | Avoids heavy utility frameworks, providing complete control over styling, custom status badges, modal overlays, and responsive data tables. |
| **Node.js + Express** | Backend | High-throughput asynchronous I/O runtime, uniform JavaScript codebase across frontend and backend, and mature middleware ecosystem. |
| **PostgreSQL** | Database | Industry standard for transactional relational integrity, supporting true row-level locks (`FOR UPDATE`), customizable isolation levels, and strict numeric data types. |
| **`pg` (node-postgres)** | DB Driver | Direct low-level SQL pool interface allowing explicit control over `BEGIN`, `COMMIT`, `ROLLBACK`, and parameterized queries without ORM abstraction penalties. |
| **JWT (`jsonwebtoken`)** | Auth | Stateless, cryptographic session tokens carrying role claims (`CUSTOMER`, `EMPLOYEE`, `ADMIN`) with an 8-hour time-to-live. |
| **`bcryptjs`** | Security | Adaptive salted hashing algorithm for user passwords, protecting against rainbow table and brute-force attacks. |

---

## 5. Deliberate Scope Decisions & Trade-Offs

To deliver an airtight, fully functional prototype within the project timeline, several enterprise architectural patterns were simplified. These decisions were deliberate and maintain clear forward-compatibility:

| Omitted Feature | Adopted Approach | Rationale & Upgrade Path |
|---|---|---|
| **OAuth2 / SSO** | Local email/password + JWT | Avoids external third-party dependencies during local grading. Upgradable by mounting Google/GitHub OAuth strategies to the existing `users` table. |
| **Kafka / RabbitMQ** | In-database transactional notifications | Eliminates infrastructure overhead of running separate messaging clusters. Upgradable by publishing events to an outbox table within the same DB transaction. |
| **Redis Caching** | Direct parameterized DB queries | Financial balances must never be read from stale caches. Direct DB reads with indexed lookups ensure 100% real-time accuracy. Redis can be added later exclusively for branch lookups. |
| **Multi-service Microservices** | Modular Monolith | Microservices introduce distributed transaction overhead (Sagas, two-phase commits). A modular monolith guarantees true ACID transactions within a single PostgreSQL instance. |
| **Object Storage (AWS S3)** | Metadata in PostgreSQL | Document uploads (KYC passports, avatars) were omitted to keep focus strictly on ledger mechanics and concurrency defense. |

---

## 6. Implementation Results & Verification

### 6.1 Role-Based Feature Deliverables

1. **Customer Portal (`/dashboard`, `/transfers`, `/statement`):**
   - Real-time balance display with Indian Rupee (`₹`) formatting.
   - Deposit, withdrawal, and transfer workflows with automatic status checks.
   - Beneficiary management with duplicate checking and deletion confirmation.
   - Filterable transaction history and printable account statements.
2. **Staff Portal (`/staff/customers`, `/staff/transactions`):**
   - Searchable customer account directory with status-aware actions.
   - Enforced status lifecycle: `PENDING` $\rightarrow$ `ACTIVE` (Verify), `ACTIVE` $\rightarrow$ `BLOCKED` (Block), and `BLOCKED` $\rightarrow$ `ACTIVE` (Unblock).
   - Confirmation dialogs preventing accidental account freezing.
   - Global transaction monitoring with multi-parameter filtering (type, status, date range, min/max amounts).
3. **Admin Portal (`/admin/users`, `/admin/branches`, `/admin/audit-logs`):**
   - User account activation/deactivation with self-deactivation safeguards for administrators.
   - Employee onboarding form (`/admin/employees/new`) with role assignment.
   - Branch office directory with unique code enforcement and edit capabilities.
   - Immutable audit log ledger documenting all security and account status operations.

### 6.2 Automated Concurrency Validation

Under automated testing (`npm test`), two simultaneous withdrawal requests of ₹8,000 each were dispatched against an account with an opening balance of ₹10,000:

```text
Request 1: HTTP 200 - SUCCESS, new balance 2000.00
Request 2: HTTP 400 - Insufficient account balance
PASS: only one withdrawal succeeded
```

- **Verification:** Row-level locking prevented the second process from reading the initial ₹10,000 balance while the first process was in-flight.
- **Result:** Exactly one withdrawal executed; account balance remained at ₹2,000; the second request received an explicit 400 error; database `CHECK (balance >= 0)` constraint remained unviolated.

---

## 7. Future Work & Enhancements

For future production evolution, the following enhancements are recommended:
1. **Multi-Factor Authentication (MFA / 2FA):** Integrate Time-Based One-Time Passwords (TOTP via Google Authenticator) for high-value transfers exceeding configurable thresholds.
2. **Transactional Outbox Pattern:** Implement an `outbox_events` table within money transactions to enable asynchronous streaming to Apache Kafka for downstream analytics and external notification delivery.
3. **Automated Fraud Detection Engine:** Introduce heuristic rules scoring velocity (e.g., >3 transfers in 60 seconds) or geographic anomalies, automatically triggering account freeze actions.
4. **Multi-Currency Ledgers:** Expand `accounts` to support ISO currency codes (USD, EUR, GBP) with real-time exchange rate calculation and foreign transaction fees.
5. **Containerized CI/CD Pipeline:** Package application tiers with Docker Compose and establish GitHub Actions for automated regression runs of concurrency and RBAC test suites.

---

## 8. Conclusion

Fraud Bank successfully models the critical engineering primitives required for mission-critical banking software. By decoupling frontend presentation from strictly validated backend transaction logic, enforcing row-level database locking, and maintaining comprehensive audit trails, the platform provides absolute consistency, zero balance corruption, and bulletproof role boundaries.
