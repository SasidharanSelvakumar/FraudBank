import client from './client';

export async function createAccount({ branchId }) {
  return await client.post('/accounts', { branchId });
}

export async function getMyAccount() {
  return await client.get('/accounts/me');
}

export async function deposit(accountId, amount) {
  return await client.post(`/accounts/${accountId}/deposit`, { amount });
}

export async function withdraw(accountId, amount) {
  return await client.post(`/accounts/${accountId}/withdraw`, { amount });
}

export async function getTransactions(accountId, { page = 1, limit = 10, type = '', from = '', to = '' } = {}) {
  const query = new URLSearchParams();
  query.set('page', String(page));
  query.set('limit', String(limit));
  if (type) query.set('type', type);
  if (from) query.set('from', from);
  if (to) query.set('to', to);

  return await client.get(`/accounts/${accountId}/transactions?${query.toString()}`);
}

export async function getStatement(accountId, { from = '', to = '' } = {}) {
  const query = new URLSearchParams();
  if (from) query.set('from', from);
  if (to) query.set('to', to);

  return await client.get(`/accounts/${accountId}/statement?${query.toString()}`);
}
