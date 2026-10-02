# Fraud Bank: Start Guide (4 Members)

A short, practical "do this first" guide. For full detail (API shapes, code samples, business rules), see `TEAM_TASKS.md`. This file tells each person **what to do, in what order, starting right now.**

---

## 0. The 60-second summary

| Member | Role | Branch | Starts with |
|---|---|---|---|
| **Member 1** | Backend: money, notifications, release manager | `feature/foundation-backend`, then `feature/money-notifications` | Day 0 backend foundation |
| **Member 2** | Backend: auth, staff, admin, audit | `feature/staff-admin` | `GET /branches` (after Day 0) |
| **Member 3** | Frontend: foundation + customer screens | `feature/foundation-frontend`, then `feature/frontend-customer` | Day 0 frontend foundation |
| **Member 4** | Frontend: staff/admin screens + docs | `feature/frontend-staff-admin` | Setup, README, then staff pages |

**Golden rule:** every file has exactly one owner. Only edit files you own. Need a change in someone else's file? Ask in the group chat.

---

## 1. Project timeline

```text
PHASE 0  Setup (everyone, ~30 min)
   |     Clone repo, run the starter backend, read your section.
   v
PHASE 1  Day 0 Foundation (Member 1 + Member 3, ~1-2 hours)
   |     Members 2 and 4 prepare while waiting (see their sections).
   v
PHASE 2  Build (everyone in parallel)
   |     Each person works only in their own files and branch.
   v
PHASE 3  Integration checkpoints CP1 to CP4 (all four together)
   v
PHASE 4  Release (Member 1)
         Merge develop into main, tag v1.0, rehearse the demo.
```

---

## 2. Phase 0: Setup (EVERYONE does this first)

```bash
# 1. Get the project
git clone <your-repo-url>
cd <project-folder>
git checkout develop
git pull origin develop

# 2. Database (PostgreSQL must be installed and running)
psql -U postgres -c "CREATE DATABASE fraudbank;"
psql -U postgres -d fraudbank -f backend/schema.sql

# 3. Backend
cd backend
cp .env.example .env          # then fill in your DB password and JWT secret
npm install
npm start                     # should run on http://localhost:5000
npm test                      # concurrency test should pass

# 4. Make sure .env is never committed
#    (check that .gitignore lists .env and node_modules)
```

**Check:** the backend starts and `npm test` passes. If not, tell the group before doing anything else.

---

## 3. Phase 1: Day 0 Foundation (do in this order)

Two people push a small base to `develop`. This is what stops merge conflicts later.

1. **Member 1** and **Member 3** start immediately, **in parallel**.
2. Each merges to `develop` as soon as they finish and announces it in the group chat.
3. **Member 2** and **Member 4** do their "while you wait" tasks (below), then pull the foundation and start.

After both foundations are on `develop`, **everyone** runs:

```bash
git checkout develop
git pull origin develop
psql -U postgres -d fraudbank -f backend/schema.sql   # re-run the NEW schema
git checkout -b feature/<your-branch>
```

---

## 4. MEMBER 1: Backend, Money, Notifications, Release Manager

**You are on the critical path. Everyone is waiting on your Day 0 push, so do it first.**

### Start here (first 1 to 2 hours): Day 0 backend foundation

Branch: `feature/foundation-backend`

- [ ] Update `backend/schema.sql`:
  - Add `notifications` to the first `DROP TABLE` line
  - Add `is_active BOOLEAN NOT NULL DEFAULT TRUE` to `users` (after `role`)
  - Add the `notifications` table plus the `idx_notif_user` index
  - Add sample customer **Carol** with a `PENDING` account (`ACC10000003`)
- [ ] Create `backend/src/utils/audit.js` (exports `logAudit`)
- [ ] Create `backend/src/utils/notify.js` (exports `createNotification`)
- [ ] Create empty route files: `staff.js`, `admin.js`, `notifications.js`, `branches.js`
- [ ] Mount all four in `backend/src/server.js` (`/staff`, `/admin`, `/notifications`, `/branches`)
- [ ] Commit, push, merge to `develop`
- [ ] Message the group: **"Foundation backend is on develop. Pull and re-run schema.sql."**

> After this, **nobody edits `server.js` again.**

### Then build (branch `feature/money-notifications`)

| # | Task | Priority |
|---|---|---|
| 1 | Read `accounts.js` and `transfers.js` fully (you must explain them in the demo) | Must |
| 2 | History endpoint: JOIN `accounts` twice to add `from_account_number` and `to_account_number`; add `total`. Keep all existing fields | Must |
| 3 | `GET /accounts/:id/statement?from=&to=` with `totalCredits`, `totalDebits`, `count` | Must |
| 4 | Notifications routes (`GET /notifications`, `PATCH /:id/read`, `PATCH /read-all`) | Must |
| 5 | Call `createNotification` **after COMMIT** in deposit, withdraw, transfer (wrap in try/catch, log only) | Must |
| 6 | `test/transfer-test.js`: success, blocked account, same idempotency key, 20-transfer deadlock test | Should |
| 7 | Docker: backend + frontend Dockerfiles and `docker-compose.yml` | Should |
| 8 | Release duties: merge PRs in order, run checkpoints, merge to `main`, tag `v1.0` | Must |

### Files you own
`routes/accounts.js`, `transfers.js`, `notifications.js`, `beneficiaries.js`, `db.js`, `utils/*`, `schema.sql` (change requests only after Day 0), `test/transfer-test.js`, Docker files, `.gitignore`

### Do NOT edit
`auth.js`, `staff.js`, `admin.js`, `branches.js`, anything in `frontend/`

### Done when
- [ ] Day 0 is on `develop` and everyone has pulled it
- [ ] `npm test` and `transfer-test.js` both pass
- [ ] History rows include account numbers and `total`
- [ ] Statement and notifications match the API contract
- [ ] Notifications appear for deposit, withdrawal, and both sides of a transfer
- [ ] `docker compose up` starts the whole app
- [ ] `main` is merged and tagged

---

## 5. MEMBER 2: Backend, Auth, Staff, Admin, Audit

### While you wait for Member 1's Day 0 push
- [ ] Complete Phase 0 setup
- [ ] Read `routes/auth.js` and `middleware/auth.js` (you own them)
- [ ] Read the **account status rules** and the **block code pattern** in `TEAM_TASKS.md` section 6
- [ ] Sketch your SQL queries for customers list, search, and transaction filters

### Start here (once Day 0 is on `develop`)
```bash
git checkout develop && git pull origin develop
psql -U postgres -d fraudbank -f backend/schema.sql
git checkout -b feature/staff-admin
```

**Build `GET /branches` first.** Member 3 needs it for the "create account" dropdown. Push a PR for it early.

### Task list (in order)

| # | Task | Priority |
|---|---|---|
| 1 | `GET /branches` in `branches.js` (any logged-in user) | Must |
| 2 | Staff routes in `staff.js` with `router.use(authenticate, requireRole('EMPLOYEE','ADMIN'))`: customers list/detail, verify, block, unblock, transaction search | Must |
| 3 | Audit logging with `logAudit(client, {...})` **inside the same DB transaction** as each change | Must |
| 4 | Admin routes in `admin.js` (`requireRole('ADMIN')`): users list, create employee, activate/deactivate, branch create/update, audit-log viewer | Must |
| 5 | In `auth.js`: reject login with `403 "Account is disabled"` when `is_active = false` | Must |
| 6 | `test/rbac-test.js` (customer on `/admin/users` = 403, employee on `/admin/branches` = 403, no token = 401, employee on `/staff/customers` = 200) | Should |
| 7 | Call `createNotification` after verify/block/unblock | Nice |
| 8 | Make `authenticate` check `is_active` in the DB | Nice |

### Rules to remember
- **Account status:** Verify `PENDING → ACTIVE`; Block `ACTIVE/PENDING → BLOCKED`; Unblock `BLOCKED → ACTIVE`; anything else returns `409`.
- Lock the row with `SELECT ... FOR UPDATE` before changing status.
- Admin cannot deactivate themselves (400). Duplicate email or branch code returns 409.
- Use these audit action names **exactly**: `ACCOUNT_VERIFIED`, `ACCOUNT_BLOCKED`, `ACCOUNT_UNBLOCKED`, `EMPLOYEE_CREATED`, `USER_ACTIVATED`, `USER_DEACTIVATED`, `BRANCH_CREATED`, `BRANCH_UPDATED`.

### Files you own
`routes/auth.js`, `middleware/auth.js`, `routes/staff.js`, `routes/admin.js`, `routes/branches.js`, `test/rbac-test.js`

### Do NOT edit
`accounts.js`, `transfers.js`, `schema.sql`, `server.js`, `utils/*`, anything in `frontend/`

### Done when
- [ ] Carol's `PENDING` account can be verified, blocked, and unblocked via the API
- [ ] A blocked account's transfer is rejected
- [ ] Every action above creates an `audit_logs` row
- [ ] Admin creates an employee, and that employee can log in and use `/staff/*`
- [ ] `rbac-test.js` passes
- [ ] All response shapes match section 10 of `TEAM_TASKS.md`

---

## 6. MEMBER 3: Frontend, Foundation and Customer Screens

**Member 4 is waiting on your foundation, so do Day 0 first.**

### Start here (first 1 to 2 hours): Day 0 frontend foundation

Branch: `feature/foundation-frontend`

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install react-router-dom
```

- [ ] Create `frontend/.env.example` with `VITE_API_URL=http://localhost:5000` (everyone copies it to `.env`)
- [ ] Build the shared files:
  - `api/client.js`: reads `VITE_API_URL`, adds the Bearer token from `localStorage`, returns JSON when `success` is true, otherwise throws an `Error` with the server message; on `401` clears the token and redirects to `/login`
  - `context/AuthContext.jsx`, `components/ProtectedRoute.jsx`, `Navbar.jsx`, `Layout.jsx`
  - `components/Alert.jsx`, `Table.jsx`, `Pagination.jsx`, `Loading.jsx`
  - `utils/format.js` (`formatCurrency` with ₹, `formatDate`), `styles/global.css`
- [ ] Create **placeholder pages for ALL pages**, including Member 4's staff/admin pages:
  ```jsx
  export default function CustomersPage() { return <h2>Customers (coming soon)</h2>; }
  ```
- [ ] Add **all routes** to `App.jsx` and **all role-based nav links** to the navbar
- [ ] Redirect after login: `CUSTOMER → /dashboard`, `EMPLOYEE`/`ADMIN → /staff/customers`
- [ ] Commit, push, merge to `develop`
- [ ] Message the group: **"Frontend foundation is on develop."**

### Then build (branch `feature/frontend-customer`)

| # | Task | Priority |
|---|---|---|
| 1 | Login and Register pages (store token and user, redirect by role) | Must |
| 2 | Dashboard with 4 states: no account (create form + branch dropdown), `PENDING` banner, `BLOCKED` red banner, `ACTIVE` (balance + deposit/withdraw) | Must |
| 3 | Beneficiaries: list, add, remove (with confirm) | Must |
| 4 | Transfer: pick beneficiary, amount, confirm. Generate `idempotencyKey = crypto.randomUUID()` on page open, new key after success, disable button while submitting | Must |
| 5 | Transactions: table (date, type, CREDIT/DEBIT, counterpart account, amount), filters, pagination | Must |
| 6 | Statement view with totals and a "Print / Save as PDF" button (`window.print()`) | Should |
| 7 | Notifications: bell with unread count in navbar, plus a list page with "mark as read" | Should |
| 8 | Polish: spinners, empty states, mobile layout | Nice |

### Tips
- Amounts from the API are **strings** like `"1000.00"`. Display with `formatCurrency`; send amounts as strings.
- If a backend endpoint isn't merged yet, make your `api/*.js` function return **fake data in the exact shape from section 10**, then swap in the real call later.
- Backend runs on port 5000, frontend on 5173 (CORS is already enabled).

### Files you own
All foundation files above, plus `pages/Login.jsx`, `pages/Register.jsx`, `pages/customer/*`, and `api/auth.js`, `accounts.js`, `beneficiaries.js`, `transfers.js`, `notifications.js`, `branches.js`

### Do NOT edit
Anything in `backend/`, `pages/staff/*`, `pages/admin/*`, `api/staff.js`, `api/admin.js`

### Done when
- [ ] Register, login, and logout work; each role lands on the right page
- [ ] A new customer can create an account and sees the PENDING banner
- [ ] Deposit, withdraw, and transfer work; errors show clearly
- [ ] Beneficiaries can be added and removed
- [ ] History has filters and pagination; statement shows totals
- [ ] Notifications show with an unread count
- [ ] A customer who opens `/admin/users` is redirected away

---

## 7. MEMBER 4: Frontend Staff/Admin Screens, Docs, Report

### While you wait for Member 3's Day 0 push
- [ ] Complete Phase 0 setup
- [ ] Start `docs/TESTING.md`: a table of the 10 test scenarios from the README with columns **Scenario / Steps / Expected / Actual / Pass**
- [ ] Read the API shapes for `/staff/*` and `/admin/*` in section 10 of `TEAM_TASKS.md`
- [ ] Update `README.md`: staff account actions are `PATCH /staff/accounts/:id/verify|block|unblock` (not `/accounts/:id/...`)

### Start here (once the frontend foundation is on `develop`)
```bash
git checkout develop && git pull origin develop
cd frontend && cp .env.example .env && npm install && npm run dev
git checkout -b feature/frontend-staff-admin
```
Log in as `employee@bank.com` and `admin@bank.com` (sample passwords are in the README or schema notes) and confirm you land on your placeholder pages.

### Task list (in order)

| # | Task | Priority |
|---|---|---|
| 1 | Confirm you can log in as employee and admin and see the placeholders | Must |
| 2 | **Customers** (`/staff/customers`): search, table (name, email, account number, balance, status), pagination, link to detail | Must |
| 3 | **Customer detail** (`/staff/customers/:userId`): info, status badge, **Verify / Block / Unblock** buttons shown only when allowed, confirm before blocking, plus the account's transaction history | Must |
| 4 | **Staff transactions** (`/staff/transactions`): filters (account number, type, status, dates, min/max amount), table, pagination | Must |
| 5 | **Admin users** (`/admin/users`): role filter, search, Activate/Deactivate. **Create employee** form (`/admin/employees/new`) | Must |
| 6 | **Branches** (`/admin/branches`): list, add, edit | Must |
| 7 | **Audit logs** (`/admin/audit-logs`): table, filter by action and dates, pagination | Must |
| 8 | Finish `README.md`: add statement, notifications, and branches endpoints; update the status table and "Definition of done" | Must |
| 9 | `docs/TESTING.md`: fill in Actual and Pass during checkpoints; collect screenshots | Must |
| 10 | `docs/DEMO.md` (5-minute script with who speaks and clicks) and `docs/REPORT.md` (problem, design, tech choices, scope decisions, results, future work) | Should |

### Tips
- If an endpoint isn't merged yet, return **temporary fake data in the exact shape from section 10** in `api/staff.js` / `api/admin.js`, then swap in the real call.
- Reuse `Table`, `Pagination`, `Alert`, and `Loading` from Member 3. Don't write your own.
- Until Member 2's endpoints merge, verify Carol manually:
  ```sql
  UPDATE accounts SET status='ACTIVE' WHERE account_number='ACC10000003';
  ```

### Files you own
`pages/staff/*`, `pages/admin/*`, `api/staff.js`, `api/admin.js`, `README.md`, `docs/*`

### Do NOT edit
Anything in `backend/`, `App.jsx`, `Navbar.jsx`, `client.js`, or Member 3's pages. Routes and nav links already exist; you only replace placeholder content.

### Done when
- [ ] Employee can list customers, search, verify, block, and unblock
- [ ] Employee can search all transactions
- [ ] Admin can manage users, create employees, manage branches, and read audit logs
- [ ] The UI hides buttons not allowed for the current account status
- [ ] README is updated; `docs/TESTING.md`, `DEMO.md`, `REPORT.md` exist and are filled in

---

## 8. Daily routine (everyone)

```bash
# Morning
git checkout develop
git pull origin develop
git checkout feature/<your-branch>
git merge develop

# During the day: small, frequent commits
git add .
git commit -m "feat: add customer search to staff page"

# When a piece works
git push origin feature/<your-branch>
# then open a Pull Request into develop
```

- Commit prefixes: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`
- **Never commit `.env` or `node_modules`.**
- Never push straight to `develop` or `main` (except the two Day 0 pushes).
- Open a PR at least once per working session. Another member reviews quickly (does it run? only your files changed?). **Member 1 merges.**

### Merge order (Member 1 follows this)
1. Member 1: `foundation-backend`
2. Member 3: `foundation-frontend`
3. Member 2: `staff-admin`
4. Member 1: `money-notifications`
5. Member 3: `frontend-customer`
6. Member 4: `frontend-staff-admin`
7. Member 4: docs, and Member 1: Docker
8. Member 1: merge `develop` into `main` and tag `v1.0`

### If you hit a merge conflict
1. Don't panic and don't delete the other person's lines.
2. Run `git status`, open the file, find `<<<<<<<`, `=======`, `>>>>>>>`.
3. Keep both sides when both are needed, then remove the markers.
4. Run the app, then `git add <file>` and `git commit`.
5. Not sure which version is right? Ask the file's owner.

---

## 9. Who needs what from whom

| You are | You need | From |
|---|---|---|
| Member 3 | `/accounts`, `/transfers`, `/notifications`, statement | Member 1 |
| Member 3 | `GET /branches`, login | Member 2 |
| Member 4 | All `/staff/*` and `/admin/*` endpoints | Member 2 |
| Member 4 | `client.js`, `AuthContext`, `Layout`, `Table`, `Pagination`, `Alert` | Member 3 |
| Member 2 | `utils/audit.js` and `utils/notify.js` | Member 1 (Day 0) |
| Member 1 | Pull requests from everyone | Everyone |

If you're blocked, build against the **fake-data shapes in section 10 of `TEAM_TASKS.md`** and swap in the real API later.

---

## 10. Team checkpoints (do together)

| # | When | Check |
|---|---|---|
| CP1 | After Day 0 | Everyone runs backend + frontend and logs in as all sample users, landing on the correct page |
| CP2 | Customer flow | Register, create account (PENDING), verify, deposit, add beneficiary, transfer, see history and notification |
| CP3 | Staff/admin flow | Employee verifies Carol, blocks Alice (her transfer is rejected), unblocks; admin creates employee and branch; audit logs show everything |
| CP4 | Safety | Concurrency test, `transfer-test.js`, and `rbac-test.js` all pass |
| CP5 | Final | Full demo script from the README on a clean database (Docker if ready) |

**Final-day checklist (Member 1):**
- [ ] `develop` runs cleanly from a fresh clone
- [ ] No secrets in the repo
- [ ] README status table and "Definition of done" are current
- [ ] All tests pass
- [ ] `develop` merged into `main`, tagged `v1.0`
- [ ] Whole team rehearsed the demo once

---

## 11. If time runs short: cut from the bottom first

| Keep at all costs | Cut first |
|---|---|
| Login and roles | Docker (run locally in the demo) |
| Deposit, withdraw, atomic transfer, concurrency test | Notifications UI (keep backend) |
| Beneficiaries and history | Statement "Print" button |
| Staff verify/block/unblock | `rbac-test.js` and deadlock test |
| Admin: employees and branches | Audit-log filters (keep plain list) |
| Audit logs (plain list) | Stretch tasks marked "Nice" |
