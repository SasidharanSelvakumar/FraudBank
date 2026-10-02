const express = require('express');
const { pool, HttpError } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

/**
 * GET /beneficiaries
 * List all saved beneficiaries for the logged-in user.
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.name, b.created_at AS "createdAt",
              a.id AS "beneficiaryAccountId", a.account_number AS "accountNumber", a.status
       FROM beneficiaries b
       JOIN accounts a ON b.beneficiary_account_id = a.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      beneficiaries: result.rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /beneficiaries
 * Add a new beneficiary by account number and friendly nickname.
 */
router.post('/', async (req, res, next) => {
  try {
    const { accountNumber, name } = req.body;

    if (!accountNumber || !name) {
      throw new HttpError(400, 'Account number and name are required');
    }

    // Lookup destination account
    const acctRes = await pool.query(
      'SELECT id, user_id, account_number, status FROM accounts WHERE account_number = $1',
      [accountNumber.trim()]
    );

    if (acctRes.rows.length === 0) {
      throw new HttpError(404, 'Destination account number not found');
    }

    const targetAccount = acctRes.rows[0];

    // Check self-beneficiary
    if (Number(targetAccount.user_id) === Number(req.user.id)) {
      throw new HttpError(400, 'Cannot add your own account as a beneficiary');
    }

    // Check duplicate
    const dupRes = await pool.query(
      'SELECT id FROM beneficiaries WHERE user_id = $1 AND beneficiary_account_id = $2',
      [req.user.id, targetAccount.id]
    );

    if (dupRes.rows.length > 0) {
      throw new HttpError(409, 'This account is already saved in your beneficiaries');
    }

    const insertRes = await pool.query(
      `INSERT INTO beneficiaries (user_id, beneficiary_account_id, name)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, beneficiary_account_id, name, created_at`,
      [req.user.id, targetAccount.id, name.trim()]
    );

    const created = insertRes.rows[0];

    res.status(201).json({
      success: true,
      message: 'Beneficiary added successfully',
      beneficiary: {
        id: created.id,
        name: created.name,
        accountNumber: targetAccount.account_number,
        beneficiaryAccountId: created.beneficiary_account_id,
        createdAt: created.created_at
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /beneficiaries/:id
 * Remove a beneficiary.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const beneficiaryId = req.params.id;

    const findRes = await pool.query(
      'SELECT id, user_id FROM beneficiaries WHERE id = $1',
      [beneficiaryId]
    );

    if (findRes.rows.length === 0) {
      throw new HttpError(404, 'Beneficiary not found');
    }

    if (Number(findRes.rows[0].user_id) !== Number(req.user.id)) {
      throw new HttpError(403, 'Forbidden: You do not own this beneficiary record');
    }

    await pool.query('DELETE FROM beneficiaries WHERE id = $1', [beneficiaryId]);

    res.json({
      success: true,
      message: 'Beneficiary removed successfully'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
