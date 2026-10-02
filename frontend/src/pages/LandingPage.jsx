import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Hero Section */}
      <section
        style={{
          textAlign: 'center',
          padding: '50px 20px 60px 20px',
          position: 'relative'
        }}
      >
        {/* Anti-Fraud Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#4f46e5',
            fontSize: '0.84rem',
            fontWeight: '700',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.1)'
          }}
        >
          <span style={{ fontSize: '1rem' }}>🛡️</span>
          Next-Gen Simulated Core Banking Engine
        </div>

        {/* Main Headline */}
        <h1
          style={{
            fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
            fontWeight: '900',
            lineHeight: '1.15',
            letterSpacing: '-0.035em',
            color: '#0f172a',
            maxWidth: '900px',
            margin: '0 auto 20px auto'
          }}
        >
          Enterprise Banking Architecture.{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 50%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Zero Race Conditions.
          </span>
        </h1>

        <p
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            color: '#475569',
            maxWidth: '720px',
            margin: '0 auto 36px auto',
            lineHeight: '1.6'
          }}
        >
          A full-stack, enterprise-grade banking simulation featuring pessimistic row-locking,
          idempotent transaction replay protection, and granular multi-tenant role-based access control.
        </p>

        {/* Hero CTAs */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap'
          }}
        >
          {isAuthenticated ? (
            <Link
              to={user?.role === 'CUSTOMER' ? '/dashboard' : '/staff/customers'}
              className="btn btn-primary btn-lg"
              style={{ padding: '14px 32px', fontSize: '1.05rem', fontWeight: '700' }}
            >
              Go to Your Dashboard &rarr;
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="btn btn-primary btn-lg"
                style={{ padding: '14px 32px', fontSize: '1.05rem', fontWeight: '700' }}
              >
                Open an Account &rarr;
              </Link>
              <Link
                to="/login"
                className="btn btn-secondary btn-lg"
                style={{ padding: '14px 28px', fontSize: '1.05rem', fontWeight: '700' }}
              >
                Sign In to Portal
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Portal Selection Gateway */}
      <section style={{ marginBottom: '60px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>
            Choose Your Access Portal
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.98rem', marginTop: '6px' }}>
            Dedicated interfaces tailored for customers, bank employees, and system executives
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px'
          }}
        >
          {/* 1. Customer Banking Portal */}
          <div
            className="card card-hoverable"
            style={{
              padding: '32px 28px',
              borderRadius: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid #e2e8f0',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
              }}
            />
            <div>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  marginBottom: '20px',
                  border: '1px solid #a7f3d0'
                }}
              >
                💳
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '8px', color: '#0f172a' }}>
                Customer Portal
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: '1.5', marginBottom: '20px' }}>
                Access personal savings accounts, deposit funds, register beneficiaries, and execute instant idempotency-guaranteed money transfers.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', fontSize: '0.88rem', color: '#334155' }}>
                <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> Real-Time Available Balance & Passbook
                </li>
                <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> Atomic P2P Transfers & Beneficiaries
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> PDF Statements & Live Notification Alerts
                </li>
              </ul>
            </div>
            <Link
              to="/login?portal=customer"
              className="btn btn-success"
              style={{ width: '100%', padding: '12px' }}
            >
              Access Customer Banking &rarr;
            </Link>
          </div>

          {/* 2. Staff Operations Portal */}
          <div
            className="card card-hoverable"
            style={{
              padding: '32px 28px',
              borderRadius: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid #e2e8f0',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)'
              }}
            />
            <div>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  marginBottom: '20px',
                  border: '1px solid #bfdbfe'
                }}
              >
                💼
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '8px', color: '#0f172a' }}>
                Staff Operations
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: '1.5', marginBottom: '20px' }}>
                Bank employee workstation to perform KYC verification, approve pending accounts, monitor global transaction feeds, and manage customer risk.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', fontSize: '0.88rem', color: '#334155' }}>
                <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>✓</span> Verify Pending Account Registrations
                </li>
                <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>✓</span> Block / Unblock High-Risk Accounts
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>✓</span> Global Bank Transaction Ledger Surveillance
                </li>
              </ul>
            </div>
            <Link
              to="/login?portal=staff"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
            >
              Launch Staff Workstation &rarr;
            </Link>
          </div>

          {/* 3. Executive Admin Gateway */}
          <div
            className="card card-hoverable"
            style={{
              padding: '32px 28px',
              borderRadius: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid #e2e8f0',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #8b5cf6 0%, #6d28d9 100%)'
              }}
            />
            <div>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  marginBottom: '20px',
                  border: '1px solid #e9d5ff'
                }}
              >
                🛡️
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '8px', color: '#0f172a' }}>
                Executive Admin
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: '1.5', marginBottom: '20px' }}>
                Command control for Super Administrators: Provision employee accounts, create regional branches, and inspect forensic audit logs.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', fontSize: '0.88rem', color: '#334155' }}>
                <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>✓</span> Provision Staff & Role Assignments
                </li>
                <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>✓</span> Register & Configure Branch Routing
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>✓</span> Complete JSONB Security Audit Trail
                </li>
              </ul>
            </div>
            <Link
              to="/login?portal=admin"
              className="btn btn-secondary"
              style={{
                width: '100%',
                padding: '12px',
                borderColor: '#c084fc',
                color: '#6b21a8',
                fontWeight: '700'
              }}
            >
              Enter Admin Console &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Architecture & Anti-Fraud Core Pillars */}
      <section
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          padding: '48px 32px',
          marginBottom: '50px',
          boxShadow: '0 8px 30px -4px rgba(15, 23, 42, 0.05)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a' }}>
            Built for Concurrency, Resilience & Ledger Integrity
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.96rem', marginTop: '6px' }}>
            Engineered from ground up to satisfy rigorous ACID and financial security guarantees
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '24px'
          }}
        >
          <div style={{ padding: '20px', borderRadius: '14px', backgroundColor: '#ffffff', border: '1px solid #f1f5f9', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '10px' }}>🔒</div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '6px' }}>Pessimistic Row Locking</h4>
            <p style={{ fontSize: '0.86rem', color: '#64748b', lineHeight: '1.5' }}>
              <code>SELECT ... FOR UPDATE</code> locks database rows in real-time, preventing double-debit race conditions even under concurrent assault.
            </p>
          </div>

          <div style={{ padding: '20px', borderRadius: '14px', backgroundColor: '#ffffff', border: '1px solid #f1f5f9', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '10px' }}>⚡</div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '6px' }}>Idempotency Protection</h4>
            <p style={{ fontSize: '0.86rem', color: '#64748b', lineHeight: '1.5' }}>
              Client idempotency tokens intercept duplicate or replayed submissions, guaranteeing transactions execute exactly once.
            </p>
          </div>

          <div style={{ padding: '20px', borderRadius: '14px', backgroundColor: '#ffffff', border: '1px solid #f1f5f9', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '10px' }}>🔄</div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '6px' }}>Deadlock-Free Sorting</h4>
            <p style={{ fontSize: '0.86rem', color: '#64748b', lineHeight: '1.5' }}>
              Transfers lock accounts in deterministic numerical order (<code>LEAST/GREATEST</code>), mathematically eliminating circular database deadlocks.
            </p>
          </div>

          <div style={{ padding: '20px', borderRadius: '14px', backgroundColor: '#ffffff', border: '1px solid #f1f5f9', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '10px' }}>📜</div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '6px' }}>Forensic Audit Logging</h4>
            <p style={{ fontSize: '0.86rem', color: '#64748b', lineHeight: '1.5' }}>
              Structured PostgreSQL JSONB payloads document all administrative actions, logins, status changes, and critical balance movements.
            </p>
          </div>
        </div>
      </section>

      {/* Live System Metrics Bar */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          textAlign: 'center'
        }}
      >
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#4f46e5' }}>100%</div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginTop: '4px' }}>ACID Compliant</div>
        </div>
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#10b981' }}>₹0.00</div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginTop: '4px' }}>Race Condition Loss</div>
        </div>
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#3b82f6' }}>3 Branches</div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginTop: '4px' }}>Active Routing</div>
        </div>
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#8b5cf6' }}>3 RBAC Tiers</div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginTop: '4px' }}>Customer / Staff / Admin</div>
        </div>
      </section>
    </div>
  );
}
