/**
 * Security API
 * API for security settings: API keys, IP access, sessions, logs
 */
import { get, post, put, del } from './request';

export interface ApiKey {
  id: number;
  name: string;
  key?: string;
  prefix: string;
  userId?: number;
  expiresAt?: string;
  lastUsedAt?: string;
  status: 'active' | 'inactive' | 'expired';
  scopes: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Session {
  id: number;
  userId: number;
  token: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: string;
  lastActivityAt?: string;
  status: 'active' | 'expired' | 'revoked';
  createdAt?: string;
}

export interface IpAccessRule {
  id: number;
  ipAddress: string;
  description?: string;
  type: 'whitelist' | 'blacklist';
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface SecurityLog {
  id: number;
  userId?: number;
  event: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  status: 'success' | 'failed' | 'blocked';
  createdAt?: string;
}

// API Keys
export function getApiKeys(): Promise<ApiKey[]> {
  return get<ApiKey[]>('/base_security/api-keys');
}

export function createApiKey(data: { name: string; scopes?: string[] }): Promise<ApiKey> {
  return post<ApiKey>('/base_security/api-keys', data);
}

export function revokeApiKey(id: number): Promise<void> {
  return del(`/base_security/api-keys/${id}`);
}

// IP Access
export function getIpAccessRules(): Promise<IpAccessRule[]> {
  return get<IpAccessRule[]>('/base_security/ip-access');
}

export function createIpAccessRule(data: { ipAddress: string; description?: string; type: string }): Promise<IpAccessRule> {
  return post<IpAccessRule>('/base_security/ip-access', data);
}

export function updateIpAccessRule(id: number, data: Partial<IpAccessRule>): Promise<IpAccessRule> {
  return put<IpAccessRule>(`/base_security/ip-access/${id}`, data);
}

export function deleteIpAccessRule(id: number): Promise<void> {
  return del(`/base_security/ip-access/${id}`);
}

// Sessions
export function getSessions(): Promise<Session[]> {
  return get<Session[]>('/base_security/sessions');
}

export function revokeSession(id: number): Promise<void> {
  return del(`/base_security/sessions/${id}`);
}

// Security Logs
export function getSecurityLogs(): Promise<SecurityLog[]> {
  return get<SecurityLog[]>('/base_security/logs');
}
