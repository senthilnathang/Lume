/**
 * Request Provider - Dependency Injection for Request Client
 *
 * This module provides a decoupled way to inject store dependencies
 * into the request client, making it more modular and testable.
 */

export interface RequestAuthProvider {
  /** Get the current access token */
  getAccessToken: () => string | null;
  /** Set the access token */
  setAccessToken: (token: string | null) => void;
  /** Check if access has been verified */
  isAccessChecked: () => boolean;
  /** Set login expired state */
  setLoginExpired: (expired: boolean) => void;
  /** Get login expired state */
  isLoginExpired: () => boolean;
  /** Perform logout */
  logout: () => Promise<void>;
}

export interface RequestCompanyProvider {
  /** Get the selected company ID for multi-tenancy */
  getSelectedCompanyId: () => number | null;
}

export interface RequestTrustProvider {
  /** Update trust level from response headers */
  updateTrustFromHeaders: (headers: Headers | Record<string, string>) => void;
  /** Set step-up authentication required state */
  setStepUpRequired: (
    required: boolean,
    reason?: string,
    method?: string,
    sessionId?: string,
  ) => void;
}

export interface RequestProviderConfig {
  auth: RequestAuthProvider;
  company: RequestCompanyProvider;
  trust: RequestTrustProvider;
}

let _provider: RequestProviderConfig | null = null;
let _initialized = false;

/**
 * Initialize the request provider with store implementations
 * This should be called during app bootstrap, after stores are available
 */
export function initializeRequestProvider(config: RequestProviderConfig): void {
  _provider = config;
  _initialized = true;
}

/**
 * Get the request provider
 * Throws if not initialized
 */
export function getRequestProvider(): RequestProviderConfig {
  if (!_initialized || !_provider) {
    throw new Error(
      'Request provider not initialized. Call initializeRequestProvider() during app bootstrap.',
    );
  }
  return _provider;
}

/**
 * Check if provider is initialized (useful for interceptors that may run before full init)
 */
export function isProviderInitialized(): boolean {
  return _initialized;
}

/**
 * Reset provider (mainly for testing)
 */
export function resetRequestProvider(): void {
  _provider = null;
  _initialized = false;
}

/**
 * Safe getter for auth provider (returns null if not initialized)
 */
export function getAuthProvider(): RequestAuthProvider | null {
  return _provider?.auth ?? null;
}

/**
 * Safe getter for company provider (returns null if not initialized)
 */
export function getCompanyProvider(): RequestCompanyProvider | null {
  return _provider?.company ?? null;
}

/**
 * Safe getter for trust provider (returns null if not initialized)
 */
export function getTrustProvider(): RequestTrustProvider | null {
  return _provider?.trust ?? null;
}
