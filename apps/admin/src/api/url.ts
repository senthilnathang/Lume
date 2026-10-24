/** Versioned NestJS API endpoint, shared by Axios and native fetch callers. */
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v2';

export function apiUrl(path: string): string {
  // Older shared views include /api in the path; the configured base owns it.
  const relative = path.replace(/^\/api(?:\/v2)?(?=\/|$)/, '');
  return `${API_BASE_URL.replace(/\/$/, '')}/${relative.replace(/^\//, '')}`;
}
