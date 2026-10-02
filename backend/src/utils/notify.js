const { pool } = require('../db');

/**
 * Creates an in-app notification for a user.
 * Usually called AFTER transaction COMMIT.
 *
 * @param {number} userId - Recipient user ID
 * @param {string} title - Brief notification summary
 * @param {string} message - Detailed notification message
 */
async function createNotification(userId, title, message) {
  const sql = `
    INSERT INTO notifications (user_id, title, message)
    VALUES ($1, $2, $3)
    RETURNING id, user_id, title, message, is_read, created_at;
  `;
  try {
    const res = await pool.query(sql, [userId, title, message]);
    return res.rows[0];
  } catch (err) {
    // Non-blocking notification failure logging
    console.error(`[createNotification Error] Failed to create notification for user ${userId}:`, err.message);
    return null;
  }
}

module.exports = {
  createNotification
};
