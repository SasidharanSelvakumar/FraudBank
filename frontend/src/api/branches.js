import client from './client';

export async function getBranches() {
  return await client.get('/branches');
}
