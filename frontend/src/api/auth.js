import client from './client';

export async function login({ email, password }) {
  return await client.post('/auth/login', { email, password });
}

export async function register({ name, email, password }) {
  return await client.post('/auth/register', { name, email, password });
}

export async function getMe() {
  return await client.get('/auth/me');
}
