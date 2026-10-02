import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  return (
    <div
      style={{
        minHeight: '78vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px'
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '460px',
          width: '100%',
          boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.1), 0 8px 16px -4px rgba(15, 23, 42, 0.04)',
          borderRadius: '18px',
          padding: '36px 32px',
          border: '1px solid rgba(226, 232, 240, 0.8)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 50%, #06b6d4 100%)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              fontWeight: '900',
              boxShadow: '0 8px 20px rgba(79, 70, 229, 0.35)',
              marginBottom: '16px'
            }}
          >
            ₹
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.03em' }}>
            Welcome Back
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '6px' }}>
            Sign in to access your Fraud Bank secure portal
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
              placeholder="e.g. alice@bank.com"
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
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1px solid #e2e8f0',
            fontSize: '0.82rem'
          }}
        >
          <div style={{ fontWeight: '700', color: '#475569', marginBottom: '10px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ⚡ 1-Click Demo Accounts (password123):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              onClick={() => fillCredentials('alice@bank.com')}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '600',
                border: '1px solid #bbf7d0',
                backgroundColor: '#f0fdf4',
                color: '#166534',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              👤 Alice (Customer)
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('bob@bank.com')}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '600',
                border: '1px solid #bfdbfe',
                backgroundColor: '#eff6ff',
                color: '#1e40af',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              👤 Bob (Customer)
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('employee@bank.com')}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '600',
                border: '1px solid #c7d2fe',
                backgroundColor: '#eef2ff',
                color: '#3730a3',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              💼 Employee
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('admin@bank.com')}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '600',
                border: '1px solid #e9d5ff',
                backgroundColor: '#faf5ff',
                color: '#6b21a8',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              🛡️ Admin
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '0.88rem', color: '#64748b' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ fontWeight: '700', color: '#4f46e5' }}>
            Open an account
          </Link>
        </div>
      </div>
    </div>
  );
}
