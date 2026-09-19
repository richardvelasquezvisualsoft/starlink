import axios from 'axios';

export const API_ROOT_URL = window.location.origin;

const API_BASE_URL = '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

import { useDemoStore } from '../store/demoStore';

// Request interceptor to add JWT token, Demo headers and logging
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

    console.log(`📡 [HTTP SEND] ${config.method?.toUpperCase()} ${config.url}`, {
      data: config.data,
      params: config.params,
      headers: {
        Authorization: config.headers?.Authorization ? 'Bearer ***' : undefined,
        'X-Demo-Role': config.headers?.['X-Demo-Role'],
        'X-Demo-Tenant-Id': config.headers?.['X-Demo-Tenant-Id']
      }
    });
    
    return config;
  },
  (error) => {
    console.error('❌ [HTTP REQUEST ERROR]', error);
    return Promise.reject(error);
  }
);

// Response interceptor to log and handle session expiration (401)
client.interceptors.response.use(
  (response) => {
    console.log(`✅ [HTTP RECV] ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error(`❌ [HTTP RESPONSE ERROR] ${error.config?.url}:`, error.response?.data || error.message);
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

export const buildAvatarUrl = (url?: string, timestamp?: number): string => {
  if (!url) return '';
  let fullUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    fullUrl = `${API_ROOT_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  if (timestamp) {
    const separator = fullUrl.includes('?') ? '&' : '?';
    fullUrl = `${fullUrl}${separator}v=${timestamp}`;
  }
  return fullUrl;
};

export default client;
export { API_BASE_URL };
