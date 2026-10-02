import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active portal tab: 'customer' | 'staff' | 'admin'
  const portalParam = (searchParams.get('portal') || 'customer').toLowerCase();
  const [activePortal, setActivePortal] = useState(
    ['customer', 'staff', 'admin'].includes(portalParam) ? portalParam : 'customer'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync state if query param changes
  useEffect(() => {
    const p = (searchParams.get('portal') || '').toLowerCase();
    if (['customer', 'staff', 'admin'].includes(p) && p !== activePortal) {
      setActivePortal(p);
    }
  }, [searchParams]);

  const handlePortalSwitch = (portal) => {
    setActivePortal(portal);
    setSearchParams({ portal });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await login(email, password);
      const role = res.user?.role;

      // Check if redirected from a protected route
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
        return;
      }

      // Role-based redirect as specified in START_GUIDE.md
      if (role === 'CUSTOMER') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/staff/customers', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill helper for demo/testing
  const fillCredentials = (quickEmail) => {
    setEmail(quickEmail);
    setPassword('password123');
    setError(null);
  };

  // Portal configs
  const portalConfig = {
    customer: {
      title: 'Customer Banking',
      subtitle: 'Sign in to access your personal accounts and transfers',
      badge: 'Customer Portal',
      badgeBg: '#ecfdf5',
      badgeColor: '#065f46',
      badgeBorder: '#a7f3d0',
      icon: '💳',
      accentGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      defaultEmail: 'alice@bank.com',
      demoAccounts: [
        { label: 'Alice (Active)', email: 'alice@bank.com' },
        { label: 'Bob (Active)', email: 'bob@bank.com' },
        { label: 'Carol (Pending)', email: 'carol@bank.com' }
      ]
    },
    staff: {
      title: 'Staff Operations',
      subtitle: 'Workstation for customer KYC and ledger monitoring',
      badge: 'Employee Workstation',
      badgeBg: '#eff6ff',
      badgeColor: '#1e40af',
      badgeBorder: '#bfdbfe',
      icon: '💼',
      accentGradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      defaultEmail: 'employee@bank.com',
      demoAccounts: [
        { label: 'John Staff', email: 'employee@bank.com' }
      ]
    },
    admin: {
      title: 'Executive Admin',
      subtitle: 'Security console, user provisioning & forensic audit logs',
      badge: 'Super Administrator',
      badgeBg: '#faf5ff',
      badgeColor: '#6b21a8',
      badgeBorder: '#e9d5ff',
      icon: '🛡️',
      accentGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      defaultEmail: 'admin@bank.com',
      demoAccounts: [
        { label: 'Super Admin', email: 'admin@bank.com' }
      ]
    }
  };

  const currentConfig = portalConfig[activePortal] || portalConfig.customer;

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px'
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.12), 0 8px 16px -4px rgba(15, 23, 42, 0.04)',
          borderRadius: '22px',
          padding: '36px 32px',
          border: '1px solid rgba(226, 232, 240, 0.85)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Top Accent Line according to selected portal */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '5px',
            background: currentConfig.accentGradient,
            transition: 'background 0.3s ease'
          }}
        />

        {/* Portal Switcher Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '26px'
          }}
        >
          <button
            type="button"
            onClick={() => handlePortalSwitch('customer')}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: activePortal === 'customer' ? '#ffffff' : 'transparent',
              color: activePortal === 'customer' ? '#0f172a' : '#64748b',
              boxShadow: activePortal === 'customer' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>💳</span> Customer
          </button>

          <button
            type="button"
            onClick={() => handlePortalSwitch('staff')}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: activePortal === 'staff' ? '#ffffff' : 'transparent',
              color: activePortal === 'staff' ? '#0f172a' : '#64748b',
              boxShadow: activePortal === 'staff' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>💼</span> Staff
          </button>

          <button
            type="button"
            onClick={() => handlePortalSwitch('admin')}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: activePortal === 'admin' ? '#ffffff' : 'transparent',
              color: activePortal === 'admin' ? '#0f172a' : '#64748b',
              boxShadow: activePortal === 'admin' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>🛡️</span> Admin
          </button>
        </div>

        {/* Header with Portal Badge */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: currentConfig.badgeBg,
              color: currentConfig.badgeColor,
              border: `1px solid ${currentConfig.badgeBorder}`,
              fontSize: '0.78rem',
              fontWeight: '800',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '12px'
            }}
          >
            <span>{currentConfig.icon}</span>
            {currentConfig.badge}
          </div>

          <h1 style={{ fontSize: '1.7rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.025em' }}>
            {currentConfig.title}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '6px' }}>
            {currentConfig.subtitle}
          </p>
        </div>

        <Alert type="error" message={error} onClose={() => setError(null)} />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-control"
              placeholder={`e.g. ${currentConfig.defaultEmail}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.98rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : `Sign In to ${currentConfig.title}`}
          </button>
        </form>

        {/* Quick Demo Credentials specific to active portal */}
        <div
          style={{
            marginTop: '26px',
            paddingTop: '18px',
            borderTop: '1px solid #e2e8f0',
            fontSize: '0.82rem'
          }}
        >
          <div style={{ fontWeight: '700', color: '#475569', marginBottom: '10px', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ⚡ 1-Click {activePortal.toUpperCase()} Demo (password123):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {currentConfig.demoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => fillCredentials(acc.email)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  border: `1px solid ${currentConfig.badgeBorder}`,
                  backgroundColor: currentConfig.badgeBg,
                  color: currentConfig.badgeColor,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {currentConfig.icon} {acc.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '22px', fontSize: '0.86rem', color: '#64748b' }}>
          <Link to="/" style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            &larr; Back to Home
          </Link>
          {activePortal === 'customer' && (
            <div>
              New here?{' '}
              <Link to="/register" style={{ fontWeight: '700', color: '#4f46e5' }}>
                Open Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
