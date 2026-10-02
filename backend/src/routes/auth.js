const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, HttpError } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fraudbank_super_secret_jwt_key_2026_change_in_production';

/**
 * POST /auth/register
 * Public registration: always creates users with role 'CUSTOMER'.
 */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new HttpError(400, 'Name, email, and password are required');
    }

    const trimmedEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      throw new HttpError(400, 'Invalid email address format');
    }

    if (password.length < 6) {
      throw new HttpError(400, 'Password must be at least 6 characters');
    }

    // Check duplicate email
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [trimmedEmail]);
    if (existing.rows.length > 0) {
      throw new HttpError(409, 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const insertRes = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'CUSTOMER', TRUE)
       RETURNING id, name, email, role, is_active, created_at`,
      [name.trim(), trimmedEmail, passwordHash]
    );

    const newUser = insertRes.rows[0];
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/login
 * Public login endpoint. Rejects inactive accounts with 403 "Account is disabled".
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new HttpError(400, 'Email and password are required');
    }

    const trimmedEmail = email.toLowerCase().trim();
    const userRes = await pool.query(
      'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
      [trimmedEmail]
    );

    if (userRes.rows.length === 0) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const user = userRes.rows[0];

    // Check account status
    if (!user.is_active) {
      throw new HttpError(403, 'Account is disabled');
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/me
 * Authenticated user details.
 */
router.get('/me', authenticate, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.is_active
    }
  });
});

module.exports = router;
