import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getCustomerById,
  getAccountTransactions,
  verifyAccount,
  blockAccount,
  unblockAccount
} from '../../api/staff';
import Table from '../../components/Table';
import Pagination from '../../components/Pagination';
import Alert from '../../components/Alert';
import Loading from '../../components/Loading';

// Currency formatter fallback
function displayCurrency(amount) {
  if (amount === undefined || amount === null) return '₹0.00';
  const num = Number(amount);
  if (isNaN(num)) return `₹${amount}`;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Date formatter fallback
function displayDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

// Status badge component
function StatusBadge({ status }) {
  const normalized = (status || '').toUpperCase();
  const styles = {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    display: 'inline-block'
  };

  if (normalized === 'ACTIVE') {
    return <span style={{ ...styles, backgroundColor: '#dcfce7', color: '#15803d' }}>ACTIVE</span>;
  }
  if (normalized === 'PENDING') {
    return <span style={{ ...styles, backgroundColor: '#fef3c7', color: '#b45309' }}>PENDING</span>;
  }
  if (normalized === 'BLOCKED') {
    return <span style={{ ...styles, backgroundColor: '#fee2e2', color: '#b91c1c' }}>BLOCKED</span>;
  }
  return <span style={{ ...styles, backgroundColor: '#f3f4f6', color: '#374151' }}>{status || 'UNKNOWN'}</span>;
}

export default function CustomerDetailPage() {
  const { userId } = useParams();

  const [customer, setCustomer] = useState(null);
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Load customer detail and initial transactions
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const detail = await getCustomerById(userId);
        if (!isMounted) return;

        setCustomer(detail.user || detail);
        const acct = detail.account || (detail.accounts && detail.accounts[0]) || detail;
        setAccount(acct);

        if (acct && acct.id) {
          const txData = await getAccountTransactions(acct.id, {
            page: pagination.page,
            limit: pagination.limit
          });
          if (isMounted) {
            setTransactions(txData.transactions || []);
            if (txData.pagination) {
              setPagination(prev => ({
                ...prev,
                page: Number(txData.pagination.page) || prev.page,
                limit: Number(txData.pagination.limit) || prev.limit,
                total: Number(txData.pagination.total) || (txData.transactions || []).length,
                totalPages: Number(txData.pagination.totalPages) || 1
              }));
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load customer details');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [userId, pagination.page, pagination.limit]);

  // Handle Verify (PENDING -> ACTIVE)
  const handleVerify = async () => {
    if (!account) return;
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await verifyAccount(account.id);
      setAccount(prev => ({ ...prev, status: 'ACTIVE' }));
      setSuccessMessage(res.message || 'Account verified and activated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to verify account');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Block (ACTIVE / PENDING -> BLOCKED) with confirmation
  const handleBlock = async () => {
    if (!account) return;

    const confirmed = window.confirm(
      `Are you sure you want to block account ${account.accountNumber}?\n\nThe customer will NOT be able to deposit, withdraw, or transfer money.`
    );
    if (!confirmed) return;

    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await blockAccount(account.id);
      setAccount(prev => ({ ...prev, status: 'BLOCKED' }));
      setSuccessMessage(res.message || 'Account has been blocked.');
    } catch (err) {
      setError(err.message || 'Failed to block account');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Unblock (BLOCKED -> ACTIVE)
  const handleUnblock = async () => {
    if (!account) return;
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await unblockAccount(account.id);
      setAccount(prev => ({ ...prev, status: 'ACTIVE' }));
      setSuccessMessage(res.message || 'Account has been unblocked.');
    } catch (err) {
      setError(err.message || 'Failed to unblock account');
    } finally {
      setActionLoading(false);
    }
  };

  const currentStatus = (account?.status || '').toUpperCase();
  const txTableHeaders = ['Date', 'Type', 'Direction', 'Counterpart / Details', 'Amount', 'Status'];

  if (loading) {
    return (
      <div style={{ padding: '30px', maxWidth: '1100px', margin: '0 auto' }}>
        <Loading message="Loading customer details and history..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Navigation link back */}
      <div style={{ marginBottom: '20px' }}>
        <Link
          to="/staff/customers"
          style={{
            color: '#2563eb',
            textDecoration: 'none',
            fontSize: '0.95rem',
            fontWeight: '600'
          }}
        >
          &larr; Back to Customers
        </Link>
      </div>

      {/* Success / Error Alerts */}
      {error && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type="error" message={error}>
            {error}
          </Alert>
        </div>
      )}
      {successMessage && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type="success" message={successMessage}>
            {successMessage}
          </Alert>
        </div>
      )}

      {/* Customer & Account Overview Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '24px',
          marginBottom: '28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
            borderBottom: '1px solid #f3f4f6',
            paddingBottom: '20px',
            marginBottom: '20px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#111827' }}>
                {customer?.name || 'Customer Details'}
              </h1>
              <StatusBadge status={currentStatus} />
            </div>
            <p style={{ margin: '6px 0 0 0', color: '#6b7280', fontSize: '0.95rem' }}>
              Email: <strong>{customer?.email}</strong> &bull; User ID: {customer?.id || userId}
            </p>
          </div>

          {/* Action Buttons: Only shown when allowed for current status */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Verify: only for PENDING */}
            {currentStatus === 'PENDING' && (
              <button
                type="button"
                onClick={handleVerify}
                disabled={actionLoading}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: actionLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {actionLoading ? 'Processing...' : 'Verify Account'}
              </button>
            )}

            {/* Block: for ACTIVE or PENDING */}
            {(currentStatus === 'ACTIVE' || currentStatus === 'PENDING') && (
              <button
                type="button"
                onClick={handleBlock}
                disabled={actionLoading}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: actionLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {actionLoading ? 'Processing...' : 'Block Account'}
              </button>
            )}

            {/* Unblock: only for BLOCKED */}
            {currentStatus === 'BLOCKED' && (
              <button
                type="button"
                onClick={handleUnblock}
                disabled={actionLoading}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: actionLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {actionLoading ? 'Processing...' : 'Unblock Account'}
              </button>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px'
          }}
        >
          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block' }}>Account Number</span>
            <strong style={{ fontSize: '1.1rem', color: '#111827', fontFamily: 'monospace' }}>
              {account?.accountNumber || '—'}
            </strong>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block' }}>Current Balance</span>
            <strong style={{ fontSize: '1.25rem', color: '#059669' }}>
              {displayCurrency(account?.balance)}
            </strong>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block' }}>Branch</span>
            <strong style={{ fontSize: '1rem', color: '#111827' }}>
              {account?.branchName || 'Main Branch'}
            </strong>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block' }}>Member Since</span>
            <strong style={{ fontSize: '0.95rem', color: '#374151' }}>
              {displayDate(customer?.createdAt)}
            </strong>
          </div>
        </div>
      </div>

      {/* Account Transaction History */}
      <div>
        <h2 style={{ fontSize: '1.35rem', color: '#111827', marginBottom: '14px' }}>
          Transaction History
        </h2>

        {transactions.length === 0 ? (
          <div
            style={{
              padding: '36px',
              textAlign: 'center',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              color: '#6b7280'
            }}
          >
            <p style={{ margin: 0, fontSize: '1rem' }}>No transactions recorded for this account yet.</p>
          </div>
        ) : (
          <>
            <Table headers={txTableHeaders}>
              {transactions.map((tx) => {
                const isCredit = (tx.direction || '').toUpperCase() === 'CREDIT';
                return (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '0.88rem' }}>
                      {displayDate(tx.createdAt)}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '600' }}>{tx.type}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          backgroundColor: isCredit ? '#dcfce7' : '#fee2e2',
                          color: isCredit ? '#15803d' : '#b91c1c'
                        }}
                      >
                        {tx.direction}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#374151' }}>
                      {tx.accountNumber || tx.counterpart || tx.description || '—'}
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        fontWeight: '700',
                        color: isCredit ? '#15803d' : '#111827'
                      }}
                    >
                      {isCredit ? '+' : '-'} {displayCurrency(tx.amount)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          color: tx.status === 'SUCCESS' ? '#15803d' : '#b91c1c'
                        }}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </Table>

            {/* Pagination */}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
              <Pagination
                currentPage={pagination.page}
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(newPage) => setPagination(prev => ({ ...prev, page: newPage }))}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
