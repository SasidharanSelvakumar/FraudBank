-- =============================================================================
-- Fraud Bank Database Schema & Initial Data
-- PostgreSQL 14+
-- =============================================================================

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS beneficiaries CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS bank_branches CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- -----------------------------------------------------------------------------
-- 1. Users
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('CUSTOMER', 'EMPLOYEE', 'ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- -----------------------------------------------------------------------------
-- 2. Bank Branches
-- -----------------------------------------------------------------------------
CREATE TABLE bank_branches (
    id SERIAL PRIMARY KEY,
    branch_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 3. Accounts
-- -----------------------------------------------------------------------------
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(30) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    branch_id INTEGER NOT NULL REFERENCES bank_branches(id) ON DELETE RESTRICT,
    balance NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'BLOCKED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_number ON accounts(account_number);

-- -----------------------------------------------------------------------------
-- 4. Beneficiaries
-- -----------------------------------------------------------------------------
CREATE TABLE beneficiaries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    beneficiary_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, beneficiary_account_id)
);

CREATE INDEX idx_beneficiaries_user ON beneficiaries(user_id);

-- -----------------------------------------------------------------------------
-- 5. Transactions
-- -----------------------------------------------------------------------------
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    from_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    to_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER')),
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    idempotency_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tx_from_account ON transactions(from_account_id);
CREATE INDEX idx_tx_to_account ON transactions(to_account_id);
CREATE INDEX idx_tx_created_at ON transactions(created_at);

-- -----------------------------------------------------------------------------
-- 6. Audit Logs
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_id VARCHAR(100),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- -----------------------------------------------------------------------------
-- 7. Notifications
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notif_user ON notifications(user_id);

-- =============================================================================
-- Sample Initial Data (Password for all accounts is 'password123')
-- =============================================================================

-- bcryptjs hash for 'password123'
-- $2a$10$NeKIAIwzbFzLa4RsZeuLQ.kSN5TrWRFyUC1u8zeGE54c/lH8WWwdm

INSERT INTO bank_branches (id, branch_code, name, address) VALUES
(1, 'BR001', 'Main City Branch', '100 Banking Plaza, Financial Core'),
(2, 'BR002', 'Downtown Branch', '45 Market Street, Suite 10'),
(3, 'BR003', 'Uptown Branch', '78 North Avenue, Tech Park');

SELECT setval('bank_branches_id_seq', 3);

INSERT INTO users (id, name, email, password_hash, role, is_active) VALUES
(1, 'Super Admin', 'admin@bank.com', '$2a$10$NeKIAIwzbFzLa4RsZeuLQ.kSN5TrWRFyUC1u8zeGE54c/lH8WWwdm', 'ADMIN', TRUE),
(2, 'John Staff', 'employee@bank.com', '$2a$10$NeKIAIwzbFzLa4RsZeuLQ.kSN5TrWRFyUC1u8zeGE54c/lH8WWwdm', 'EMPLOYEE', TRUE),
(3, 'Alice Smith', 'alice@bank.com', '$2a$10$NeKIAIwzbFzLa4RsZeuLQ.kSN5TrWRFyUC1u8zeGE54c/lH8WWwdm', 'CUSTOMER', TRUE),
(4, 'Bob Jones', 'bob@bank.com', '$2a$10$NeKIAIwzbFzLa4RsZeuLQ.kSN5TrWRFyUC1u8zeGE54c/lH8WWwdm', 'CUSTOMER', TRUE),
(5, 'Carol White', 'carol@bank.com', '$2a$10$NeKIAIwzbFzLa4RsZeuLQ.kSN5TrWRFyUC1u8zeGE54c/lH8WWwdm', 'CUSTOMER', TRUE);

SELECT setval('users_id_seq', 5);

INSERT INTO accounts (id, account_number, user_id, branch_id, balance, status) VALUES
(1, 'ACC10000001', 3, 1, 10000.00, 'ACTIVE'),
(2, 'ACC10000002', 4, 2, 5000.00, 'ACTIVE'),
(3, 'ACC10000003', 5, 3, 0.00, 'PENDING');

SELECT setval('accounts_id_seq', 3);

INSERT INTO beneficiaries (id, user_id, beneficiary_account_id, name) VALUES
(1, 3, 2, 'Bob Jones');

SELECT setval('beneficiaries_id_seq', 1);

INSERT INTO transactions (id, from_account_id, to_account_id, type, amount, status, idempotency_key) VALUES
(1, NULL, 1, 'DEPOSIT', 10000.00, 'SUCCESS', 'init-deposit-alice'),
(2, NULL, 2, 'DEPOSIT', 5000.00, 'SUCCESS', 'init-deposit-bob');

SELECT setval('transactions_id_seq', 2);
