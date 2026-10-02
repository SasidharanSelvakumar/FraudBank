const express = require('express');
const { pool, withTransaction, HttpError, parseAmount } = require('../db');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('../utils/notify');

const router = express.Router();

// All account routes require authentication
router.use(authenticate);

/**
 * Helper: checks if requester owns the account or has staff/admin privileges.
 */
async function verifyAccountAccess(accountId, user) {
  const res = await pool.query(
    `SELECT a.id, a.account_number, a.user_id, a.branch_id, a.balance, a.status,
            b.name AS branch_name
     FROM accounts a
     LEFT JOIN bank_branches b ON a.branch_id = b.id
     WHERE a.id = $1`,
    [accountId]
  );

  if (res.rows.length === 0) {
    throw new HttpError(404, 'Account not found');
  }

  const account = res.rows[0];
  const isOwner = Number(account.user_id) === Number(user.id);
  const isStaff = user.role === 'EMPLOYEE' || user.role === 'ADMIN';

  if (!isOwner && !isStaff) {
    throw new HttpError(403, 'Forbidden: You do not have permission to access this account');
  }

  return { account, isOwner, isStaff };
}

/**
 * POST /accounts
 * Customer creates a new bank account. Starts in 'PENDING' status.
 */
router.post('/', async (req, res, next) => {
  try {
    const { branchId } = req.body;

    if (!branchId) {
      throw new HttpError(400, 'Branch ID is required');
    }

    // Verify branch exists
    const branchCheck = await pool.query('SELECT id FROM bank_branches WHERE id = $1', [branchId]);
    if (branchCheck.rows.length === 0) {
      throw new HttpError(404, 'Selected branch not found');
    }

    // Check if customer already has an account
    const existing = await pool.query('SELECT id FROM accounts WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length > 0) {
      throw new HttpError(409, 'Customer already has an active or pending account');
    }

    // Generate unique account number
    const countRes = await pool.query('SELECT count(*) FROM accounts');
    const nextSeq = parseInt(countRes.rows[0].count, 10) + 1;
    const accountNumber = `ACC${String(10000000 + nextSeq).padStart(8, '0')}`;

    const insertRes = await pool.query(
      `INSERT INTO accounts (account_number, user_id, branch_id, balance, status)
       VALUES ($1, $2, $3, 0.00, 'PENDING')
       RETURNING id, account_number, user_id, branch_id, balance, status, created_at`,
      [accountNumber, req.user.id, branchId]
    );

    const created = insertRes.rows[0];

    res.status(201).json({
      success: true,
      message: 'Account created successfully and is pending verification',
      account: {
        id: created.id,
        accountNumber: created.account_number,
        balance: created.balance,
        status: created.status,
        createdAt: created.created_at
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /accounts/me
 * Returns current customer's account and balance.
 */
router.get('/me', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.account_number, a.balance, a.status, a.created_at,
              b.id AS branch_id, b.name AS branch_name, b.branch_code
       FROM accounts a
       LEFT JOIN bank_branches b ON a.branch_id = b.id
       WHERE a.user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        hasAccount: false,
        account: null
      });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      hasAccount: true,
      account: {
        id: row.id,
        accountNumber: row.account_number,
        balance: row.balance,
        status: row.status,
        branch: {
          id: row.branch_id,
          name: row.branch_name,
          code: row.branch_code
        },
        createdAt: row.created_at
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /accounts/:id/deposit
 * Customer deposits funds into their account.
 */
router.post('/:id/deposit', async (req, res, next) => {
  try {
    const accountId = req.params.id;
    const { amount } = req.body;
    const validAmount = parseAmount(amount);

    const { account } = await verifyAccountAccess(accountId, req.user);

    // Only owner can deposit
    if (Number(account.user_id) !== Number(req.user.id)) {
      throw new HttpError(403, 'You can only deposit into your own account');
    }

    let updatedAccount;
    await withTransaction(async (client) => {
      // Row-level lock on the account
      const lockRes = await client.query(
        'SELECT id, balance, status FROM accounts WHERE id = $1 FOR UPDATE',
        [accountId]
      );

      const target = lockRes.rows[0];
      if (target.status !== 'ACTIVE') {
        throw new HttpError(403, `Cannot deposit: Account is ${target.status}`);
      }

      const updateRes = await client.query(
        `UPDATE accounts
         SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, account_number, balance, status`,
        [validAmount, accountId]
      );
      updatedAccount = updateRes.rows[0];

      await client.query(
        `INSERT INTO transactions (from_account_id, to_account_id, type, amount, status)
         VALUES (NULL, $1, 'DEPOSIT', $2, 'SUCCESS')`,
        [accountId, validAmount]
      );
    });

    // Fire notification after COMMIT
    try {
      await createNotification(
        req.user.id,
        'Deposit Successful',
        `₹${validAmount} was successfully credited to account ${updatedAccount.account_number}. Current balance: ₹${updatedAccount.balance}`
      );
    } catch (e) {
      console.error('[Notification error]', e.message);
    }

    res.json({
      success: true,
      message: 'Deposit successful',
      balance: updatedAccount.balance,
      account: updatedAccount
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /accounts/:id/withdraw
 * Customer withdraws funds from their account.
 */
router.post('/:id/withdraw', async (req, res, next) => {
  try {
    const accountId = req.params.id;
    const { amount } = req.body;
    const validAmount = parseAmount(amount);

    const { account } = await verifyAccountAccess(accountId, req.user);

    if (Number(account.user_id) !== Number(req.user.id)) {
      throw new HttpError(403, 'You can only withdraw from your own account');
    }

    let updatedAccount;
    await withTransaction(async (client) => {
      // Row-level lock on the account
      const lockRes = await client.query(
        'SELECT id, balance, status FROM accounts WHERE id = $1 FOR UPDATE',
        [accountId]
      );

      const target = lockRes.rows[0];
      if (target.status !== 'ACTIVE') {
        throw new HttpError(403, `Cannot withdraw: Account is ${target.status}`);
      }

      const currentBalance = Number(target.balance);
      const withdrawAmount = Number(validAmount);

      if (currentBalance < withdrawAmount) {
        throw new HttpError(400, 'Insufficient account balance');
      }

      const updateRes = await client.query(
        `UPDATE accounts
         SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, account_number, balance, status`,
        [validAmount, accountId]
      );
      updatedAccount = updateRes.rows[0];

      await client.query(
        `INSERT INTO transactions (from_account_id, to_account_id, type, amount, status)
         VALUES ($1, NULL, 'WITHDRAWAL', $2, 'SUCCESS')`,
        [accountId, validAmount]
      );
    });

    // Fire notification after COMMIT
    try {
      await createNotification(
        req.user.id,
        'Withdrawal Processed',
        `₹${validAmount} was debited from account ${updatedAccount.account_number}. Remaining balance: ₹${updatedAccount.balance}`
      );
    } catch (e) {
      console.error('[Notification error]', e.message);
    }

    res.json({
      success: true,
      message: 'Withdrawal successful',
      balance: updatedAccount.balance,
      account: updatedAccount
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /accounts/:id/transactions
 * Transaction history for an account with filters and pagination.
 */
router.get('/:id/transactions', async (req, res, next) => {
  try {
    const accountId = req.params.id;
    const { account } = await verifyAccountAccess(accountId, req.user);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const { type, from, to } = req.query;

    let whereConditions = ['(t.from_account_id = $1 OR t.to_account_id = $1)'];
    let params = [accountId];
    let pIdx = 2;

    if (type && ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'].includes(type.toUpperCase())) {
      whereConditions.push(`t.type = $${pIdx++}`);
      params.push(type.toUpperCase());
    }

    if (from) {
      whereConditions.push(`t.created_at >= $${pIdx++}`);
      params.push(new Date(from));
    }

    if (to) {
      whereConditions.push(`t.created_at <= $${pIdx++}`);
      params.push(new Date(to));
    }

    const whereClause = whereConditions.join(' AND ');

    // Total count query
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM transactions t WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    // Data query with two JOINs on accounts to retrieve account numbers
    const listParams = [...params, limit, offset];
    const dataSql = `
      SELECT t.id, t.type, t.amount, t.status, t.idempotency_key, t.created_at,
             t.from_account_id, t.to_account_id,
             fa.account_number AS from_account_number,
             ta.account_number AS to_account_number,
             CASE
               WHEN t.from_account_id = $1 THEN 'DEBIT'
               ELSE 'CREDIT'
             END AS direction
      FROM transactions t
      LEFT JOIN accounts fa ON t.from_account_id = fa.id
      LEFT JOIN accounts ta ON t.to_account_id = ta.id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;

    const txRes = await pool.query(dataSql, listParams);

    const formattedTransactions = txRes.rows.map((tx) => ({
      id: tx.id,
      type: tx.type,
      direction: tx.direction,
      amount: tx.amount,
      status: tx.status,
      fromAccountNumber: tx.from_account_number,
      toAccountNumber: tx.to_account_number,
      accountNumber: tx.direction === 'DEBIT' ? tx.to_account_number : tx.from_account_number,
      createdAt: tx.created_at
    }));

    res.json({
      success: true,
      transactions: formattedTransactions,
      total,
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
 * GET /accounts/:id/statement
 * Detailed account statement with totals in a specified date range.
 */
router.get('/:id/statement', async (req, res, next) => {
  try {
    const accountId = req.params.id;
    const { account } = await verifyAccountAccess(accountId, req.user);

    const { from, to } = req.query;

    let whereConditions = ['(t.from_account_id = $1 OR t.to_account_id = $1)'];
    let params = [accountId];
    let pIdx = 2;

    if (from) {
      whereConditions.push(`t.created_at >= $${pIdx++}`);
      params.push(new Date(from));
    }

    if (to) {
      whereConditions.push(`t.created_at <= $${pIdx++}`);
      params.push(new Date(to));
    }

    const whereClause = whereConditions.join(' AND ');

    const txSql = `
      SELECT t.id, t.type, t.amount, t.status, t.created_at,
             t.from_account_id, t.to_account_id,
             fa.account_number AS from_account_number,
             ta.account_number AS to_account_number,
             CASE
               WHEN t.from_account_id = $1 THEN 'DEBIT'
               ELSE 'CREDIT'
             END AS direction
      FROM transactions t
      LEFT JOIN accounts fa ON t.from_account_id = fa.id
      LEFT JOIN accounts ta ON t.to_account_id = ta.id
      WHERE ${whereClause}
      ORDER BY t.created_at ASC
    `;

    const txRes = await pool.query(txSql, params);

    let totalCredits = 0;
    let totalDebits = 0;

    const transactions = txRes.rows.map((tx) => {
      const amt = Number(tx.amount);
      if (tx.direction === 'CREDIT') {
        totalCredits += amt;
      } else {
        totalDebits += amt;
      }

      return {
        id: tx.id,
        type: tx.type,
        direction: tx.direction,
        amount: tx.amount,
        status: tx.status,
        fromAccountNumber: tx.from_account_number,
        toAccountNumber: tx.to_account_number,
        createdAt: tx.created_at
      };
    });

    res.json({
      success: true,
      account: {
        id: account.id,
        accountNumber: account.account_number,
        balance: account.balance,
        status: account.status,
        branchName: account.branch_name
      },
      statement: {
        from: from || null,
        to: to || null,
        totalCredits: totalCredits.toFixed(2),
        totalDebits: totalDebits.toFixed(2),
        count: transactions.length,
        transactions
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
