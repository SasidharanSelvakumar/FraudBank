const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Core API request function
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    throw new Error(`Network error connecting to API server at ${BASE_URL}: ${netErr.message}`);
  }

  // Handle 401 Unauthorized
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      window.location.href = '/login';
    }
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error(`Server returned non-JSON response (status ${response.status})`);
  }

  // Check if API response represents success
  if (!response.ok || (data && data.success === false)) {
    const errorMsg = (data && data.message) ? data.message : `HTTP Error ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

const client = (endpoint, options) => request(endpoint, options);

client.request = request;
client.get = (url, options = {}) => request(url, { ...options, method: 'GET' });
client.post = (url, body, options = {}) => request(url, { ...options, method: 'POST', body });
client.patch = (url, body, options = {}) => request(url, { ...options, method: 'PATCH', body });
client.put = (url, body, options = {}) => request(url, { ...options, method: 'PUT', body });
client.delete = (url, options = {}) => request(url, { ...options, method: 'DELETE' });

export default client;
export { request };
