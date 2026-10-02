import React, { useState, useEffect } from 'react';
import { getNotifications, markAsRead, markAllAsRead } from '../../api/notifications';
import { formatDate } from '../../utils/format';
import Alert from '../../components/Alert';
import Loading from '../../components/Loading';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadNotifications = async () => {
    try {
      const res = await getNotifications();
      if (res && res.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      setError(err.message || 'Failed to update notification');
    }
  };

  const handleMarkAllRead = async () => {
    setActionLoading(true);
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(err.message || 'Failed to mark all as read');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <Loading message="Loading notifications..." />;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>
            Notifications
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
            Real-time transaction alerts, account status updates, and security logs
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={actionLoading}
            className="btn btn-secondary btn-sm"
          >
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      <Alert type="error" message={error} onClose={() => setError(null)} />

      {notifications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔔</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155' }}>No notifications yet</h3>
          <p style={{ fontSize: '0.88rem', marginTop: '4px' }}>
            You will receive instant alerts here when transfers, deposits, or withdrawals occur.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="card"
              style={{
                padding: '16px 20px',
                marginBottom: 0,
                backgroundColor: notif.isRead ? '#ffffff' : '#f0f9ff',
                borderColor: notif.isRead ? '#e2e8f0' : '#bae6fd',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '16px'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  {!notif.isRead && (
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#0284c7',
                        display: 'inline-block'
                      }}
                    />
                  )}
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' }}>
                    {notif.title}
                  </h4>
                </div>
                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.4 }}>
                  {notif.message}
                </p>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
                  {formatDate(notif.createdAt)}
                </div>
              </div>

              {!notif.isRead && (
                <button
                  type="button"
                  onClick={() => handleMarkAsRead(notif.id)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.8rem', padding: '4px 10px', whiteSpace: 'nowrap' }}
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
