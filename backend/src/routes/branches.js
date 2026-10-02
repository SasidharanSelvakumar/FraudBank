const express = require('express');
const { pool } = require('../db');

const router = express.Router();

/**
 * GET /branches
 * Returns all bank branches in the system.
 * Accessible to any logged in user (or public for registration/account opening).
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, branch_code AS "branchCode", name, address, created_at AS "createdAt" FROM bank_branches ORDER BY id ASC'
    );
    res.json({
      success: true,
      branches: result.rows
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
