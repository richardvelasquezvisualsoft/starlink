import axios from 'axios';

export const API_ROOT_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8050'
  : window.location.origin;

const API_BASE_URL = `${API_ROOT_URL}/api`;

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

import { useDemoStore } from '../store/demoStore';

// Request interceptor to add JWT token and Demo headers
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('starlink_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Inject Demo headers based on architectural scopes (URL path)
    const { role: storeRole, tenantId: storeTenantId } = useDemoStore.getState();
    const pathname = window.location.pathname;

    let computedRole = storeRole;
    let computedTenantId = storeTenantId;

    if (pathname.startsWith('/reseller/clientes/')) {
      const parts = pathname.split('/');
      // e.g. /reseller/clientes/1/dashboard -> parts = ['', 'reseller', 'clientes', '1', 'dashboard']
      if (parts.length >= 4 && !isNaN(Number(parts[3]))) {
        computedRole = 'RESELLER';
        computedTenantId = Number(parts[3]);
      }
    } else if (pathname.startsWith('/reseller')) {
      computedRole = 'RESELLER';
      computedTenantId = null;
    } else if (pathname.startsWith('/cliente')) {
      computedRole = 'CLIENTE';
      computedTenantId = storeTenantId; // Derived from auth/login
    }

    if (config.headers) {
      config.headers['X-Demo-Role'] = computedRole;
      if (computedTenantId !== null) {
        config.headers['X-Demo-Tenant-Id'] = computedTenantId.toString();
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle session expiration (401)
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('starlink_token');
      localStorage.removeItem('starlink_user');
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;
export { API_BASE_URL };
