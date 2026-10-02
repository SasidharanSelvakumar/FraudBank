const { pool } = require('../db');

/**
 * Appends an entry to the audit_logs table.
 * If a transaction client is passed, it executes within that transaction.
 * Otherwise, it uses the global pool.
 *
 * @param {import('pg').PoolClient|null} client - Optional active PostgreSQL transaction client
 * @param {Object} options
 * @param {number} options.userId - ID of the user performing the action
 * @param {string} options.action - Exact audit action name
 * @param {string|number} [options.targetId] - Target entity identifier
 * @param {Object} [options.details] - Additional contextual payload
 */
async function logAudit(client, { userId, action, targetId = null, details = null }) {
  const runner = client || pool;
  const sql = `
    INSERT INTO audit_logs (user_id, action, target_id, details)
    VALUES ($1, $2, $3, $4)
    RETURNING id, user_id, action, target_id, details, created_at;
  `;
  const params = [
    userId || null,
    action,
    targetId !== null ? String(targetId) : null,
    details ? JSON.stringify(details) : null
  ];

  try {
    const res = await runner.query(sql, params);
    return res.rows[0];
  } catch (err) {
    console.error(`[logAudit Error] Failed to log action '${action}':`, err.message);
    throw err;
  }
}

module.exports = {
  logAudit
};
