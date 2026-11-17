import axios from 'axios';

const baseURL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

const api = axios.create({ baseURL });

// Attach admin token for admin requests
api.interceptors.request.use((config) => {
  // For bid submissions, use supplier token
  const supplierToken = localStorage.getItem('supplier_token');
  const adminToken = localStorage.getItem('admin_token');

  if (config.url?.includes('/bid') && supplierToken) {
    config.headers['Authorization'] = `Bearer ${supplierToken}`;
  } else if (adminToken && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${adminToken}`;
  }
  return config;
});

export default api;
