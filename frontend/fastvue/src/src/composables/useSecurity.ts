/**
 * Security Composable
 *
 * Centralized security context for Vue components providing:
 * - CSRF token management
 * - XSS detection and input validation
 * - Trust level monitoring
 * - CSP violation reporting
 * - Secure context detection
 *
 * All features are configurable via environment variables (see config/security.config.ts)
 *
 * @example
 * ```ts
 * const { csrfToken, validateInput, isSecureContext, trustLevel, config } = useSecurity();
 *
 * // Check if CSRF is enabled
 * if (config.csrf.enabled) {
 *   console.log('CSRF protection active');
 * }
 *
 * // Validate user input before processing
 * const result = validateInput(userInput);
 * if (!result.safe) {
 *   console.warn('Input contains threats:', result.threats);
 * }
 * ```
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { ComputedRef, Ref } from 'vue';

import { getCsrfToken, CSRF_HEADER_NAME } from '#/utils/csrf';
import {
  detectXSS,
  sanitizeForDisplay,
  stripDangerousContent,
  containsXSS,
  type XSSDetectionResult,
} from '#/utils/xss-protection';
import { useTrustStore } from '#/store/trust';
import {
  securityConfig,
  getSecuritySummary,
  logSecurityEvent,
  type SecurityConfig,
} from '#/config/security.config';

/**
 * Input validation result
 */
export interface InputValidationResult {
  /** Whether the input is safe (no XSS threats detected) */
  safe: boolean;
  /** List of threat categories detected */
  threats: string[];
  /** Risk level: low, medium, or high */
  riskLevel: 'low' | 'medium' | 'high';
  /** Sanitized version of the input (HTML entities encoded) */
  sanitized: string;
}

/**
 * CSP Violation details for reporting
 */
export interface CSPViolation {
  blockedUri: string;
  violatedDirective: string;
  sourceFile: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  documentUri: string;
  timestamp: string;
}

/**
 * Security context returned by useSecurity
 */
export interface SecurityContext {
  // Configuration (from environment variables)
  config: SecurityConfig;
  configSummary: () => Record<string, boolean | string>;

  // CSRF
  csrfToken: Ref<string | null>;
  csrfHeader: ComputedRef<Record<string, string>>;
  refreshCsrfToken: () => void;
  csrfEnabled: boolean;

  // XSS Protection
  validateInput: (input: string) => InputValidationResult;
  sanitize: (input: string) => string;
  stripDangerous: (input: string) => string;
  hasXSS: (input: string) => boolean;
  xssEnabled: boolean;

  // Security Context
  isSecureContext: boolean;
  isProductionMode: boolean;
  trustedTypesSupported: boolean;

  // Trust Level (from Zero Trust store)
  trustLevel: ComputedRef<string>;
  trustScore: ComputedRef<number>;
  riskScore: ComputedRef<number>;
  isHighRisk: ComputedRef<boolean>;
  requiresStepUp: ComputedRef<boolean>;
  zeroTrustEnabled: boolean;

  // CSP Violation Reporting
  reportViolation: (violation: CSPViolation) => Promise<void>;
  recentViolations: Ref<CSPViolation[]>;
  cspEnabled: boolean;

  // Security Checks
  checkSecurityHeaders: () => Promise<Record<string, string | null>>;
  detectSecurityIssues: () => string[];

  // Logging
  logEvent: (type: string, message: string, details?: Record<string, unknown>) => void;
}

/**
 * Security Composable
 *
 * Provides a unified security context for Vue components with CSRF protection,
 * XSS detection, trust level monitoring, and CSP violation reporting.
 */
export function useSecurity(): SecurityContext {
  // ============================================
  // CSRF Token Management
  // ============================================

  const csrfToken = ref<string | null>(getCsrfToken());

  const csrfHeader = computed(() => {
    const token = csrfToken.value;
    return token ? { [CSRF_HEADER_NAME]: token } as Record<string, string> : {} as Record<string, string>;
  });

  const refreshCsrfToken = () => {
    csrfToken.value = getCsrfToken();
  };

  // Watch for cookie changes (e.g., after login)
  let cookieCheckInterval: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    // Periodically check if CSRF token has changed
    cookieCheckInterval = setInterval(() => {
      const newToken = getCsrfToken();
      if (newToken !== csrfToken.value) {
        csrfToken.value = newToken;
      }
    }, 5000); // Check every 5 seconds
  });

  onUnmounted(() => {
    if (cookieCheckInterval) {
      clearInterval(cookieCheckInterval);
    }
  });

  // ============================================
  // XSS Protection
  // ============================================

  const validateInput = (input: string): InputValidationResult => {
    // If XSS protection is disabled, always return safe
    if (!securityConfig.xss.enabled) {
      return {
        safe: true,
        threats: [],
        riskLevel: 'low',
        sanitized: input || '',
      };
    }

    if (!input || typeof input !== 'string') {
      return {
        safe: true,
        threats: [],
        riskLevel: 'low',
        sanitized: '',
      };
    }

    const result: XSSDetectionResult = detectXSS(input);

    // Log XSS attempts if configured
    if (!result.isClean && securityConfig.xss.logAttempts) {
      logSecurityEvent('xss_attempt', 'XSS pattern detected in input', {
        threats: result.threats,
        riskLevel: result.riskLevel,
      });
    }

    return {
      safe: result.isClean,
      threats: result.threats,
      riskLevel: result.riskLevel,
      sanitized: sanitizeForDisplay(input),
    };
  };

  const sanitize = (input: string): string => {
    return sanitizeForDisplay(input);
  };

  const stripDangerous = (input: string): string => {
    return stripDangerousContent(input);
  };

  const hasXSS = (input: string): boolean => {
    return containsXSS(input);
  };

  // ============================================
  // Security Context Detection
  // ============================================

  const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;
  const isProductionMode = import.meta.env.PROD;
  const trustedTypesSupported = typeof window !== 'undefined' && 'trustedTypes' in window;

  // ============================================
  // Trust Level (Zero Trust Integration)
  // ============================================

  const trustStore = useTrustStore();

  const trustLevel = computed(() => trustStore.currentTrustLevel);
  const trustScore = computed(() => trustStore.trustScore);
  const riskScore = computed(() => trustStore.riskScore);
  const isHighRisk = computed(() => trustStore.isHighRisk);
  const requiresStepUp = computed(() => trustStore.requiresStepUp);

  // ============================================
  // CSP Violation Reporting
  // ============================================

  const recentViolations = ref<CSPViolation[]>([]);
  const MAX_STORED_VIOLATIONS = 50;

  const reportViolation = async (violation: CSPViolation): Promise<void> => {
    // Skip if CSP is disabled
    if (!securityConfig.csp.enabled) {
      return;
    }

    // Store locally (limit to prevent memory issues)
    recentViolations.value = [
      violation,
      ...recentViolations.value.slice(0, MAX_STORED_VIOLATIONS - 1),
    ];

    // Report to backend if threat detection is enabled
    if (!securityConfig.threatDetection.reportToBackend) {
      return;
    }

    try {
      await fetch(securityConfig.csp.reportUri, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeader.value,
        },
        body: JSON.stringify({
          blocked_uri: violation.blockedUri,
          violated_directive: violation.violatedDirective,
          source_file: violation.sourceFile,
          line_number: violation.lineNumber,
          column_number: violation.columnNumber,
          document_uri: violation.documentUri,
          timestamp: violation.timestamp,
        }),
      });
    } catch (error) {
      // Silently fail - don't break the app for violation reporting
      if (securityConfig.debugMode) {
        console.error('Failed to report CSP violation:', error);
      }
    }
  };

  // Listen for CSP violations
  const handleCspViolation = (event: SecurityPolicyViolationEvent) => {
    // Skip if CSP is disabled
    if (!securityConfig.csp.enabled) {
      return;
    }

    const violation: CSPViolation = {
      blockedUri: event.blockedURI,
      violatedDirective: event.violatedDirective,
      sourceFile: event.sourceFile || null,
      lineNumber: event.lineNumber || null,
      columnNumber: event.columnNumber || null,
      documentUri: event.documentURI,
      timestamp: new Date().toISOString(),
    };

    if (securityConfig.debugMode || securityConfig.threatDetection.logToConsole) {
      console.warn('[CSP Violation]', violation.violatedDirective, violation.blockedUri);
    }

    reportViolation(violation);
  };

  onMounted(() => {
    document.addEventListener('securitypolicyviolation', handleCspViolation);
  });

  onUnmounted(() => {
    document.removeEventListener('securitypolicyviolation', handleCspViolation);
  });

  // ============================================
  // Security Checks
  // ============================================

  const checkSecurityHeaders = async (): Promise<Record<string, string | null>> => {
    try {
      const response = await fetch(window.location.href, { method: 'HEAD' });
      const headers: Record<string, string | null> = {};

      const securityHeaders = [
        'content-security-policy',
        'strict-transport-security',
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
        'referrer-policy',
        'permissions-policy',
        'cross-origin-embedder-policy',
        'cross-origin-opener-policy',
        'cross-origin-resource-policy',
      ];

      for (const header of securityHeaders) {
        headers[header] = response.headers.get(header);
      }

      return headers;
    } catch {
      return {};
    }
  };

  const detectSecurityIssues = (): string[] => {
    const issues: string[] = [];

    // Check if running in an iframe (potential clickjacking)
    if (typeof window !== 'undefined' && window.self !== window.top) {
      issues.push('Application is running inside an iframe');
    }

    // Check for insecure context
    if (!isSecureContext && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      issues.push('Application is not running in a secure context (HTTPS)');
    }

    // Check for missing CSRF token (only if CSRF is enabled)
    if (securityConfig.csrf.enabled && !csrfToken.value) {
      issues.push('CSRF token is not available');
    }

    // Check trust level (only if Zero Trust is enabled)
    if (securityConfig.zeroTrust.enabled && trustStore.riskScore > 70) {
      issues.push(`High risk score detected: ${trustStore.riskScore}`);
    }

    // Check disabled security features in production
    if (securityConfig.isProduction) {
      if (!securityConfig.csrf.enabled) {
        issues.push('CSRF protection is disabled in production');
      }
      if (!securityConfig.xss.enabled) {
        issues.push('XSS protection is disabled in production');
      }
      if (!securityConfig.csp.enabled) {
        issues.push('CSP is disabled in production');
      }
      if (!securityConfig.cookies.secure) {
        issues.push('Cookies are not marked as secure in production');
      }
    }

    return issues;
  };

  // ============================================
  // Return Security Context
  // ============================================

  return {
    // Configuration
    config: securityConfig,
    configSummary: getSecuritySummary,

    // CSRF
    csrfToken,
    csrfHeader,
    refreshCsrfToken,
    csrfEnabled: securityConfig.csrf.enabled,

    // XSS Protection
    validateInput,
    sanitize,
    stripDangerous,
    hasXSS,
    xssEnabled: securityConfig.xss.enabled,

    // Security Context
    isSecureContext,
    isProductionMode,
    trustedTypesSupported,

    // Trust Level
    trustLevel,
    trustScore,
    riskScore,
    isHighRisk,
    requiresStepUp,
    zeroTrustEnabled: securityConfig.zeroTrust.enabled,

    // CSP Violation Reporting
    reportViolation,
    recentViolations,
    cspEnabled: securityConfig.csp.enabled,

    // Security Checks
    checkSecurityHeaders,
    detectSecurityIssues,

    // Logging
    logEvent: logSecurityEvent,
  };
}

/**
 * Quick validation helper for form inputs
 *
 * @example
 * ```ts
 * import { isInputSafe } from '#/composables/useSecurity';
 *
 * if (!isInputSafe(userInput)) {
 *   showError('Invalid input detected');
 * }
 * ```
 */
export function isInputSafe(input: string): boolean {
  return !containsXSS(input);
}

/**
 * Vue directive for auto-sanitizing input
 *
 * @example
 * ```vue
 * <input v-model="value" v-sanitize />
 * ```
 */
export const vSanitize = {
  mounted(el: HTMLInputElement) {
    el.addEventListener('input', () => {
      const original = el.value;
      const sanitized = stripDangerousContent(original);
      if (original !== sanitized) {
        el.value = sanitized;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  },
};
