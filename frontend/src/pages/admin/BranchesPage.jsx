import React, { useState, useEffect } from 'react';
import { getBranches, createBranch, updateBranch } from '../../api/admin';
import Table from '../../components/Table';
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

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Form mode: null (hidden), 'add', or 'edit'
  const [formMode, setFormMode] = useState(null);
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [formData, setFormData] = useState({
    branchCode: '',
    name: '',
    address: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadBranches() {
      setLoading(true);
      setError(null);

      try {
        const data = await getBranches();
        if (isMounted) {
          setBranches(Array.isArray(data) ? data : data.branches || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load branches');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadBranches();

    return () => {
      isMounted = false;
    };
  }, []);

  // Open Add form
  const handleOpenAdd = () => {
    setFormMode('add');
    setEditingBranchId(null);
    setFormData({ branchCode: '', name: '', address: '' });
    setError(null);
    setSuccessMessage(null);
  };

  // Open Edit form
  const handleOpenEdit = (branch) => {
    setFormMode('edit');
    setEditingBranchId(branch.id);
    setFormData({
      branchCode: branch.branchCode || '',
      name: branch.name || '',
      address: branch.address || ''
    });
    setError(null);
    setSuccessMessage(null);
  };

  // Close form
  const handleCancelForm = () => {
    setFormMode(null);
    setEditingBranchId(null);
    setFormData({ branchCode: '', name: '', address: '' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit Add or Edit
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!formData.branchCode.trim() || !formData.name.trim() || !formData.address.trim()) {
      setError('All branch fields are required.');
      return;
    }

    setFormSubmitting(true);

    try {
      if (formMode === 'add') {
        const res = await createBranch({
          branchCode: formData.branchCode.trim(),
          name: formData.name.trim(),
          address: formData.address.trim()
        });

        const created = res.data || res;
        setBranches(prev => [...prev, created]);
        setSuccessMessage(`Branch "${formData.name}" added successfully.`);
      } else if (formMode === 'edit') {
        const res = await updateBranch(editingBranchId, {
          branchCode: formData.branchCode.trim(),
          name: formData.name.trim(),
          address: formData.address.trim()
        });

        const updated = res.data || res;
        setBranches(prev =>
          prev.map(b => (b.id === editingBranchId ? { ...b, ...updated } : b))
        );
        setSuccessMessage(`Branch "${formData.name}" updated successfully.`);
      }

      handleCancelForm();
    } catch (err) {
      setError(err.message || 'Failed to save branch');
    } finally {
      setFormSubmitting(false);
    }
  };

  const tableHeaders = ['ID', 'Branch Code', 'Branch Name', 'Address', 'Created At', 'Action'];

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header and Add Button */}
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
          <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#111827' }}>Bank Branches</h1>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.95rem' }}>
            Configure and maintain banking branches, office codes, and service locations
          </p>
        </div>

        {formMode === null && (
          <button
            type="button"
            onClick={handleOpenAdd}
            style={{
              padding: '10px 18px',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            + Add New Branch
          </button>
        )}
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

      {/* Branch Form (Add or Edit) */}
      {formMode !== null && (
        <form
          onSubmit={handleSubmitForm}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '28px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}
        >
          <h2 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', color: '#111827' }}>
            {formMode === 'add' ? 'Add New Bank Branch' : 'Edit Branch Details'}
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              marginBottom: '16px'
            }}
          >
            {/* Branch Code */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Branch Code * (e.g. BR004)
              </label>
              <input
                type="text"
                name="branchCode"
                placeholder="BR004"
                value={formData.branchCode}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Branch Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Branch Name *
              </label>
              <input
                type="text"
                name="name"
                placeholder="e.g. Metro City Center Branch"
                value={formData.name}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Address */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Branch Address *
            </label>
            <input
              type="text"
              name="address"
              placeholder="e.g. 500 Financial Boulevard, Sector 12"
              value={formData.address}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.95rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleCancelForm}
              disabled={formSubmitting}
              style={{
                padding: '8px 16px',
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
              disabled={formSubmitting}
              style={{
                padding: '8px 20px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: formSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              {formSubmitting
                ? 'Saving...'
                : formMode === 'add'
                ? 'Create Branch'
                : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* Branches Table */}
      {loading ? (
        <Loading message="Loading bank branches..." />
      ) : branches.length === 0 ? (
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
          <p style={{ margin: 0, fontSize: '1.05rem' }}>No branches registered yet.</p>
        </div>
      ) : (
        <Table headers={tableHeaders}>
          {branches.map((b) => (
            <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#6b7280' }}>
                #{b.id}
              </td>
              <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: '700', color: '#1f2937' }}>
                {b.branchCode}
              </td>
              <td style={{ padding: '14px 16px', fontWeight: '600', color: '#111827' }}>
                {b.name}
              </td>
              <td style={{ padding: '14px 16px', color: '#4b5563' }}>
                {b.address}
              </td>
              <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '0.9rem' }}>
                {displayDate(b.createdAt)}
              </td>
              <td style={{ padding: '14px 16px' }}>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(b)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    padding: '4px 12px',
                    fontSize: '0.85rem'
                  }}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
