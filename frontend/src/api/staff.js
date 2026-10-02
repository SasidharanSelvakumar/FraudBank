import client from './client';

// Fake fallback data matching Section 10 specification
// Used when the backend endpoint is not yet ready/merged
const FAKE_CUSTOMERS_LIST = [
  {
    id: 1,
    userId: 1,
    name: 'Alice Smith',
    email: 'alice@bank.com',
    role: 'CUSTOMER',
    accountNumber: 'ACC10000001',
    balance: '10000.00',
    status: 'ACTIVE',
    branchName: 'Main City Branch',
    createdAt: '2026-03-01T10:00:00.000Z'
  },
  {
    id: 2,
    userId: 2,
    name: 'Bob Jones',
    email: 'bob@bank.com',
    role: 'CUSTOMER',
    accountNumber: 'ACC10000002',
    balance: '5000.00',
    status: 'ACTIVE',
    branchName: 'Downtown Branch',
    createdAt: '2026-03-01T11:00:00.000Z'
  },
  {
    id: 3,
    userId: 3,
    name: 'Carol White',
    email: 'carol@bank.com',
    role: 'CUSTOMER',
    accountNumber: 'ACC10000003',
    balance: '0.00',
    status: 'PENDING',
    branchName: 'Uptown Branch',
    createdAt: '2026-03-02T09:00:00.000Z'
  }
];

const fakeStatusOverrides = {};

const ALL_SYSTEM_TRANSACTIONS = [
  {
    id: 1001,
    type: 'DEPOSIT',
    fromAccountNumber: null,
    toAccountNumber: 'ACC10000001',
    accountNumber: 'ACC10000001',
    amount: '10000.00',
    status: 'SUCCESS',
    description: 'Initial account deposit',
    createdAt: '2026-03-01T10:30:00.000Z'
  },
  {
    id: 1002,
    type: 'DEPOSIT',
    fromAccountNumber: null,
    toAccountNumber: 'ACC10000002',
    accountNumber: 'ACC10000002',
    amount: '5000.00',
    status: 'SUCCESS',
    description: 'Initial account deposit',
    createdAt: '2026-03-01T11:15:00.000Z'
  },
  {
    id: 1003,
    type: 'TRANSFER',
    fromAccountNumber: 'ACC10000001',
    toAccountNumber: 'ACC10000002',
    accountNumber: 'ACC10000001',
    amount: '2000.00',
    status: 'SUCCESS',
    description: 'Transfer Alice -> Bob',
    createdAt: '2026-03-01T12:00:00.000Z'
  },
  {
    id: 1004,
    type: 'WITHDRAWAL',
    fromAccountNumber: 'ACC10000001',
    toAccountNumber: null,
    accountNumber: 'ACC10000001',
    amount: '500.00',
    status: 'SUCCESS',
    description: 'ATM Cash Withdrawal',
    createdAt: '2026-03-02T08:15:00.000Z'
  },
  {
    id: 1005,
    type: 'TRANSFER',
    fromAccountNumber: 'ACC10000003',
    toAccountNumber: 'ACC10000001',
    accountNumber: 'ACC10000003',
    amount: '100.00',
    status: 'FAILED',
    description: 'Transfer rejected: Account PENDING',
    createdAt: '2026-03-02T09:45:00.000Z'
  },
  {
    id: 1006,
    type: 'WITHDRAWAL',
    fromAccountNumber: 'ACC10000002',
    toAccountNumber: null,
    accountNumber: 'ACC10000002',
    amount: '6000.00',
    status: 'FAILED',
    description: 'Insufficient account balance',
    createdAt: '2026-03-02T10:20:00.000Z'
  }
];

// Helper to make API calls safely through client.js
async function request(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  if (client && typeof client[method.toLowerCase()] === 'function') {
    return options.body ? client[method.toLowerCase()](url, options.body) : client[method.toLowerCase()](url);
  }
  if (typeof client === 'function') {
    return client(url, options);
  }
  if (client && typeof client.request === 'function') {
    return client.request(url, options);
  }
  throw new Error('API client not available');
}

/**
 * Fetch customers list with search and pagination.
 * GET /staff/customers?search=...&page=...&limit=...
 */
export async function getCustomers({ search = '', page = 1, limit = 10 } = {}) {
  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (page) query.set('page', String(page));
  if (limit) query.set('limit', String(limit));

  const url = `/staff/customers?${query.toString()}`;

  try {
    const res = await request(url, { method: 'GET' });
    if (res && res.data) return res.data;
    if (res && res.customers) return res;
    return res;
  } catch (err) {
    console.warn(`[getCustomers] Backend call failed (${err.message}). Using fake data.`);

    let filtered = FAKE_CUSTOMERS_LIST.map(c => ({
      ...c,
      status: fakeStatusOverrides[c.id] || c.status
    }));

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.accountNumber.toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;

    return {
      customers: filtered.slice(start, start + limit),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages
      }
    };
  }
}

/**
 * Fetch customer detail by userId or accountId.
 * GET /staff/customers/:userId
 */
export async function getCustomerById(userId) {
  const url = `/staff/customers/${userId}`;

  try {
    const res = await request(url, { method: 'GET' });
    if (res && res.data) return res.data;
    return res;
  } catch (err) {
    console.warn(`[getCustomerById] Backend call failed (${err.message}). Using fake customer detail.`);

    const found = FAKE_CUSTOMERS_LIST.find(
      c => String(c.userId) === String(userId) || String(c.id) === String(userId)
    ) || FAKE_CUSTOMERS_LIST[0];

    const currentStatus = fakeStatusOverrides[found.id] || found.status;

    return {
      user: {
        id: found.userId,
        name: found.name,
        email: found.email,
        role: found.role,
        createdAt: found.createdAt
      },
      account: {
        id: found.id,
        accountNumber: found.accountNumber,
        balance: found.balance,
        status: currentStatus,
        branchName: found.branchName,
        createdAt: found.createdAt
      }
    };
  }
}

/**
 * Fetch account transactions for customer detail view.
 * GET /accounts/:accountId/transactions?page=1&limit=10
 */
export async function getAccountTransactions(accountId, { page = 1, limit = 10 } = {}) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  const url = `/accounts/${accountId}/transactions?${query.toString()}`;

  try {
    const res = await request(url, { method: 'GET' });
    if (res && res.data) return res.data;
    if (res && res.transactions) return res;
    return res;
  } catch (err) {
    console.warn(`[getAccountTransactions] Backend call failed (${err.message}). Using fake transactions.`);

    const accountObj = FAKE_CUSTOMERS_LIST.find(c => String(c.id) === String(accountId));
    const targetAcctNum = accountObj ? accountObj.accountNumber : '';

    const list = ALL_SYSTEM_TRANSACTIONS.filter(
      t =>
        t.accountNumber === targetAcctNum ||
        t.fromAccountNumber === targetAcctNum ||
        t.toAccountNumber === targetAcctNum
    );

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;

    return {
      transactions: list.slice(start, start + limit),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages
      }
    };
  }
}

/**
 * Staff search across all bank transactions with rich filtering.
 * GET /staff/transactions?accountNumber=...&type=...&status=...&from=...&to=...&minAmount=...&maxAmount=...&page=...&limit=...
 */
export async function getAllTransactions({
  accountNumber = '',
  type = '',
  status = '',
  from = '',
  to = '',
  minAmount = '',
  maxAmount = '',
  page = 1,
  limit = 10
} = {}) {
  const query = new URLSearchParams();
  if (accountNumber) query.set('accountNumber', accountNumber);
  if (type) query.set('type', type);
  if (status) query.set('status', status);
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  if (minAmount) query.set('minAmount', String(minAmount));
  if (maxAmount) query.set('maxAmount', String(maxAmount));
  query.set('page', String(page));
  query.set('limit', String(limit));

  const url = `/staff/transactions?${query.toString()}`;

  try {
    const res = await request(url, { method: 'GET' });
    if (res && res.data) return res.data;
    if (res && res.transactions) return res;
    return res;
  } catch (err) {
    console.warn(`[getAllTransactions] Backend call failed (${err.message}). Using fake transactions list.`);

    let filtered = [...ALL_SYSTEM_TRANSACTIONS];

    if (accountNumber) {
      const acc = accountNumber.trim().toLowerCase();
      filtered = filtered.filter(
        t =>
          (t.accountNumber && t.accountNumber.toLowerCase().includes(acc)) ||
          (t.fromAccountNumber && t.fromAccountNumber.toLowerCase().includes(acc)) ||
          (t.toAccountNumber && t.toAccountNumber.toLowerCase().includes(acc))
      );
    }

    if (type) {
      filtered = filtered.filter(t => t.type.toUpperCase() === type.toUpperCase());
    }

    if (status) {
      filtered = filtered.filter(t => t.status.toUpperCase() === status.toUpperCase());
    }

    if (from) {
      const fromTime = new Date(from).getTime();
      filtered = filtered.filter(t => new Date(t.createdAt).getTime() >= fromTime);
    }

    if (to) {
      const toTime = new Date(to).getTime() + (24 * 60 * 60 * 1000 - 1);
      filtered = filtered.filter(t => new Date(t.createdAt).getTime() <= toTime);
    }

    if (minAmount) {
      const min = Number(minAmount);
      filtered = filtered.filter(t => Number(t.amount) >= min);
    }

    if (maxAmount) {
      const max = Number(maxAmount);
      filtered = filtered.filter(t => Number(t.amount) <= max);
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;

    return {
      transactions: filtered.slice(start, start + limit),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages
      }
    };
  }
}

/**
 * Verify a pending account.
 * PATCH /staff/accounts/:id/verify
 */
export async function verifyAccount(accountId) {
  const url = `/staff/accounts/${accountId}/verify`;
  try {
    const res = await request(url, { method: 'PATCH' });
    fakeStatusOverrides[accountId] = 'ACTIVE';
    return res && res.data ? res.data : res;
  } catch (err) {
    console.warn(`[verifyAccount] Backend call failed (${err.message}). Simulating verify.`);
    fakeStatusOverrides[accountId] = 'ACTIVE';
    return { success: true, status: 'ACTIVE', message: 'Account verified successfully' };
  }
}

/**
 * Block an account.
 * PATCH /staff/accounts/:id/block
 */
export async function blockAccount(accountId) {
  const url = `/staff/accounts/${accountId}/block`;
  try {
    const res = await request(url, { method: 'PATCH' });
    fakeStatusOverrides[accountId] = 'BLOCKED';
    return res && res.data ? res.data : res;
  } catch (err) {
    console.warn(`[blockAccount] Backend call failed (${err.message}). Simulating block.`);
    fakeStatusOverrides[accountId] = 'BLOCKED';
    return { success: true, status: 'BLOCKED', message: 'Account blocked successfully' };
  }
}

/**
 * Unblock an account.
 * PATCH /staff/accounts/:id/unblock
 */
export async function unblockAccount(accountId) {
  const url = `/staff/accounts/${accountId}/unblock`;
  try {
    const res = await request(url, { method: 'PATCH' });
    fakeStatusOverrides[accountId] = 'ACTIVE';
    return res && res.data ? res.data : res;
  } catch (err) {
    console.warn(`[unblockAccount] Backend call failed (${err.message}). Simulating unblock.`);
    fakeStatusOverrides[accountId] = 'ACTIVE';
    return { success: true, status: 'ACTIVE', message: 'Account unblocked successfully' };
  }
}
