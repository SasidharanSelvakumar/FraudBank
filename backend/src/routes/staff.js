const express = require('express');
const { pool, withTransaction, HttpError } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { createNotification } = require('../utils/notify');

const router = express.Router();

// Staff and Admin role access only
router.use(authenticate, requireRole('EMPLOYEE', 'ADMIN'));

/**
 * GET /staff/customers
 * Paginated list and search of customers and their accounts.
 */
router.get('/customers', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim().toLowerCase() : '';

    let whereClause = "WHERE u.role = 'CUSTOMER'";
    let params = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (
        LOWER(u.name) LIKE $1 OR
        LOWER(u.email) LIKE $1 OR
        LOWER(COALESCE(a.account_number, '')) LIKE $1
      )`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*)
       FROM users u
       LEFT JOIN accounts a ON u.id = a.user_id
       ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const listParams = search ? [params[0], limit, offset] : [limit, offset];
    const limitOffsetClauses = search ? 'LIMIT $2 OFFSET $3' : 'LIMIT $1 OFFSET $2';

    const dataSql = `
      SELECT u.id AS "userId", u.name, u.email, u.role, u.is_active AS "isActive", u.created_at AS "createdAt",
             a.id AS "accountId", a.account_number AS "accountNumber", a.balance, a.status,
             b.name AS "branchName"
      FROM users u
      LEFT JOIN accounts a ON u.id = a.user_id
      LEFT JOIN bank_branches b ON a.branch_id = b.id
      ${whereClause}
      ORDER BY u.id ASC
      ${limitOffsetClauses}
    `;

    const dataRes = await pool.query(dataSql, listParams);

    const customers = dataRes.rows.map((row) => ({
      id: row.accountId || row.userId,
      userId: row.userId,
      name: row.name,
      email: row.email,
      role: row.role,
      accountNumber: row.accountNumber || 'NO_ACCOUNT',
      balance: row.balance || '0.00',
      status: row.status || 'NO_ACCOUNT',
      branchName: row.branchName || 'N/A',
      createdAt: row.createdAt
    }));

    res.json({
      success: true,
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /staff/customers/:userId
 * Retrieve full customer profile and account details.
 */
router.get('/customers/:userId', async (req, res, next) => {
  try {
    const userId = req.params.userId;

    const userRes = await pool.query(
      'SELECT id, name, email, role, is_active AS "isActive", created_at AS "createdAt" FROM users WHERE id = $1',
      [userId]
    );

    if (userRes.rows.length === 0) {
      throw new HttpError(404, 'Customer not found');
    }

    const user = userRes.rows[0];

    const acctRes = await pool.query(
      `SELECT a.id, a.account_number AS "accountNumber", a.balance, a.status, a.created_at AS "createdAt",
              b.id AS "branchId", b.name AS "branchName", b.branch_code AS "branchCode"
       FROM accounts a
       LEFT JOIN bank_branches b ON a.branch_id = b.id
       WHERE a.user_id = $1`,
      [userId]
    );

    const account = acctRes.rows.length > 0 ? acctRes.rows[0] : null;

    res.json({
      success: true,
      user,
      account
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /staff/accounts/:id/verify
 * Verification state transition: PENDING -> ACTIVE.
 */
router.patch('/accounts/:id/verify', async (req, res, next) => {
  try {
    const accountId = req.params.id;
    let updatedAccount;

    await withTransaction(async (client) => {
      const lockRes = await client.query(
        'SELECT id, user_id, account_number, status, balance FROM accounts WHERE id = $1 FOR UPDATE',
        [accountId]
      );

      if (lockRes.rows.length === 0) {
        throw new HttpError(404, 'Account not found');
      }

      const account = lockRes.rows[0];

      if (account.status !== 'PENDING') {
        throw new HttpError(409, `Cannot verify account: Current status is '${account.status}'. Only PENDING accounts can be verified.`);
      }

      const updRes = await client.query(
        `UPDATE accounts
         SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, account_number, user_id, balance, status`,
        [accountId]
      );
      updatedAccount = updRes.rows[0];

      // Audit log entry within same transaction
      await logAudit(client, {
        userId: req.user.id,
        action: 'ACCOUNT_VERIFIED',
        targetId: account.id,
        details: {
          accountNumber: account.account_number,
          previousStatus: 'PENDING',
          newStatus: 'ACTIVE'
        }
      });
    });

    // Fire notification after COMMIT
    try {
      await createNotification(
        updatedAccount.user_id,
        'Account Verified',
        `Your account ${updatedAccount.account_number} has been verified and activated successfully.`
      );
    } catch (e) {
      console.error('[Notification Error]', e.message);
    }

    res.json({
      success: true,
      message: 'Account verified and activated successfully',
      account: {
        id: updatedAccount.id,
        accountNumber: updatedAccount.account_number,
        balance: updatedAccount.balance,
        status: updatedAccount.status
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /staff/accounts/:id/block
 * Status transition: ACTIVE or PENDING -> BLOCKED.
 */
router.patch('/accounts/:id/block', async (req, res, next) => {
  try {
    const accountId = req.params.id;
    let updatedAccount;

    await withTransaction(async (client) => {
      const lockRes = await client.query(
        'SELECT id, user_id, account_number, status, balance FROM accounts WHERE id = $1 FOR UPDATE',
        [accountId]
      );

      if (lockRes.rows.length === 0) {
        throw new HttpError(404, 'Account not found');
      }

      const account = lockRes.rows[0];

      if (account.status === 'BLOCKED') {
        throw new HttpError(409, 'Account is already BLOCKED');
      }

      const previousStatus = account.status;
      const updRes = await client.query(
        `UPDATE accounts
         SET status = 'BLOCKED', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, account_number, user_id, balance, status`,
        [accountId]
      );
      updatedAccount = updRes.rows[0];

      await logAudit(client, {
        userId: req.user.id,
        action: 'ACCOUNT_BLOCKED',
        targetId: account.id,
        details: {
          accountNumber: account.account_number,
          previousStatus,
          newStatus: 'BLOCKED'
        }
      });
    });

    try {
      await createNotification(
        updatedAccount.user_id,
        'Account Suspended',
        `Your account ${updatedAccount.account_number} has been temporarily blocked. Please contact support.`
      );
    } catch (e) {
      console.error('[Notification Error]', e.message);
    }

    res.json({
      success: true,
      message: 'Account has been blocked successfully',
      account: {
        id: updatedAccount.id,
        accountNumber: updatedAccount.account_number,
        balance: updatedAccount.balance,
        status: updatedAccount.status
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /staff/accounts/:id/unblock
 * Status transition: BLOCKED -> ACTIVE.
 */
router.patch('/accounts/:id/unblock', async (req, res, next) => {
  try {
    const accountId = req.params.id;
    let updatedAccount;

    await withTransaction(async (client) => {
      const lockRes = await client.query(
        'SELECT id, user_id, account_number, status, balance FROM accounts WHERE id = $1 FOR UPDATE',
        [accountId]
      );

      if (lockRes.rows.length === 0) {
        throw new HttpError(404, 'Account not found');
      }

      const account = lockRes.rows[0];

      if (account.status !== 'BLOCKED') {
        throw new HttpError(409, `Cannot unblock account: Current status is '${account.status}'. Only BLOCKED accounts can be unblocked.`);
      }

      const updRes = await client.query(
        `UPDATE accounts
         SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, account_number, user_id, balance, status`,
        [accountId]
      );
      updatedAccount = updRes.rows[0];

      await logAudit(client, {
        userId: req.user.id,
        action: 'ACCOUNT_UNBLOCKED',
        targetId: account.id,
        details: {
          accountNumber: account.account_number,
          previousStatus: 'BLOCKED',
          newStatus: 'ACTIVE'
        }
      });
    });

    try {
      await createNotification(
        updatedAccount.user_id,
        'Account Restored',
        `Your account ${updatedAccount.account_number} has been unblocked and restored to ACTIVE.`
      );
    } catch (e) {
      console.error('[Notification Error]', e.message);
    }

    res.json({
      success: true,
      message: 'Account has been unblocked successfully',
      account: {
        id: updatedAccount.id,
        accountNumber: updatedAccount.account_number,
        balance: updatedAccount.balance,
        status: updatedAccount.status
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /staff/transactions
 * Global search across all transactions with rich filters and pagination.
 */
router.get('/transactions', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const { accountNumber, type, status, from, to, minAmount, maxAmount } = req.query;

    let whereConditions = [];
    let params = [];
    let pIdx = 1;

    if (accountNumber) {
      whereConditions.push(`(fa.account_number = $${pIdx} OR ta.account_number = $${pIdx})`);
      params.push(accountNumber.trim());
      pIdx++;
    }

    if (type) {
      whereConditions.push(`t.type = $${pIdx++}`);
      params.push(type.toUpperCase());
    }

    if (status) {
      whereConditions.push(`t.status = $${pIdx++}`);
      params.push(status.toUpperCase());
    }

    if (from) {
      whereConditions.push(`t.created_at >= $${pIdx++}`);
      params.push(new Date(from));
    }

    if (to) {
      whereConditions.push(`t.created_at <= $${pIdx++}`);
      params.push(new Date(to));
    }

    if (minAmount) {
      whereConditions.push(`t.amount >= $${pIdx++}`);
      params.push(Number(minAmount));
    }

    if (maxAmount) {
      whereConditions.push(`t.amount <= $${pIdx++}`);
      params.push(Number(maxAmount));
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(*)
       FROM transactions t
       LEFT JOIN accounts fa ON t.from_account_id = fa.id
       LEFT JOIN accounts ta ON t.to_account_id = ta.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const listParams = [...params, limit, offset];
    const dataSql = `
      SELECT t.id, t.type, t.amount, t.status, t.idempotency_key AS "idempotencyKey", t.created_at AS "createdAt",
             t.from_account_id, t.to_account_id,
             fa.account_number AS "fromAccountNumber",
             ta.account_number AS "toAccountNumber"
      FROM transactions t
      LEFT JOIN accounts fa ON t.from_account_id = fa.id
      LEFT JOIN accounts ta ON t.to_account_id = ta.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;

    const txRes = await pool.query(dataSql, listParams);

    const transactions = txRes.rows.map((row) => ({
      id: row.id,
      type: row.type,
      amount: row.amount,
      status: row.status,
      fromAccountNumber: row.fromAccountNumber,
      toAccountNumber: row.toAccountNumber,
      accountNumber: row.toAccountNumber || row.fromAccountNumber,
      idempotencyKey: row.idempotencyKey,
      createdAt: row.createdAt
    }));

    res.json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
