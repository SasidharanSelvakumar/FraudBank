import React, { useState, useEffect } from 'react';
import { getMyAccount, getTransactions } from '../../api/accounts';
import { formatCurrency, formatDate } from '../../utils/format';
import Table from '../../components/Table';
import Pagination from '../../components/Pagination';
import Alert from '../../components/Alert';
import Loading from '../../components/Loading';

export default function TransactionsPage() {
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [type, setType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [error, setError] = useState(null);

  const loadData = async (pageToLoad = 1) => {
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

      const res = await getTransactions(currentAccount.id, {
        page: pageToLoad,
        limit: pagination.limit,
        type,
        from: fromDate,
        to: toDate
      });

      if (res && res.transactions) {
        setTransactions(res.transactions);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [type, fromDate, toDate]);

  const handlePageChange = (newPage) => {
    loadData(newPage);
  };

  const handleClearFilters = () => {
    setType('');
    setFromDate('');
    setToDate('');
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>
          Transaction History
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
          Search, filter, and review all debits and credits on your account
        </p>
      </div>

      <Alert type="error" message={error} onClose={() => setError(null)} />

      {/* Filter Bar */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="tx-filter-type">Operation Type</label>
            <select
              id="tx-filter-type"
              className="form-control"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">All Transactions</option>
              <option value="DEPOSIT">Deposits</option>
              <option value="WITHDRAWAL">Withdrawals</option>
              <option value="TRANSFER">Transfers</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="tx-filter-from">From Date</label>
            <input
              id="tx-filter-from"
              type="date"
              className="form-control"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="tx-filter-to">To Date</label>
            <input
              id="tx-filter-to"
              type="date"
              className="form-control"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div>
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn btn-secondary"
              style={{ width: '100%', height: '42px' }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card">
        {loading ? (
          <Loading message="Loading transaction records..." />
        ) : (
          <>
            <Table
              headers={['Date & Time', 'Type', 'Flow', 'Counterpart Account', 'Amount', 'Status']}
              isEmpty={transactions.length === 0}
              emptyMessage="No transactions match your selected filter criteria."
            >
              {transactions.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.88rem' }}>
                    {formatDate(tx.createdAt)}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: '600' }}>
                    {tx.type}
                  </td>
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
                  <td style={{ padding: '12px 16px', color: '#475569', fontFamily: 'monospace' }}>
                    {tx.accountNumber || (tx.direction === 'CREDIT' ? 'Direct Deposit' : 'Direct Withdrawal')}
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

            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
