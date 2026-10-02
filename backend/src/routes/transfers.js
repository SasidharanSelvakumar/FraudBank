const express = require('express');
const { pool, withTransaction, HttpError, parseAmount } = require('../db');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('../utils/notify');

const router = express.Router();
router.use(authenticate);

/**
 * POST /transfers
 * Executes an atomic transfer between two accounts with row-level locks and idempotency protection.
 */
router.post('/', async (req, res, next) => {
  try {
    const { fromAccountId, beneficiaryId, toAccountId, amount, idempotencyKey } = req.body;
    const validAmount = parseAmount(amount);

    if (!fromAccountId) {
      throw new HttpError(400, 'Source account ID is required');
    }

    if (!beneficiaryId && !toAccountId) {
      throw new HttpError(400, 'Destination beneficiary or account is required');
    }

    // 1. Check idempotency first
    if (idempotencyKey) {
      const dupCheck = await pool.query(
        `SELECT t.id, t.type, t.amount, t.status, t.idempotency_key, t.created_at,
                fa.account_number AS from_account_number,
                ta.account_number AS to_account_number
         FROM transactions t
         LEFT JOIN accounts fa ON t.from_account_id = fa.id
         LEFT JOIN accounts ta ON t.to_account_id = ta.id
         WHERE t.idempotency_key = $1`,
        [idempotencyKey]
      );

      if (dupCheck.rows.length > 0) {
        const existingTx = dupCheck.rows[0];
        return res.json({
          success: true,
          message: 'Transfer already processed (idempotent replay)',
          duplicate: true,
          transaction: {
            id: existingTx.id,
            fromAccountNumber: existingTx.from_account_number,
            toAccountNumber: existingTx.to_account_number,
            amount: existingTx.amount,
            status: existingTx.status,
            createdAt: existingTx.created_at
          }
        });
      }
    }

    // 2. Validate sender ownership
    const senderRes = await pool.query(
      'SELECT id, user_id, account_number, status, balance FROM accounts WHERE id = $1',
      [fromAccountId]
    );

    if (senderRes.rows.length === 0) {
      throw new HttpError(404, 'Source account not found');
    }

    const senderAcct = senderRes.rows[0];
    if (Number(senderAcct.user_id) !== Number(req.user.id)) {
      throw new HttpError(403, 'Forbidden: You can only transfer funds from your own account');
    }

    // 3. Resolve destination account
    let resolvedToAccountId = toAccountId;
    if (beneficiaryId) {
      const benRes = await pool.query(
        'SELECT beneficiary_account_id FROM beneficiaries WHERE id = $1 AND user_id = $2',
        [beneficiaryId, req.user.id]
      );
      if (benRes.rows.length === 0) {
        throw new HttpError(404, 'Beneficiary record not found or does not belong to you');
      }
      resolvedToAccountId = benRes.rows[0].beneficiary_account_id;
    }

    if (Number(fromAccountId) === Number(resolvedToAccountId)) {
      throw new HttpError(400, 'Cannot transfer to the same account');
    }

    // Verify recipient account exists
    const recRes = await pool.query(
      'SELECT id, user_id, account_number, status FROM accounts WHERE id = $1',
      [resolvedToAccountId]
    );
    if (recRes.rows.length === 0) {
      throw new HttpError(404, 'Destination account does not exist');
    }
    const recAcct = recRes.rows[0];

    // 4. Execute atomic transfer with lowest-ID locking order (prevents deadlocks)
    const firstId = Math.min(Number(fromAccountId), Number(resolvedToAccountId));
    const secondId = Math.max(Number(fromAccountId), Number(resolvedToAccountId));

    let createdTransaction;
    let senderNewBalance;

    await withTransaction(async (client) => {
      // Lock both accounts in deterministic ascending order
      const lockRes = await client.query(
        'SELECT id, balance, status, account_number, user_id FROM accounts WHERE id IN ($1, $2) ORDER BY id ASC FOR UPDATE',
        [firstId, secondId]
      );

      const accountsMap = {};
      lockRes.rows.forEach((row) => {
        accountsMap[row.id] = row;
      });

      const senderLocked = accountsMap[fromAccountId];
      const receiverLocked = accountsMap[resolvedToAccountId];

      // Validate account status
      if (senderLocked.status !== 'ACTIVE') {
        throw new HttpError(403, `Transfer rejected: Sender account is ${senderLocked.status}`);
      }
      if (receiverLocked.status !== 'ACTIVE') {
        throw new HttpError(403, `Transfer rejected: Recipient account is ${receiverLocked.status}`);
      }

      // Validate sender balance
      const currentBal = Number(senderLocked.balance);
      const transferAmt = Number(validAmount);
      if (currentBal < transferAmt) {
        throw new HttpError(400, 'Insufficient account balance');
      }

      // Debit sender
      const debitRes = await client.query(
        `UPDATE accounts
         SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING balance`,
        [validAmount, fromAccountId]
      );
      senderNewBalance = debitRes.rows[0].balance;

      // Credit receiver
      await client.query(
        `UPDATE accounts
         SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [validAmount, resolvedToAccountId]
      );

      // Record transaction
      const txRes = await client.query(
        `INSERT INTO transactions (from_account_id, to_account_id, type, amount, status, idempotency_key)
         VALUES ($1, $2, 'TRANSFER', $3, 'SUCCESS', $4)
         RETURNING id, type, amount, status, idempotency_key, created_at`,
        [fromAccountId, resolvedToAccountId, validAmount, idempotencyKey || null]
      );

      createdTransaction = txRes.rows[0];
    });

    // 5. Fire notifications for both parties AFTER COMMIT (non-blocking)
    try {
      await createNotification(
        req.user.id,
        'Money Transferred',
        `₹${validAmount} was transferred to ${recAcct.account_number}. New balance: ₹${senderNewBalance}`
      );
      await createNotification(
        recAcct.user_id,
        'Money Received',
        `₹${validAmount} was received from ${senderAcct.account_number}.`
      );
    } catch (notifErr) {
      console.error('[Notification Error]', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Transfer completed successfully',
      balance: senderNewBalance,
      transaction: {
        id: createdTransaction.id,
        fromAccountNumber: senderAcct.account_number,
        toAccountNumber: recAcct.account_number,
        amount: createdTransaction.amount,
        status: createdTransaction.status,
        createdAt: createdTransaction.created_at
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /transfers/:id
 * Retrieve a specific transfer detail.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const txId = req.params.id;

    const txRes = await pool.query(
      `SELECT t.id, t.type, t.amount, t.status, t.idempotency_key, t.created_at,
              fa.account_number AS from_account_number, fa.user_id AS from_user_id,
              ta.account_number AS to_account_number, ta.user_id AS to_user_id
       FROM transactions t
       LEFT JOIN accounts fa ON t.from_account_id = fa.id
       LEFT JOIN accounts ta ON t.to_account_id = ta.id
       WHERE t.id = $1 AND t.type = 'TRANSFER'`,
      [txId]
    );

    if (txRes.rows.length === 0) {
      throw new HttpError(404, 'Transfer transaction not found');
    }

    const tx = txRes.rows[0];
    const isSender = Number(tx.from_user_id) === Number(req.user.id);
    const isReceiver = Number(tx.to_user_id) === Number(req.user.id);
    const isStaff = req.user.role === 'EMPLOYEE' || req.user.role === 'ADMIN';

    if (!isSender && !isReceiver && !isStaff) {
      throw new HttpError(403, 'Forbidden: You do not have access to view this transfer');
    }

    res.json({
      success: true,
      transfer: {
        id: tx.id,
        fromAccountNumber: tx.from_account_number,
        toAccountNumber: tx.to_account_number,
        amount: tx.amount,
        status: tx.status,
        createdAt: tx.created_at
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
