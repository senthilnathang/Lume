export function createClient({ baseUrl, apiKey, fetchImpl = fetch } = {}) {
  const base = String(baseUrl || process.env.LUME_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const key = apiKey || process.env.LUME_API_KEY || '';

  async function request(path, options = {}) {
    const res = await fetchImpl(`${base}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Lume API ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  return {
    listEntities: () => request('/api/base/entities'),
    schemaGraph: () => request('/api/base/entities/schema/graph'),
    listRecords: (entityId, params = {}) => {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)])
      ).toString();
      return request(`/api/base/entities/${entityId}/records${qs ? `?${qs}` : ''}`);
    },
    getRecord: (entityId, recordId) => request(`/api/base/entities/${entityId}/records/${recordId}`),
    createRecord: (entityId, data) => request(`/api/base/entities/${entityId}/records`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  };
}

export default { createClient };
