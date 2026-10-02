const jwt = require('jsonwebtoken');
const { pool, HttpError } = require('../db');

/**
 * Authentication middleware.
 * Verifies JWT token and checks if user is active in the database.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError(401, 'Authentication token missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fraudbank_super_secret_jwt_key_2026_change_in_production');
    } catch (jwtErr) {
      throw new HttpError(401, 'Invalid or expired authentication token');
    }

    // Verify user still exists and is active in database
    const userRes = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userRes.rows.length === 0) {
      throw new HttpError(401, 'User account no longer exists');
    }

    const user = userRes.rows[0];
    if (!user.is_active) {
      throw new HttpError(403, 'Account is disabled');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role-Based Access Control (RBAC) middleware factory.
 * @param {...string} allowedRoles - e.g. 'ADMIN', 'EMPLOYEE', 'CUSTOMER'
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to access this resource'
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRole
};
