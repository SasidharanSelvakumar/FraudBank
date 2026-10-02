import client from './client';

export async function transfer({ fromAccountId, beneficiaryId, toAccountId, amount, idempotencyKey }) {
  return await client.post('/transfers', {
    fromAccountId,
    beneficiaryId,
    toAccountId,
    amount,
    idempotencyKey
  });
}

export async function getTransfer(id) {
  return await client.get(`/transfers/${id}`);
}
