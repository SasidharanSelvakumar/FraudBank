import client from './client';

export async function getBeneficiaries() {
  return await client.get('/beneficiaries');
}

export async function addBeneficiary({ accountNumber, name }) {
  return await client.post('/beneficiaries', { accountNumber, name });
}

export async function deleteBeneficiary(id) {
  return await client.delete(`/beneficiaries/${id}`);
}
