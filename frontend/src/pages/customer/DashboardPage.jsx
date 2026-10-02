import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyAccount, createAccount, deposit, withdraw, getTransactions } from '../../api/accounts';
import { getBranches } from '../../api/branches';
import { formatCurrency, formatDate } from '../../utils/format';
import Alert from '../../components/Alert';
import Loading from '../../components/Loading';
import Table from '../../components/Table';

export default function DashboardPage() {
  const { user } = useAuth();

  const [accountData, setAccountData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);

  // Modals / forms
  const [selectedBranch, setSelectedBranch] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [activeModal, setActiveModal] = useState(null); // 'deposit' | 'withdraw' | null

  // Fetch account status
  const loadDashboard = async () => {
    setError(null);
    try {
      const res = await getMyAccount();
      setAccountData(res);

      if (res && res.hasAccount && res.account) {
        // Fetch recent 5 transactions
        try {
          const txRes = await getTransactions(res.account.id, { page: 1, limit: 5 });
          if (txRes && txRes.transactions) {
            setRecentTransactions(txRes.transactions);
          }
        } catch (txErr) {
          console.warn('Could not load recent transactions:', txErr.message);
        }
      } else {
        // Load branches for account creation
        try {
          const bRes = await getBranches();
          if (bRes && bRes.branches) {
            setBranches(bRes.branches);
            if (bRes.branches.length > 0) {
              setSelectedBranch(bRes.branches[0].id);
            }
          }
        } catch (bErr) {
          console.warn('Could not load branches:', bErr.message);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load account data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Handle Account Creation
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!selectedBranch) {
      setError('Please select a home bank branch');
      return;
    }

    setCreateLoading(true);
    setError(null);

    try {
      await createAccount({ branchId: selectedBranch });
      setSuccess('Account created successfully! It is now pending staff verification.');
      await loadDashboard();
    } catch (err) {
      setError(err.message || 'Failed to create bank account');
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Deposit
  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || Number(depositAmount) <= 0) {
      setError('Please enter a valid deposit amount');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const res = await deposit(accountData.account.id, depositAmount);
      setSuccess(`Deposit of ${formatCurrency(depositAmount)} completed successfully!`);
      setDepositAmount('');
      setActiveModal(null);
      await loadDashboard();
    } catch (err) {
      setError(err.message || 'Deposit failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Withdraw
  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || Number(withdrawAmount) <= 0) {
      setError('Please enter a valid withdrawal amount');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      await withdraw(accountData.account.id, withdrawAmount);
      setSuccess(`Withdrawal of ${formatCurrency(withdrawAmount)} completed successfully!`);
      setWithdrawAmount('');
      setActiveModal(null);
      await loadDashboard();
    } catch (err) {
      setError(err.message || 'Withdrawal failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <Loading message="Loading customer banking dashboard..." />;
  }

  const hasAccount = accountData?.hasAccount && accountData?.account;
  const account = accountData?.account;
  const status = account?.status || 'NO_ACCOUNT';

  return (
    <div>
      {/* Top Banner / Alerts */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a' }}>
          Welcome back, {user?.name}!
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '4px' }}>
          Simulated Customer Banking Portal
        </p>
      </div>

      <Alert type="error" message={error} onClose={() => setError(null)} />
      <Alert type="success" message={success} onClose={() => setSuccess(null)} />

      {/* STATE 1: NO ACCOUNT */}
      {!hasAccount && (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '36px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🏦</div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '700', marginBottom: '8px' }}>
            Open Your First Bank Account
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.92rem', marginBottom: '24px' }}>
            Choose your home branch to open an account. New accounts start in <span className="badge badge-pending">PENDING</span> status until verified by bank staff.
          </p>

          <form onSubmit={handleCreateAccount} style={{ textAlign: 'left' }}>
            <div className="form-group">
              <label htmlFor="branch-select">Select Home Branch</label>
              <select
                id="branch-select"
                className="form-control"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                disabled={createLoading}
                required
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.branchCode}) — {b.address}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="create-account-btn"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
              disabled={createLoading || branches.length === 0}
            >
              {createLoading ? 'Submitting Application...' : 'Create Account Now'}
            </button>
          </form>
        </div>
      )}

      {/* STATE 2: PENDING BANNER */}
      {hasAccount && status === 'PENDING' && (
        <div
          style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            padding: '20px 24px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div style={{ fontSize: '2rem' }}>⏳</div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#b45309' }}>
              Account Verification Pending
            </h3>
            <p style={{ color: '#92400e', fontSize: '0.9rem', marginTop: '4px' }}>
              Account <strong>{account.accountNumber}</strong> was opened at <strong>{account.branch?.name}</strong>.
              It is currently awaiting staff verification. Deposits, withdrawals, and transfers will unlock as soon as an employee approves your account.
            </p>
          </div>
        </div>
      )}

      {/* STATE 3: BLOCKED BANNER */}
      {hasAccount && status === 'BLOCKED' && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '10px',
            padding: '20px 24px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div style={{ fontSize: '2rem' }}>🚫</div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#b91c1c' }}>
              Account Temporarily Blocked
            </h3>
            <p style={{ color: '#991b1b', fontSize: '0.9rem', marginTop: '4px' }}>
              Account <strong>{account.accountNumber}</strong> has been suspended by bank administration.
              Financial transactions are currently disabled. Please contact your local branch or administrator to unblock.
            </p>
          </div>
        </div>
      )}

      {/* STATE 4 & GENERAL SUMMARY: ACTIVE OR EXISTING ACCOUNT */}
      {hasAccount && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
              marginBottom: '32px'
            }}
          >
            {/* Luxury Banking Card */}
            <div
              className="card"
              style={{
                background: 'linear-gradient(135deg, #090d16 0%, #171c2c 40%, #1e1b4b 100%)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '20px',
                padding: '28px',
                boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.35), 0 0 20px rgba(79, 70, 229, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '220px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Subtle background glow effect */}
              <div
                style={{
                  position: 'absolute',
                  top: '-40px',
                  right: '-40px',
                  width: '180px',
                  height: '180px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }}
              />

              {/* Card Top: Chip & Bank Name */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* EMV Chip Representation */}
                  <div
                    style={{
                      width: '42px',
                      height: '30px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #fcd34d 0%, #d97706 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'inset 0 0 4px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    <div style={{ width: '24px', height: '18px', border: '1px solid rgba(0,0,0,0.3)', borderRadius: '3px' }} />
                  </div>
                  {/* Contactless waves icon */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M8.5 16.5a5 5 0 0 1 0-9" />
                    <path d="M12 19a9 9 0 0 0 0-14" />
                    <path d="M15.5 21.5a13 13 0 0 0 0-19" />
                  </svg>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: '800', letterSpacing: '0.08em', color: '#cbd5e1', textTransform: 'uppercase' }}>
                    FRAUD BANK
                  </span>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      letterSpacing: '0.04em',
                      backgroundColor: status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.2)' : status === 'PENDING' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: status === 'ACTIVE' ? '#4ade80' : status === 'PENDING' ? '#fbbf24' : '#f87171',
                      border: `1px solid ${status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.4)' : status === 'PENDING' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                    }}
                  >
                    {status}
                  </span>
                </div>
              </div>

              {/* Card Middle: Available Balance */}
              <div style={{ margin: '8px 0 16px 0' }}>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Total Balance
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em', marginTop: '2px' }}>
                  {formatCurrency(account.balance)}
                </div>
              </div>

              {/* Card Bottom: Account Number & Branch */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '14px', fontSize: '0.82rem', color: '#cbd5e1' }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Number</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '0.92rem', color: '#f8fafc', letterSpacing: '0.05em' }}>
                    {account.accountNumber}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Home Branch</div>
                  <div style={{ fontWeight: '600', color: '#f8fafc' }}>
                    {account.branch?.name || 'Main Branch'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '28px',
                borderRadius: '20px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                    Quick Money Actions
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>
                    Instant operations
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <button
                    type="button"
                    onClick={() => { setActiveModal('deposit'); setError(null); }}
                    className="btn btn-success"
                    style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}
                    disabled={status !== 'ACTIVE'}
                  >
                    <span style={{ fontSize: '1.25rem' }}>📥</span>
                    <span style={{ fontWeight: '700' }}>Deposit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveModal('withdraw'); setError(null); }}
                    className="btn btn-secondary"
                    style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px', borderColor: '#e2e8f0' }}
                    disabled={status !== 'ACTIVE'}
                  >
                    <span style={{ fontSize: '1.25rem' }}>📤</span>
                    <span style={{ fontWeight: '700' }}>Withdraw</span>
                  </button>

                  <Link
                    to="/transfer"
                    className={`btn btn-primary ${status !== 'ACTIVE' ? 'disabled' : ''}`}
                    style={{
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      pointerEvents: status !== 'ACTIVE' ? 'none' : 'auto',
                      opacity: status !== 'ACTIVE' ? 0.6 : 1
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>🚀</span>
                    <span style={{ fontWeight: '700' }}>Send Money</span>
                  </Link>

                  <Link
                    to="/beneficiaries"
                    className="btn btn-secondary"
                    style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px', borderColor: '#e2e8f0' }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>👥</span>
                    <span style={{ fontWeight: '700' }}>Beneficiaries</span>
                  </Link>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Need account records?</span>
                <Link to="/statement" style={{ fontSize: '0.85rem', fontWeight: '700', color: '#4f46e5' }}>
                  View Statements &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Transactions Section */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Recent Account Activity</h2>
              <Link to="/transactions" style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                View all transactions &rarr;
              </Link>
            </div>

            <Table
              headers={['Date', 'Type', 'Direction', 'Counterpart', 'Amount', 'Status']}
              isEmpty={recentTransactions.length === 0}
              emptyMessage="No transactions recorded yet."
            >
              {recentTransactions.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{formatDate(tx.createdAt)}</td>
                  <td style={{ padding: '12px 16px', fontWeight: '600' }}>{tx.type}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        backgroundColor: tx.direction === 'CREDIT' ? '#dcfce7' : '#fee2e2',
                        color: tx.direction === 'CREDIT' ? '#15803d' : '#b91c1c'
                      }}
                    >
                      {tx.direction}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    {tx.accountNumber || '—'}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontWeight: '700',
                      color: tx.direction === 'CREDIT' ? '#15803d' : '#0f172a'
                    }}
                  >
                    {tx.direction === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="badge badge-success">{tx.status}</span>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        </>
      )}

      {/* DEPOSIT MODAL */}
      {activeModal === 'deposit' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px' }}>
              Deposit Virtual Funds
            </h3>
            <form onSubmit={handleDeposit}>
              <div className="form-group">
                <label htmlFor="deposit-input">Amount to Deposit (₹)</label>
                <input
                  id="deposit-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-control"
                  placeholder="e.g. 5000.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  disabled={actionLoading}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveModal(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  id="confirm-deposit-btn"
                  type="submit"
                  className="btn btn-success"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : 'Confirm Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {activeModal === 'withdraw' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px' }}>
              Withdraw Virtual Funds
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '16px' }}>
              Current Available Balance: <strong>{formatCurrency(account?.balance)}</strong>
            </p>
            <form onSubmit={handleWithdraw}>
              <div className="form-group">
                <label htmlFor="withdraw-input">Amount to Withdraw (₹)</label>
                <input
                  id="withdraw-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-control"
                  placeholder="e.g. 1000.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  disabled={actionLoading}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveModal(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  id="confirm-withdraw-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
