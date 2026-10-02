import client from './client';

export async function getNotifications() {
  return await client.get('/notifications');
}

export async function markAsRead(id) {
  return await client.patch(`/notifications/${id}/read`);
}

export async function markAllAsRead() {
  return await client.patch('/notifications/read-all');
}
