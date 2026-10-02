const express = require('express');
const bcrypt = require('bcryptjs');
const { pool, withTransaction, HttpError } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const router = express.Router();

// Admin-only route guard
router.use(authenticate, requireRole('ADMIN'));

/**
 * GET /admin/users
 * Search and manage users with role filtering and pagination.
 */
router.get('/users', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const { role, search } = req.query;

    let whereConditions = [];
    let params = [];
    let pIdx = 1;

    if (role && ['CUSTOMER', 'EMPLOYEE', 'ADMIN'].includes(role.toUpperCase())) {
      whereConditions.push(`u.role = $${pIdx++}`);
      params.push(role.toUpperCase());
    }

    if (search) {
      whereConditions.push(`(LOWER(u.name) LIKE $${pIdx} OR LOWER(u.email) LIKE $${pIdx})`);
      params.push(`%${search.trim().toLowerCase()}%`);
      pIdx++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const listParams = [...params, limit, offset];
    const dataSql = `
      SELECT u.id, u.name, u.email, u.role, u.is_active AS "isActive", u.created_at AS "createdAt"
      FROM users u
      ${whereClause}
      ORDER BY u.id ASC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;

    const usersRes = await pool.query(dataSql, listParams);

    res.json({
      success: true,
      users: usersRes.rows,
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
 * POST /admin/employees
 * Admin creates an internal bank employee.
 */
router.post('/employees', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new HttpError(400, 'Name, email, and password are required');
    }

    const trimmedEmail = email.toLowerCase().trim();
    if (password.length < 6) {
      throw new HttpError(400, 'Password must be at least 6 characters');
    }

    // Check duplicate email
    const dupRes = await pool.query('SELECT id FROM users WHERE email = $1', [trimmedEmail]);
    if (dupRes.rows.length > 0) {
      throw new HttpError(409, 'An account with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let createdUser;
    await withTransaction(async (client) => {
      const insRes = await client.query(
        `INSERT INTO users (name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, 'EMPLOYEE', TRUE)
         RETURNING id, name, email, role, is_active AS "isActive", created_at AS "createdAt"`,
        [name.trim(), trimmedEmail, passwordHash]
      );
      createdUser = insRes.rows[0];

      await logAudit(client, {
        userId: req.user.id,
        action: 'EMPLOYEE_CREATED',
        targetId: createdUser.id,
        details: {
          employeeEmail: createdUser.email,
          employeeName: createdUser.name
        }
      });
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      user: createdUser
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /admin/users/:id/activate
 * Reactivate a user account.
 */
router.patch('/users/:id/activate', async (req, res, next) => {
  try {
    const userId = req.params.id;

    let updatedUser;
    await withTransaction(async (client) => {
      const uRes = await client.query('SELECT id, name, email, role, is_active FROM users WHERE id = $1', [userId]);
      if (uRes.rows.length === 0) {
        throw new HttpError(404, 'User not found');
      }

      const user = uRes.rows[0];
      const updRes = await client.query(
        `UPDATE users
         SET is_active = TRUE
         WHERE id = $1
         RETURNING id, name, email, role, is_active AS "isActive", created_at AS "createdAt"`,
        [userId]
      );
      updatedUser = updRes.rows[0];

      await logAudit(client, {
        userId: req.user.id,
        action: 'USER_ACTIVATED',
        targetId: user.id,
        details: { email: user.email, role: user.role }
      });
    });

    res.json({
      success: true,
      message: 'User account activated successfully',
      user: updatedUser
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /admin/users/:id/deactivate
 * Deactivate a user account. Admin cannot deactivate themselves.
 */
router.patch('/users/:id/deactivate', async (req, res, next) => {
  try {
    const userId = req.params.id;

    if (Number(userId) === Number(req.user.id)) {
      throw new HttpError(400, 'Admins cannot deactivate their own account');
    }

    let updatedUser;
    await withTransaction(async (client) => {
      const uRes = await client.query('SELECT id, name, email, role, is_active FROM users WHERE id = $1', [userId]);
      if (uRes.rows.length === 0) {
        throw new HttpError(404, 'User not found');
      }

      const user = uRes.rows[0];
      const updRes = await client.query(
        `UPDATE users
         SET is_active = FALSE
         WHERE id = $1
         RETURNING id, name, email, role, is_active AS "isActive", created_at AS "createdAt"`,
        [userId]
      );
      updatedUser = updRes.rows[0];

      await logAudit(client, {
        userId: req.user.id,
        action: 'USER_DEACTIVATED',
        targetId: user.id,
        details: { email: user.email, role: user.role }
      });
    });

    res.json({
      success: true,
      message: 'User account deactivated successfully',
      user: updatedUser
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/branches
 * Retrieve all branches for administration.
 */
router.get('/branches', async (req, res, next) => {
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

/**
 * POST /admin/branches
 * Add a new bank branch.
 */
router.post('/branches', async (req, res, next) => {
  try {
    const { branchCode, name, address } = req.body;

    if (!branchCode || !name || !address) {
      throw new HttpError(400, 'Branch code, name, and address are required');
    }

    const trimmedCode = branchCode.trim().toUpperCase();

    // Check duplicate code
    const dupRes = await pool.query('SELECT id FROM bank_branches WHERE branch_code = $1', [trimmedCode]);
    if (dupRes.rows.length > 0) {
      throw new HttpError(409, `A branch with code '${trimmedCode}' already exists`);
    }

    let newBranch;
    await withTransaction(async (client) => {
      const insRes = await client.query(
        `INSERT INTO bank_branches (branch_code, name, address)
         VALUES ($1, $2, $3)
         RETURNING id, branch_code AS "branchCode", name, address, created_at AS "createdAt"`,
        [trimmedCode, name.trim(), address.trim()]
      );
      newBranch = insRes.rows[0];

      await logAudit(client, {
        userId: req.user.id,
        action: 'BRANCH_CREATED',
        targetId: newBranch.id,
        details: { branchCode: newBranch.branchCode, name: newBranch.name }
      });
    });

    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      branch: newBranch
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /admin/branches/:id
 * Update branch details.
 */
router.put('/branches/:id', async (req, res, next) => {
  try {
    const branchId = req.params.id;
    const { branchCode, name, address } = req.body;

    if (!branchCode || !name || !address) {
      throw new HttpError(400, 'Branch code, name, and address are required');
    }

    const trimmedCode = branchCode.trim().toUpperCase();

    // Check if code taken by another branch
    const dupRes = await pool.query(
      'SELECT id FROM bank_branches WHERE branch_code = $1 AND id <> $2',
      [trimmedCode, branchId]
    );
    if (dupRes.rows.length > 0) {
      throw new HttpError(409, `Branch code '${trimmedCode}' is already taken by another branch`);
    }

    let updatedBranch;
    await withTransaction(async (client) => {
      const updRes = await client.query(
        `UPDATE bank_branches
         SET branch_code = $1, name = $2, address = $3
         WHERE id = $4
         RETURNING id, branch_code AS "branchCode", name, address, created_at AS "createdAt"`,
        [trimmedCode, name.trim(), address.trim(), branchId]
      );

      if (updRes.rows.length === 0) {
        throw new HttpError(404, 'Branch not found');
      }

      updatedBranch = updRes.rows[0];

      await logAudit(client, {
        userId: req.user.id,
        action: 'BRANCH_UPDATED',
        targetId: updatedBranch.id,
        details: { branchCode: updatedBranch.branchCode, name: updatedBranch.name }
      });
    });

    res.json({
      success: true,
      message: 'Branch updated successfully',
      branch: updatedBranch
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/audit-logs
 * Tamper-evident audit log ledger with filters by action, date range, and pagination.
 */
router.get('/audit-logs', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const { action, from, to } = req.query;

    let whereConditions = [];
    let params = [];
    let pIdx = 1;

    if (action) {
      whereConditions.push(`al.action = $${pIdx++}`);
      params.push(action.trim());
    }

    if (from) {
      whereConditions.push(`al.created_at >= $${pIdx++}`);
      params.push(new Date(from));
    }

    if (to) {
      whereConditions.push(`al.created_at <= $${pIdx++}`);
      params.push(new Date(to));
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM audit_logs al ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const listParams = [...params, limit, offset];
    const dataSql = `
      SELECT al.id, al.action, al.target_id AS "targetId", al.details, al.created_at AS "createdAt",
             u.id AS "userId", u.name AS "userName", u.email AS "userEmail", u.role AS "userRole"
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;

    const logsRes = await pool.query(dataSql, listParams);

    res.json({
      success: true,
      logs: logsRes.rows,
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
