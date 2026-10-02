import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyAccount } from '../../api/accounts';
import { getBeneficiaries } from '../../api/beneficiaries';
import { transfer } from '../../api/transfers';
import { formatCurrency } from '../../utils/format';
import Alert from '../../components/Alert';
import Loading from '../../components/Loading';

function generateIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `key-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

export default function TransferPage() {
  const [account, setAccount] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const [amount, setAmount] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [acctRes, benRes] = await Promise.all([getMyAccount(), getBeneficiaries()]);

        if (acctRes && acctRes.account) {
          setAccount(acctRes.account);
        }

        if (benRes && benRes.beneficiaries) {
          setBeneficiaries(benRes.beneficiaries);
          if (benRes.beneficiaries.length > 0) {
            setSelectedBeneficiary(benRes.beneficiaries[0].id);
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize transfer screen');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!account) {
      setError('You must have an active bank account to transfer funds');
      return;
    }

    if (account.status !== 'ACTIVE') {
      setError(`Cannot transfer funds: Your account is currently ${account.status}`);
      return;
    }

    if (!selectedBeneficiary) {
      setError('Please choose a recipient beneficiary');
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid transfer amount greater than zero');
      return;
    }

    if (numAmount > Number(account.balance)) {
      setError('Transfer amount exceeds your current available balance');
      return;
    }

    const chosenBen = beneficiaries.find((b) => String(b.id) === String(selectedBeneficiary));
    const confirmed = window.confirm(
      `Confirm Transfer of ${formatCurrency(amount)} to ${chosenBen?.name} (${chosenBen?.accountNumber})?`
    );
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await transfer({
        fromAccountId: account.id,
        beneficiaryId: selectedBeneficiary,
        amount: String(amount),
        idempotencyKey
      });

      setSuccess(
        `Successfully transferred ${formatCurrency(amount)} to ${chosenBen?.name}! New Balance: ${formatCurrency(res.balance)}`
      );
      setAccount((prev) => ({ ...prev, balance: res.balance }));
      setAmount('');
      // Generate new idempotency key for the next operation
      setIdempotencyKey(generateIdempotencyKey());
    } catch (err) {
      setError(err.message || 'Transfer failed. No funds were debited.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading message="Preparing secure transfer form..." />;
  }

  const isBlocked = account?.status === 'BLOCKED';
  const isPending = account?.status === 'PENDING';

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>
          Transfer Funds
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
          Send virtual money instantly to registered beneficiaries
        </p>
      </div>

      <Alert type="error" message={error} onClose={() => setError(null)} />
      <Alert type="success" message={success} onClose={() => setSuccess(null)} />

      {/* Account Status Safeguard Warnings */}
      {isPending && (
        <Alert
          type="warning"
          message="Your account is PENDING verification. Transfers are disabled until an employee verifies your account."
        />
      )}

      {isBlocked && (
        <Alert
          type="error"
          message="Your account is BLOCKED. All money transfer operations are currently rejected by the bank."
        />
      )}

      <div
        className="card"
        style={{
          boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.03)',
          borderRadius: '18px',
          padding: '28px'
        }}
      >
        {/* Source Account Info Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '18px 20px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Debiting From Account
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>
              {account?.accountNumber || 'No Account Found'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Available Balance
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#4f46e5', marginTop: '2px' }}>
              {formatCurrency(account?.balance)}
            </div>
          </div>
        </div>

        {beneficiaries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>👥</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '8px' }}>No Beneficiaries Added</h3>
            <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.92rem' }}>
              You must register at least one recipient beneficiary account before initiating a money transfer.
            </p>
            <Link to="/beneficiaries" className="btn btn-primary">
              + Add Beneficiary Now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleTransfer}>
            <div className="form-group">
              <label htmlFor="transfer-recipient">Select Beneficiary Recipient</label>
              <select
                id="transfer-recipient"
                className="form-control"
                value={selectedBeneficiary}
                onChange={(e) => setSelectedBeneficiary(e.target.value)}
                disabled={submitting || account?.status !== 'ACTIVE'}
                required
              >
                {beneficiaries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.accountNumber}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="transfer-amount">Transfer Amount (₹)</label>
              <input
                id="transfer-amount"
                type="number"
                step="0.01"
                min="0.01"
                className="form-control"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={submitting || account?.status !== 'ACTIVE'}
                style={{ fontSize: '1.1rem', fontWeight: '600' }}
                required
              />
            </div>

            {/* Idempotency Key visualization */}
            <div
              style={{
                marginBottom: '24px',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                color: '#64748b'
              }}
            >
              <span>🔒 Idempotency Safety Token:</span>
              <code style={{ fontFamily: 'monospace', fontWeight: '700', color: '#334155' }}>
                {idempotencyKey.substring(0, 18)}...
              </code>
            </div>

            <button
              id="transfer-submit-btn"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: '1rem' }}
              disabled={submitting || account?.status !== 'ACTIVE' || !amount}
            >
              {submitting ? 'Executing Atomic Transfer...' : 'Confirm & Transfer Funds'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
