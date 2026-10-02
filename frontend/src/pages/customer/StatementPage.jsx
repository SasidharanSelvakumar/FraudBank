import React, { useState, useEffect } from 'react';
import { getMyAccount, getStatement } from '../../api/accounts';
import { formatCurrency, formatDate } from '../../utils/format';
import Table from '../../components/Table';
import Alert from '../../components/Alert';
import Loading from '../../components/Loading';

export default function StatementPage() {
  const [account, setAccount] = useState(null);
  const [statementData, setStatementData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState(null);

  const loadStatement = async () => {
    setLoading(true);
    setError(null);

    try {
      let currentAccount = account;
      if (!currentAccount) {
        const acctRes = await getMyAccount();
        if (acctRes && acctRes.account) {
          currentAccount = acctRes.account;
          setAccount(currentAccount);
        }
      }

      if (!currentAccount) {
        setLoading(false);
        return;
      }

      const res = await getStatement(currentAccount.id, { from, to });
      if (res && res.statement) {
        setStatementData(res.statement);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate account statement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatement();
  }, [from, to]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Top Header - Hidden during print */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>
            Account Statement
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
            Official certified record of your financial movements
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Save as PDF
        </button>
      </div>

      <Alert type="error" message={error} onClose={() => setError(null)} />

      {/* Date Filter Bar - Hidden during print */}
      <div className="card no-print" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '180px' }}>
            <label htmlFor="stmt-from">Statement Period From</label>
            <input
              id="stmt-from"
              type="date"
              className="form-control"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0, minWidth: '180px' }}>
            <label htmlFor="stmt-to">Statement Period To</label>
            <input
              id="stmt-to"
              type="date"
              className="form-control"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => { setFrom(''); setTo(''); }}
              className="btn btn-secondary"
              style={{ height: '42px' }}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      {/* Printable Statement Document */}
      <div
        className="card print-document"
        style={{
          padding: '36px',
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
        }}
      >
        {/* Bank Statement Letterhead */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #0f172a',
            paddingBottom: '20px',
            marginBottom: '28px'
          }}
        >
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ backgroundColor: '#2563eb', color: '#fff', borderRadius: '6px', padding: '2px 8px', fontSize: '1.2rem' }}>₹</span>
              FRAUD BANK
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
              Simulated Core Banking Network &bull; Branch: {account?.branch?.name || 'Main City Branch'}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>OFFICIAL STATEMENT</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
              Generated: {formatDate(new Date())}
            </div>
            {from || to ? (
              <div style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: '600', marginTop: '4px' }}>
                Period: {from || 'Start'} to {to || 'Present'}
              </div>
            ) : null}
          </div>
        </div>

        {/* Account Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '32px'
          }}
        >
          <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ACCOUNT NUMBER</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', marginTop: '6px', fontFamily: 'monospace' }}>
              {account?.accountNumber}
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', padding: '18px', borderRadius: '12px', border: '1px solid #bfdbfe', boxShadow: '0 2px 4px rgba(37,99,235,0.05)' }}>
            <div style={{ fontSize: '0.74rem', color: '#1e40af', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>CLOSING BALANCE</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1d4ed8', marginTop: '6px' }}>
              {formatCurrency(account?.balance)}
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', padding: '18px', borderRadius: '12px', border: '1px solid #a7f3d0', boxShadow: '0 2px 4px rgba(16,185,129,0.05)' }}>
            <div style={{ fontSize: '0.74rem', color: '#065f46', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL CREDITS (+)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669', marginTop: '6px' }}>
              +{formatCurrency(statementData?.totalCredits || 0)}
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)', padding: '18px', borderRadius: '12px', border: '1px solid #fecdd3', boxShadow: '0 2px 4px rgba(244,63,94,0.05)' }}>
            <div style={{ fontSize: '0.74rem', color: '#9f1239', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL DEBITS (-)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#e11d48', marginTop: '6px' }}>
              -{formatCurrency(statementData?.totalDebits || 0)}
            </div>
          </div>
        </div>

        {/* Statement Items Table */}
        {loading ? (
          <Loading message="Generating statement ledger..." />
        ) : (
          <Table
            headers={['Date', 'Transaction Details', 'Type', 'Debit (-)', 'Credit (+)']}
            isEmpty={!statementData || statementData.transactions.length === 0}
            emptyMessage="No transaction records within the selected date interval."
          >
            {statementData?.transactions.map((tx) => (
              <tr key={tx.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 16px', color: '#475569', fontSize: '0.88rem' }}>
                  {formatDate(tx.createdAt)}
                </td>
                <td style={{ padding: '10px 16px', fontWeight: '500' }}>
                  {tx.type === 'TRANSFER'
                    ? tx.direction === 'DEBIT'
                      ? `Transfer to ${tx.toAccountNumber}`
                      : `Transfer from ${tx.fromAccountNumber}`
                    : tx.type === 'DEPOSIT'
                    ? 'Branch Deposit'
                    : 'ATM/Branch Withdrawal'}
                </td>
                <td style={{ padding: '10px 16px', fontSize: '0.85rem', color: '#64748b' }}>
                  {tx.type}
                </td>
                <td style={{ padding: '10px 16px', color: '#b91c1c', fontWeight: '600', textAlign: 'right' }}>
                  {tx.direction === 'DEBIT' ? `-${formatCurrency(tx.amount)}` : '—'}
                </td>
                <td style={{ padding: '10px 16px', color: '#15803d', fontWeight: '600', textAlign: 'right' }}>
                  {tx.direction === 'CREDIT' ? `+${formatCurrency(tx.amount)}` : '—'}
                </td>
              </tr>
            ))}
          </Table>
        )}

        <div style={{ marginTop: '36px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>
          This statement is an electronically generated simulated banking ledger. No wet signature is required.
        </div>
      </div>

      {/* Print Specific CSS */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          header, footer {
            display: none !important;
          }
          body {
            background-color: #ffffff !important;
          }
          .print-document {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
