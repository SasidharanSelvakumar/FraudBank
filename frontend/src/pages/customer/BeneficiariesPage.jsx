import React, { useState, useEffect } from 'react';
import { getBeneficiaries, addBeneficiary, deleteBeneficiary } from '../../api/beneficiaries';
import { formatDate } from '../../utils/format';
import Table from '../../components/Table';
import Alert from '../../components/Alert';
import Loading from '../../components/Loading';

export default function BeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [accountNumber, setAccountNumber] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadBeneficiaries = async () => {
    try {
      const res = await getBeneficiaries();
      if (res && res.beneficiaries) {
        setBeneficiaries(res.beneficiaries);
      }
    } catch (err) {
      setError(err.message || 'Failed to load beneficiaries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBeneficiaries();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!accountNumber || !name) {
      setError('Please provide both account number and recipient nickname');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await addBeneficiary({ accountNumber, name });
      setSuccess(`Beneficiary '${res.beneficiary.name}' added successfully!`);
      setAccountNumber('');
      setName('');
      await loadBeneficiaries();
    } catch (err) {
      setError(err.message || 'Failed to add beneficiary');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, beneficiaryName) => {
    const confirmed = window.confirm(`Are you sure you want to remove beneficiary '${beneficiaryName}'?`);
    if (!confirmed) return;

    setError(null);
    setSuccess(null);

    try {
      await deleteBeneficiary(id);
      setSuccess(`Beneficiary '${beneficiaryName}' was removed successfully.`);
      await loadBeneficiaries();
    } catch (err) {
      setError(err.message || 'Failed to remove beneficiary');
    }
  };

  if (loading) {
    return <Loading message="Loading saved beneficiaries..." />;
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>
          Saved Beneficiaries
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
          Manage trusted accounts for quick and secure fund transfers
        </p>
      </div>

      <Alert type="error" message={error} onClose={() => setError(null)} />
      <Alert type="success" message={success} onClose={() => setSuccess(null)} />

      {/* Add Beneficiary Card */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '16px' }}>
          Add New Beneficiary
        </h2>

        <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="ben-account">Recipient Account Number</label>
            <input
              id="ben-account"
              type="text"
              className="form-control"
              placeholder="e.g. ACC10000002"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.trim().toUpperCase())}
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="ben-name">Beneficiary Nickname / Name</label>
            <input
              id="ben-name"
              type="text"
              className="form-control"
              placeholder="e.g. Bob Jones"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div>
            <button
              id="add-beneficiary-btn"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: '42px' }}
              disabled={submitting}
            >
              {submitting ? 'Adding...' : '+ Save Beneficiary'}
            </button>
          </div>
        </form>
      </div>

      {/* Beneficiaries Table */}
      <div className="card">
        <h2 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '16px' }}>
          Active Beneficiaries ({beneficiaries.length})
        </h2>

        <Table
          headers={['Nickname / Name', 'Account Number', 'Added On', 'Action']}
          isEmpty={beneficiaries.length === 0}
          emptyMessage="No saved beneficiaries yet. Add your first beneficiary above."
        >
          {beneficiaries.map((b) => (
            <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '14px 16px', fontWeight: '600', color: '#0f172a' }}>{b.name}</td>
              <td style={{ padding: '14px 16px', color: '#475569' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>{b.accountNumber}</span>
              </td>
              <td style={{ padding: '14px 16px', color: '#64748b' }}>{formatDate(b.createdAt, false)}</td>
              <td style={{ padding: '14px 16px' }}>
                <button
                  type="button"
                  onClick={() => handleDelete(b.id, b.name)}
                  className="btn btn-danger btn-sm"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
