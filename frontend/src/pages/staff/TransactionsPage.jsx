import React, { useState, useEffect } from 'react';
import { getAllTransactions } from '../../api/staff';
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

// Status badge styling helper
function getStatusBadge(status) {
  const normalized = (status || '').toUpperCase();
  const styles = {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: '700',
    display: 'inline-block'
  };

  switch (normalized) {
    case 'SUCCESS':
      return <span style={{ ...styles, backgroundColor: '#dcfce7', color: '#15803d' }}>SUCCESS</span>;
    case 'FAILED':
      return <span style={{ ...styles, backgroundColor: '#fee2e2', color: '#b91c1c' }}>FAILED</span>;
    case 'PENDING':
      return <span style={{ ...styles, backgroundColor: '#fef3c7', color: '#b45309' }}>PENDING</span>;
    default:
      return <span style={{ ...styles, backgroundColor: '#f3f4f6', color: '#374151' }}>{status}</span>;
  }
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter form draft inputs
  const [filters, setFilters] = useState({
    accountNumber: '',
    type: '',
    status: '',
    from: '',
    to: '',
    minAmount: '',
    maxAmount: ''
  });

  // Active submitted filters used for API fetching
  const [activeFilters, setActiveFilters] = useState({
    accountNumber: '',
    type: '',
    status: '',
    from: '',
    to: '',
    minAmount: '',
    maxAmount: ''
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchTransactions() {
      setLoading(true);
      setError(null);

      try {
        const data = await getAllTransactions({
          ...activeFilters,
          page: pagination.page,
          limit: pagination.limit
        });

        if (isMounted) {
          setTransactions(data.transactions || []);
          if (data.pagination) {
            setPagination(prev => ({
              ...prev,
              page: Number(data.pagination.page) || prev.page,
              limit: Number(data.pagination.limit) || prev.limit,
              total: Number(data.pagination.total) || (data.transactions || []).length,
              totalPages: Number(data.pagination.totalPages) || 1
            }));
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load transactions');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchTransactions();

    return () => {
      isMounted = false;
    };
  }, [activeFilters, pagination.page, pagination.limit]);

  // Filter change handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    setActiveFilters({ ...filters });
  };

  const handleResetFilters = () => {
    const resetValues = {
      accountNumber: '',
      type: '',
      status: '',
      from: '',
      to: '',
      minAmount: '',
      maxAmount: ''
    };
    setFilters(resetValues);
    setActiveFilters(resetValues);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const tableHeaders = ['Date & Time', 'Tx ID', 'Type', 'From Account', 'To Account', 'Amount', 'Status', 'Details'];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#111827' }}>Bank Transactions</h1>
        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.95rem' }}>
          Monitor, search, and audit all banking transactions across customer accounts
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type="error" message={error}>
            {error}
          </Alert>
        </div>
      )}

      {/* Filter Card */}
      <form
        onSubmit={handleApplyFilters}
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '18px 20px',
          marginBottom: '24px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
          Filter Transactions
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}
        >
          {/* Account Number */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#4b5563', marginBottom: '4px' }}>
              Account Number
            </label>
            <input
              type="text"
              name="accountNumber"
              placeholder="e.g. ACC10000001"
              value={filters.accountNumber}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Transaction Type */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#4b5563', marginBottom: '4px' }}>
              Type
            </label>
            <select
              name="type"
              value={filters.type}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                backgroundColor: '#fff',
                boxSizing: 'border-box'
              }}
            >
              <option value="">All Types</option>
              <option value="DEPOSIT">DEPOSIT</option>
              <option value="WITHDRAWAL">WITHDRAWAL</option>
              <option value="TRANSFER">TRANSFER</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#4b5563', marginBottom: '4px' }}>
              Status
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                backgroundColor: '#fff',
                boxSizing: 'border-box'
              }}
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#4b5563', marginBottom: '4px' }}>
              From Date
            </label>
            <input
              type="date"
              name="from"
              value={filters.from}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* To Date */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#4b5563', marginBottom: '4px' }}>
              To Date
            </label>
            <input
              type="date"
              name="to"
              value={filters.to}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Min Amount */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#4b5563', marginBottom: '4px' }}>
              Min Amount (₹)
            </label>
            <input
              type="number"
              name="minAmount"
              placeholder="0"
              min="0"
              value={filters.minAmount}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Max Amount */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#4b5563', marginBottom: '4px' }}>
              Max Amount (₹)
            </label>
            <input
              type="number"
              name="maxAmount"
              placeholder="50000"
              min="0"
              value={filters.maxAmount}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            style={{
              padding: '8px 18px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              padding: '8px 14px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        </div>
      </form>

      {/* Results Section */}
      {loading ? (
        <Loading message="Filtering transactions..." />
      ) : transactions.length === 0 ? (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            color: '#6b7280'
          }}
        >
          <p style={{ margin: 0, fontSize: '1.05rem' }}>No transactions found matching your filter criteria.</p>
        </div>
      ) : (
        <>
          <Table headers={tableHeaders}>
            {transactions.map((tx) => (
              <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '0.88rem' }}>
                  {displayDate(tx.createdAt)}
                </td>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#6b7280' }}>
                  #{tx.id}
                </td>
                <td style={{ padding: '14px 16px', fontWeight: '600' }}>
                  {tx.type}
                </td>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace' }}>
                  {tx.fromAccountNumber || '— (External)'}
                </td>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace' }}>
                  {tx.toAccountNumber || '— (External)'}
                </td>
                <td style={{ padding: '14px 16px', fontWeight: '700', color: '#111827' }}>
                  {displayCurrency(tx.amount)}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  {getStatusBadge(tx.status)}
                </td>
                <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '0.9rem' }}>
                  {tx.description || '—'}
                </td>
              </tr>
            ))}
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
  );
}
