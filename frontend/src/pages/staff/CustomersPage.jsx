import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCustomers } from '../../api/staff';
import Table from '../../components/Table';
import Pagination from '../../components/Pagination';
import Alert from '../../components/Alert';
import Loading from '../../components/Loading';

// Safe currency formatter fallback in case utils/format is not loaded
function displayCurrency(amount) {
  if (amount === undefined || amount === null) return '₹0.00';
  const num = Number(amount);
  if (isNaN(num)) return `₹${amount}`;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Status badge styling helper
function getStatusBadge(status) {
  const normalized = (status || '').toUpperCase();
  const styles = {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '600',
    display: 'inline-block'
  };

  switch (normalized) {
    case 'ACTIVE':
      return (
        <span style={{ ...styles, backgroundColor: '#dcfce7', color: '#15803d' }}>
          ACTIVE
        </span>
      );
    case 'PENDING':
      return (
        <span style={{ ...styles, backgroundColor: '#fef3c7', color: '#b45309' }}>
          PENDING
        </span>
      );
    case 'BLOCKED':
      return (
        <span style={{ ...styles, backgroundColor: '#fee2e2', color: '#b91c1c' }}>
          BLOCKED
        </span>
      );
    default:
      return (
        <span style={{ ...styles, backgroundColor: '#f3f4f6', color: '#374151' }}>
          {status || 'UNKNOWN'}
        </span>
      );
  }
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch customers whenever page or appliedSearch changes
  useEffect(() => {
    let isMounted = true;

    async function loadCustomers() {
      setLoading(true);
      setError(null);
      try {
        const data = await getCustomers({
          search: appliedSearch,
          page: pagination.page,
          limit: pagination.limit
        });

        if (isMounted) {
          setCustomers(data.customers || []);
          if (data.pagination) {
            setPagination(prev => ({
              ...prev,
              page: Number(data.pagination.page) || prev.page,
              limit: Number(data.pagination.limit) || prev.limit,
              total: Number(data.pagination.total) || (data.customers || []).length,
              totalPages: Number(data.pagination.totalPages) || 1
            }));
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load customers');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCustomers();

    return () => {
      isMounted = false;
    };
  }, [appliedSearch, pagination.page, pagination.limit]);

  // Handle search submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    setAppliedSearch(searchInput.trim());
  };

  // Handle clearing search
  const handleClearSearch = () => {
    setSearchInput('');
    setAppliedSearch('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle page change from Pagination component
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const tableHeaders = ['Name', 'Email', 'Account No.', 'Balance', 'Status', 'Action'];

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#111827' }}>Customer Accounts</h1>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.95rem' }}>
            Search, view, and manage customer bank accounts
          </p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type="error" message={error}>
            {error}
          </Alert>
        </div>
      )}

      {/* Search Bar */}
      <form
        onSubmit={handleSearchSubmit}
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}
      >
        <input
          type="text"
          placeholder="Search by name, email, or account number..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{
            flex: '1',
            minWidth: '260px',
            padding: '10px 14px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.95rem',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          style={{
            padding: '10px 18px',
            backgroundColor: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Search
        </button>
        {appliedSearch && (
          <button
            type="button"
            onClick={handleClearSearch}
            style={{
              padding: '10px 14px',
              backgroundColor: '#e5e7eb',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
        )}
      </form>

      {/* Loading state or Content */}
      {loading ? (
        <Loading message="Loading customer accounts..." />
      ) : customers.length === 0 ? (
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
          <p style={{ margin: 0, fontSize: '1.1rem' }}>No customers found.</p>
          {appliedSearch && (
            <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem' }}>
              No matches for "{appliedSearch}". Try resetting your search.
            </p>
          )}
        </div>
      ) : (
        <>
          <Table headers={tableHeaders}>
            {customers.map((c) => {
              const targetId = c.userId || c.id;
              return (
                <tr
                  key={c.id || c.accountNumber}
                  style={{ borderBottom: '1px solid #f1f5f9' }}
                >
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: '#111827' }}>
                    {c.name}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#4b5563' }}>{c.email}</td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#1f2937' }}>
                    {c.accountNumber || '—'}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: '#111827' }}>
                    {displayCurrency(c.balance)}
                  </td>
                  <td style={{ padding: '14px 16px' }}>{getStatusBadge(c.status)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <Link
                      to={`/staff/customers/${targetId}`}
                      style={{
                        color: '#2563eb',
                        textDecoration: 'none',
                        fontWeight: '600'
                      }}
                    >
                      View Details &rarr;
                    </Link>
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
              onPageChange={handlePageChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
