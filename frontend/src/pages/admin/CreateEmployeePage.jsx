import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createEmployee } from '../../api/admin';
import Alert from '../../components/Alert';

export default function CreateEmployeePage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Basic frontend validations
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await createEmployee({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password
      });

      setSuccess(
        `Employee account for "${formData.name}" created successfully! They can now log in using ${formData.email}.`
      );
      setFormData({ name: '', email: '', password: '' });

      // After 2 seconds, redirect to /admin/users
      setTimeout(() => {
        navigate('/admin/users');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '650px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link
          to="/admin/users"
          style={{
            color: '#2563eb',
            textDecoration: 'none',
            fontSize: '0.95rem',
            fontWeight: '600'
          }}
        >
          &larr; Back to Users
        </Link>
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <h1 style={{ margin: '0 0 8px 0', fontSize: '1.6rem', color: '#111827' }}>
          Create New Employee
        </h1>
        <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '0.92rem' }}>
          Provision an employee account with access to customer verification, account management, and transaction search.
        </p>

        {error && (
          <div style={{ marginBottom: '16px' }}>
            <Alert type="error" message={error}>
              {error}
            </Alert>
          </div>
        )}

        {success && (
          <div style={{ marginBottom: '16px' }}>
            <Alert type="success" message={success}>
              {success}
            </Alert>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="emp-name"
              style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px', color: '#374151' }}
            >
              Full Name *
            </label>
            <input
              id="emp-name"
              type="text"
              name="name"
              placeholder="e.g. John Teller"
              value={formData.name}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.95rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="emp-email"
              style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px', color: '#374151' }}
            >
              Email Address *
            </label>
            <input
              id="emp-email"
              type="email"
              name="email"
              placeholder="e.g. john@bank.com"
              value={formData.email}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.95rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="emp-password"
              style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px', color: '#374151' }}
            >
              Initial Password * (minimum 6 characters)
            </label>
            <input
              id="emp-password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.95rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Role (Read only) */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px', color: '#374151' }}
            >
              Assigned Role
            </label>
            <input
              type="text"
              value="EMPLOYEE (Read customer data, verify/block accounts, monitor transactions)"
              disabled
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb',
                color: '#6b7280',
                borderRadius: '6px',
                fontSize: '0.88rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              disabled={loading}
              style={{
                padding: '10px 18px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 22px',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Creating...' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
