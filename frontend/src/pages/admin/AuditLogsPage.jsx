import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '../../api/admin';
import Table from '../../components/Table';
import Pagination from '../../components/Pagination';
import Alert from '../../components/Alert';
import Loading from '../../components/Loading';

function displayDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

// Format details helper to safely render strings or JSONB objects
function formatDetails(details) {
  if (!details) return '—';
  let parsed = details;
  if (typeof details === 'string') {
    try {
      parsed = JSON.parse(details);
    } catch {
      return details;
    }
  }
  if (typeof parsed === 'object' && parsed !== null) {
    const entries = Object.entries(parsed);
    if (entries.length === 0) return '—';
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {entries.map(([key, val]) => (
          <span
            key={key}
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              fontSize: '0.8rem',
              color: '#334155'
            }}
          >
            <strong style={{ color: '#475569' }}>{key}:</strong>{' '}
            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
          </span>
        ))}
      </div>
    );
  }
  return String(details);
}

// Action badge styling helper

function getActionBadge(action) {
  const norm = (action || '').toUpperCase();
  const styles = {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.78rem',
    fontWeight: '700',
    fontFamily: 'monospace',
    display: 'inline-block'
  };

  if (norm.includes('VERIFIED') || norm.includes('UNBLOCKED') || norm.includes('ACTIVATED') || norm.includes('CREATED')) {
    return <span style={{ ...styles, backgroundColor: '#dcfce7', color: '#15803d' }}>{action}</span>;
  }
  if (norm.includes('BLOCKED') || norm.includes('DEACTIVATED')) {
    return <span style={{ ...styles, backgroundColor: '#fee2e2', color: '#b91c1c' }}>{action}</span>;
  }
  return <span style={{ ...styles, backgroundColor: '#eff6ff', color: '#1d4ed8' }}>{action}</span>;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Draft filters in inputs
  const [filters, setFilters] = useState({
    action: '',
    from: '',
    to: ''
  });

  // Active applied filters
  const [activeFilters, setActiveFilters] = useState({
    action: '',
    from: '',
    to: ''
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchLogs() {
      setLoading(true);
      setError(null);

      try {
        const data = await getAuditLogs({
          action: activeFilters.action,
          from: activeFilters.from,
          to: activeFilters.to,
          page: pagination.page,
          limit: pagination.limit
        });

        if (isMounted) {
          setLogs(data.logs || []);
          if (data.pagination) {
            setPagination(prev => ({
              ...prev,
              page: Number(data.pagination.page) || prev.page,
              limit: Number(data.pagination.limit) || prev.limit,
              total: Number(data.pagination.total) || (data.logs || []).length,
              totalPages: Number(data.pagination.totalPages) || 1
            }));
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load audit logs');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchLogs();

    return () => {
      isMounted = false;
    };
  }, [activeFilters, pagination.page, pagination.limit]);

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
    const reset = { action: '', from: '', to: '' };
    setFilters(reset);
    setActiveFilters(reset);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const tableHeaders = ['ID', 'Date & Time', 'Action', 'Target ID', 'Performed By', 'Details'];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#111827' }}>System Audit Logs</h1>
        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.95rem' }}>
          Comprehensive immutable trail of administrative actions, account verifications, and security events
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
          Filter Audit Trail
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}
        >
          {/* Action Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#4b5563', marginBottom: '4px' }}>
              Action Type
            </label>
            <select
              name="action"
              value={filters.action}
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
              <option value="">All Action Types</option>
              <option value="ACCOUNT_VERIFIED">ACCOUNT_VERIFIED</option>
              <option value="ACCOUNT_BLOCKED">ACCOUNT_BLOCKED</option>
              <option value="ACCOUNT_UNBLOCKED">ACCOUNT_UNBLOCKED</option>
              <option value="EMPLOYEE_CREATED">EMPLOYEE_CREATED</option>
              <option value="USER_ACTIVATED">USER_ACTIVATED</option>
              <option value="USER_DEACTIVATED">USER_DEACTIVATED</option>
              <option value="BRANCH_CREATED">BRANCH_CREATED</option>
              <option value="BRANCH_UPDATED">BRANCH_UPDATED</option>
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

      {/* Audit Logs Table */}
      {loading ? (
        <Loading message="Filtering audit logs..." />
      ) : logs.length === 0 ? (
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
          <p style={{ margin: 0, fontSize: '1.05rem' }}>No audit logs recorded matching your filter criteria.</p>
        </div>
      ) : (
        <>
          <Table headers={tableHeaders}>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#6b7280' }}>
                  #{log.id}
                </td>
                <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '0.88rem' }}>
                  {displayDate(log.createdAt)}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  {getActionBadge(log.action)}
                </td>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#374151' }}>
                  {log.targetId ? `#${log.targetId}` : '—'}
                </td>
                <td style={{ padding: '14px 16px', color: '#111827', fontWeight: '500', fontSize: '0.9rem' }}>
                  {log.userName || (log.userId ? `User #${log.userId}` : 'System')}
                </td>
                <td style={{ padding: '14px 16px', color: '#374151', fontSize: '0.9rem' }}>
                  {formatDetails(log.details)}
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
