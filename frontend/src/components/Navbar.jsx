import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNotifications } from '../api/notifications';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    if (!isAuthenticated) return;

    async function fetchUnread() {
      try {
        const res = await getNotifications();
        if (isMounted && res && res.unreadCount !== undefined) {
          setUnreadCount(res.unreadCount);
        }
      } catch {
        // Silently ignore notification fetch error in nav
      }
    }

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // refresh every 30s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkStyle = ({ isActive }) => ({
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '0.88rem',
    fontWeight: '600',
    color: isActive ? '#4f46e5' : '#475569',
    backgroundColor: isActive ? '#eef2ff' : 'transparent',
    boxShadow: isActive ? 'inset 0 0 0 1px #c7d2fe' : 'none',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center'
  });

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.05)'
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          height: '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <Link
            to={
              !isAuthenticated
                ? '/'
                : user?.role === 'CUSTOMER'
                ? '/dashboard'
                : '/staff/customers'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              color: '#0f172a',
              fontWeight: '800',
              fontSize: '1.25rem',
              letterSpacing: '-0.025em'
            }}
          >
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 50%, #06b6d4 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                fontWeight: '900',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)'
              }}
            >
              ₹
            </span>
            <span style={{ background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Fraud Bank
            </span>
          </Link>

          {/* Navigation Links based on role */}
          {isAuthenticated && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {user?.role === 'CUSTOMER' && (
                <>
                  <NavLink to="/dashboard" style={navLinkStyle}>
                    Dashboard
                  </NavLink>
                  <NavLink to="/transfer" style={navLinkStyle}>
                    Transfer
                  </NavLink>
                  <NavLink to="/beneficiaries" style={navLinkStyle}>
                    Beneficiaries
                  </NavLink>
                  <NavLink to="/transactions" style={navLinkStyle}>
                    Transactions
                  </NavLink>
                  <NavLink to="/statement" style={navLinkStyle}>
                    Statement
                  </NavLink>
                </>
              )}

              {(user?.role === 'EMPLOYEE' || user?.role === 'ADMIN') && (
                <>
                  <NavLink to="/staff/customers" style={navLinkStyle}>
                    Customers
                  </NavLink>
                  <NavLink to="/staff/transactions" style={navLinkStyle}>
                    Transactions
                  </NavLink>
                </>
              )}

              {user?.role === 'ADMIN' && (
                <>
                  <NavLink to="/admin/users" style={navLinkStyle}>
                    Users
                  </NavLink>
                  <NavLink to="/admin/branches" style={navLinkStyle}>
                    Branches
                  </NavLink>
                  <NavLink to="/admin/audit-logs" style={navLinkStyle}>
                    Audit Logs
                  </NavLink>
                </>
              )}
            </nav>
          )}
        </div>

        {/* Right Action Profile / Login */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {!isAuthenticated ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <Link to="/login" className="btn btn-secondary btn-sm">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Open Account
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Notifications Icon with Badge */}
              <Link
                to="/notifications"
                title="Notifications"
                style={{
                  position: 'relative',
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  color: '#475569',
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-3px',
                      right: '-3px',
                      background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                      color: '#ffffff',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      fontWeight: '800',
                      padding: '1px 6px',
                      boxShadow: '0 2px 6px rgba(244, 63, 94, 0.4)',
                      lineHeight: '1.2'
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </Link>

              {/* User Info & Role Badge with Avatar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '4px 6px 4px 12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px'
                }}
              >
                {/* Avatar Bubble */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background:
                      user?.role === 'ADMIN'
                        ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
                        : user?.role === 'EMPLOYEE'
                        ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                        : 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    letterSpacing: '0.02em',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                  }}
                >
                  {getInitials(user?.name)}
                </div>

                <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>
                    {user?.name}
                  </div>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color:
                        user?.role === 'ADMIN'
                          ? '#7c3aed'
                          : user?.role === 'EMPLOYEE'
                          ? '#2563eb'
                          : '#059669'
                    }}
                  >
                    {user?.role}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-secondary btn-sm"
                  style={{
                    marginLeft: '4px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    backgroundColor: '#ffffff'
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
