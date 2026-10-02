import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await register(name, email, password);
      // Public registration creates customers; redirect to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please check the information provided.');
    } finally {
      setLoading(false);
    }
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
          maxWidth: '480px',
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
            Open an Account
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '6px' }}>
            Join Fraud Bank and explore secure simulated digital banking
          </p>
        </div>

        <Alert type="error" message={error} onClose={() => setError(null)} />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="reg-name">Full Legal Name</label>
            <input
              id="reg-name"
              type="text"
              className="form-control"
              placeholder="e.g. David Miller"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email Address</label>
            <input
              id="reg-email"
              type="email"
              className="form-control"
              placeholder="david@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Password (min 6 characters)</label>
            <input
              id="reg-password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-confirm-password">Confirm Password</label>
            <input
              id="reg-confirm-password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            id="register-submit-btn"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Creating Profile...' : 'Complete Registration'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.88rem', color: '#64748b' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: '600' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
