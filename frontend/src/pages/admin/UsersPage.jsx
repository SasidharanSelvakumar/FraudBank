import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUsers, toggleUserStatus } from '../../api/admin';
import Table from '../../components/Table';
import Pagination from '../../components/Pagination';
import Alert from '../../components/Alert';
import Loading from '../../components/Loading';

function displayDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

// Role badge helper
function getRoleBadge(role) {
  const norm = (role || '').toUpperCase();
  const styles = {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: '700'
  };

  switch (norm) {
    case 'ADMIN':
      return <span style={{ ...styles, backgroundColor: '#f3e8ff', color: '#7e22ce' }}>ADMIN</span>;
    case 'EMPLOYEE':
      return <span style={{ ...styles, backgroundColor: '#dbeafe', color: '#1d4ed8' }}>EMPLOYEE</span>;
    case 'CUSTOMER':
      return <span style={{ ...styles, backgroundColor: '#f3f4f6', color: '#374151' }}>CUSTOMER</span>;
    default:
      return <span style={{ ...styles, backgroundColor: '#f3f4f6', color: '#374151' }}>{role}</span>;
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [roleFilter, setRoleFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Get current logged-in user to prevent self-deactivation
  let currentUserId = null;
  let currentUserEmail = null;
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      currentUserId = parsed.id;
      currentUserEmail = parsed.email;
    }
  } catch {
    // Ignore storage parse error
  }

  useEffect(() => {
    let isMounted = true;

    async function fetchUsers() {
      setLoading(true);
      setError(null);

      try {
        const data = await getUsers({
          role: roleFilter,
          search: appliedSearch,
          page: pagination.page,
          limit: pagination.limit
        });

        if (isMounted) {
          setUsers(data.users || []);
          if (data.pagination) {
            setPagination(prev => ({
              ...prev,
              page: Number(data.pagination.page) || prev.page,
              limit: Number(data.pagination.limit) || prev.limit,
              total: Number(data.pagination.total) || (data.users || []).length,
              totalPages: Number(data.pagination.totalPages) || 1
            }));
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load users');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, [roleFilter, appliedSearch, pagination.page, pagination.limit]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    setAppliedSearch(searchInput.trim());
  };

  // Handle Role filter change
  const handleRoleChange = (e) => {
    setRoleFilter(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Toggle user activation
  const handleToggleStatus = async (user) => {
    const newStatus = !user.isActive;

    if (!newStatus) {
      const confirmed = window.confirm(
        `Are you sure you want to DEACTIVATE ${user.name} (${user.email})?\nThey will not be able to log into the banking system.`
      );
      if (!confirmed) return;
    }

    setActionLoadingId(user.id);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await toggleUserStatus(user.id, newStatus);
      setUsers(prev =>
        prev.map(u => (u.id === user.id ? { ...u, isActive: newStatus } : u))
      );
      setSuccessMessage(res.message || `User ${newStatus ? 'activated' : 'deactivated'} successfully.`);
    } catch (err) {
      setError(err.message || 'Failed to update user status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const tableHeaders = ['ID', 'Name', 'Email', 'Role', 'Status', 'Created At', 'Action'];

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header and Create Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#111827' }}>System Users</h1>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.95rem' }}>
            Manage bank customers, employees, and administrative accounts
          </p>
        </div>

        <Link
          to="/admin/employees/new"
          style={{
            padding: '10px 18px',
            backgroundColor: '#16a34a',
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '0.95rem'
          }}
        >
          + Create Employee
        </Link>
      </div>

      {/* Alerts */}
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

      {/* Search and Role Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}
      >
        {/* Role select */}
        <div style={{ minWidth: '160px' }}>
          <select
            value={roleFilter}
            onChange={handleRoleChange}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.95rem',
              backgroundColor: '#fff'
            }}
          >
            <option value="">All Roles</option>
            <option value="CUSTOMER">Customers</option>
            <option value="EMPLOYEE">Employees</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>

        {/* Search input */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1' }}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              flex: '1',
              minWidth: '220px',
              padding: '10px 14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.95rem'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 16px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Search
          </button>
          {appliedSearch && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setAppliedSearch('');
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
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
      </div>

      {/* Users Table */}
      {loading ? (
        <Loading message="Loading system users..." />
      ) : users.length === 0 ? (
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
          <p style={{ margin: 0, fontSize: '1.05rem' }}>No users found matching your criteria.</p>
        </div>
      ) : (
        <>
          <Table headers={tableHeaders}>
            {users.map((u) => {
              const isSelf =
                (currentUserId && String(u.id) === String(currentUserId)) ||
                (currentUserEmail && u.email === currentUserEmail) ||
                (u.role === 'ADMIN' && u.email === 'admin@bank.com');

              const isBusy = actionLoadingId === u.id;

              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#6b7280' }}>
                    #{u.id}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: '#111827' }}>
                    {u.name}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#4b5563' }}>{u.email}</td>
                  <td style={{ padding: '14px 16px' }}>{getRoleBadge(u.role)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        backgroundColor: u.isActive !== false ? '#dcfce7' : '#fee2e2',
                        color: u.isActive !== false ? '#15803d' : '#b91c1c'
                      }}
                    >
                      {u.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '0.9rem' }}>
                    {displayDate(u.createdAt)}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {isSelf ? (
                      <span style={{ fontSize: '0.82rem', color: '#9ca3af', fontStyle: 'italic' }}>
                        Current user
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        disabled={isBusy}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: u.isActive !== false ? '#fee2e2' : '#dcfce7',
                          color: u.isActive !== false ? '#b91c1c' : '#15803d',
                          border: `1px solid ${u.isActive !== false ? '#fca5a5' : '#86efac'}`,
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          cursor: isBusy ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {isBusy
                          ? 'Updating...'
                          : u.isActive !== false
                          ? 'Deactivate'
                          : 'Activate'}
                      </button>
                    )}
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
  );
}
