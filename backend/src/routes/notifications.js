const express = require('express');
const { pool, HttpError } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

/**
 * GET /notifications
 * Retrieve all in-app notifications for the authenticated user.
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, title, message, is_read AS "isRead", created_at AS "createdAt"
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    const unreadCount = result.rows.filter((n) => !n.isRead).length;

    res.json({
      success: true,
      unreadCount,
      notifications: result.rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /notifications/:id/read
 * Mark a specific notification as read.
 */
router.patch('/:id/read', async (req, res, next) => {
  try {
    const notifId = req.params.id;

    const findRes = await pool.query(
      'SELECT id, user_id FROM notifications WHERE id = $1',
      [notifId]
    );

    if (findRes.rows.length === 0) {
      throw new HttpError(404, 'Notification not found');
    }

    if (Number(findRes.rows[0].user_id) !== Number(req.user.id)) {
      throw new HttpError(403, 'Forbidden: You do not own this notification');
    }

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1',
      [notifId]
    );

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /notifications/read-all
 * Mark all notifications for the authenticated user as read.
 */
router.patch('/read-all', async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
