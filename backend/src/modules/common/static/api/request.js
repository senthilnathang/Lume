/**
 * Runtime Request Client for Gawdesy
 *
 * A simplified request client that works at runtime for dynamically loaded views.
 */

import { message, notification } from 'ant-design-vue';

const API_BASE_URL = '/api';

function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

let _cachedToken = null;
let _cachedTokenTs = 0;
const CACHE_TTL = 30_000;

function getAuthToken() {
  const now = Date.now();
  if (_cachedToken && (now - _cachedTokenTs) < CACHE_TTL) {
    return _cachedToken;
  }

  _cachedToken = localStorage.getItem('accessToken');
  _cachedTokenTs = now;
  return _cachedToken;
}

export function clearAuthCache() {
  _cachedToken = null;
  _cachedTokenTs = 0;
  _responseCache.clear();
}

if (typeof window !== 'undefined') {
  window.addEventListener('auth:expired', clearAuthCache);
}

const _responseCache = new Map();
const RESPONSE_CACHE_TTL = 15_000;
const MAX_CACHE_ENTRIES = 100;

function getCacheKey(url) {
  return url;
}

function getCachedResponse(url) {
  const entry = _responseCache.get(getCacheKey(url));
  if (!entry) return null;
  if (Date.now() - entry.ts > RESPONSE_CACHE_TTL) {
    _responseCache.delete(getCacheKey(url));
    return null;
  }
  return entry.data;
}

function setCachedResponse(url, data) {
  if (_responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = _responseCache.keys().next().value;
    _responseCache.delete(oldest);
  }
  _responseCache.set(getCacheKey(url), { data, ts: Date.now() });
}

export function invalidateCache(urlPrefix) {
  if (!urlPrefix) {
    _responseCache.clear();
    return;
  }
  for (const key of _responseCache.keys()) {
    if (key.includes(urlPrefix)) {
      _responseCache.delete(key);
    }
  }
}

function buildUrl(endpoint, params) {
  const url = new URL(`${window.location.origin}${API_BASE_URL}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => url.searchParams.append(key, String(v)));
        } else {
          url.searchParams.append(key, String(value));
        }
      }
    });
  }

  return url.toString();
}

async function request(method, endpoint, options = {}) {
  const { data, params, headers: customHeaders = {}, cache: useCache = true } = options;

  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Request-ID': generateRequestId(),
    'X-Requested-With': 'XMLHttpRequest',
    ...customHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = buildUrl(endpoint, params);

  if (method === 'GET' && useCache) {
    const cached = getCachedResponse(url);
    if (cached) return cached;
  }

  const fetchOptions = {
    method,
    headers,
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    fetchOptions.body = JSON.stringify(data);
  }

  if (method !== 'GET') {
    invalidateCache(endpoint.split('?')[0]);
  }

  try {
    const response = await fetch(url, fetchOptions);

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
      notification.warning({
        message: 'Too Many Requests',
        description: `Please wait ${retryAfter} seconds before trying again.`,
        duration: Math.min(retryAfter, 10),
      });
      throw new Error('Rate limit exceeded');
    }

    if (response.status === 204) {
      return null;
    }

    let responseData;
    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (method === 'GET' && response.ok && useCache && responseData) {
      setCachedResponse(url, responseData);
    }

    if (!response.ok) {
      let errorMessage = '';

      if (typeof responseData?.detail === 'string') {
        errorMessage = responseData.detail;
      } else if (Array.isArray(responseData?.detail)) {
        errorMessage = responseData.detail.map(err => err.msg || err.message).join(', ');
      } else if (responseData?.error?.message) {
        errorMessage = responseData.error.message;
      } else if (responseData?.message) {
        errorMessage = responseData.message;
      } else {
        errorMessage = `Request failed with status ${response.status}`;
      }

      if (response.status !== 401) {
        message.error(errorMessage);
      }

      if (response.status === 401) {
        clearAuthCache();
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }

      const error = new Error(errorMessage);
      error.status = response.status;
      error.response = { data: responseData, status: response.status };
      throw error;
    }

    return responseData;
  } catch (error) {
    if (!error.status) {
      console.error('Network error:', error);
      message.error('Network error. Please check your connection.');
    }
    throw error;
  }
}

export const requestClient = {
  async get(url, options = {}) {
    return request('GET', url, options);
  },

  async post(url, data, options = {}) {
    return request('POST', url, { ...options, data });
  },

  async put(url, data, options = {}) {
    return request('PUT', url, { ...options, data });
  },

  async patch(url, data, options = {}) {
    return request('PATCH', url, { ...options, data });
  },

  async delete(url, options = {}) {
    return request('DELETE', url, options);
  },
};

export default requestClient;
