/**
 * Error handling utilities for HRMS application
 */

import { notification, message } from 'ant-design-vue';

// import { $t } from '#/locales';

export interface ApiError {
  status?: number;
  code?: string;
  message?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

/**
 * Error types for categorization
 */
export enum ErrorType {
  NETWORK = 'network',
  AUTH = 'auth',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  FORBIDDEN = 'forbidden',
  SERVER = 'server',
  UNKNOWN = 'unknown',
}

/**
 * Parse API error response
 */
export function parseApiError(error: any): ApiError {
  if (error?.response?.data) {
    const data = error.response.data;
    return {
      status: error.response.status,
      code: data.code,
      message: data.message || data.error || data.detail,
      detail: data.detail,
      errors: data.errors,
    };
  }

  if (error?.message) {
    return {
      message: error.message,
    };
  }

  return {
    message: 'An unexpected error occurred',
  };
}

/**
 * Determine error type from status code
 */
export function getErrorType(status?: number): ErrorType {
  if (!status) return ErrorType.NETWORK;

  switch (status) {
    case 400:
      return ErrorType.VALIDATION;
    case 401:
      return ErrorType.AUTH;
    case 403:
      return ErrorType.FORBIDDEN;
    case 404:
      return ErrorType.NOT_FOUND;
    case 500:
    case 502:
    case 503:
      return ErrorType.SERVER;
    default:
      return ErrorType.UNKNOWN;
  }
}

/**
 * Get user-friendly error message based on error type
 */
export function getErrorMessage(type: ErrorType, apiError?: ApiError): string {
  // Use API error message if available
  if (apiError?.message) {
    return apiError.message;
  }

  switch (type) {
    case ErrorType.NETWORK:
      return 'Network error. Please check your connection.';
    case ErrorType.AUTH:
      return 'Your session has expired. Please login again.';
    case ErrorType.VALIDATION:
      return 'Please check your input and try again.';
    case ErrorType.NOT_FOUND:
      return 'The requested resource was not found.';
    case ErrorType.FORBIDDEN:
      return 'You do not have permission to perform this action.';
    case ErrorType.SERVER:
      return 'Server error. Please try again later.';
    default:
      return 'An unexpected error occurred.';
  }
}

/**
 * Show error notification
 */
export function showErrorNotification(error: any, title?: string): void {
  const apiError = parseApiError(error);
  const errorType = getErrorType(apiError.status);
  const errorMessage = getErrorMessage(errorType, apiError);

  notification.error({
    message: title || getErrorTitle(errorType),
    description: errorMessage,
    duration: 5,
  });
}

/**
 * Show error message (toast)
 */
export function showErrorMessage(error: any): void {
  const apiError = parseApiError(error);
  const errorType = getErrorType(apiError.status);
  const errorMessage = getErrorMessage(errorType, apiError);

  message.error(errorMessage);
}

/**
 * Get error title based on type
 */
function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case ErrorType.NETWORK:
      return 'Network Error';
    case ErrorType.AUTH:
      return 'Authentication Error';
    case ErrorType.VALIDATION:
      return 'Validation Error';
    case ErrorType.NOT_FOUND:
      return 'Not Found';
    case ErrorType.FORBIDDEN:
      return 'Access Denied';
    case ErrorType.SERVER:
      return 'Server Error';
    default:
      return 'Error';
  }
}

/**
 * Format validation errors from API response
 */
export function formatValidationErrors(errors?: Record<string, string[]>): string {
  if (!errors) return '';

  return Object.entries(errors)
    .map(([field, messages]) => {
      const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
      return `${fieldName}: ${messages.join(', ')}`;
    })
    .join('\n');
}

/**
 * Handle async operation with error handling
 */
export async function handleAsync<T>(
  promise: Promise<T>,
  options?: {
    showError?: boolean;
    errorTitle?: string;
    rethrow?: boolean;
  },
): Promise<[T | null, ApiError | null]> {
  const { showError = true, errorTitle, rethrow = false } = options || {};

  try {
    const result = await promise;
    return [result, null];
  } catch (error) {
    const apiError = parseApiError(error);

    if (showError) {
      showErrorNotification(error, errorTitle);
    }

    if (rethrow) {
      throw error;
    }

    return [null, apiError];
  }
}

/**
 * Create a retry wrapper for failed operations
 */
export function createRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    delay?: number;
    onRetry?: (attempt: number, error: any) => void;
  },
): () => Promise<T> {
  const { maxRetries = 3, delay = 1000, onRetry } = options || {};

  return async function retry(): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        onRetry?.(attempt, error);

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay * attempt));
        }
      }
    }

    throw lastError;
  };
}

/**
 * Global error handler for Vue app
 */
export function setupGlobalErrorHandler(app: any): void {
  app.config.errorHandler = (error: any, instance: any, info: string) => {
    console.error('Global Vue error:', error);
    console.error('Component:', instance);
    console.error('Info:', info);

    // Don't show notification for render errors to avoid spam
    if (!info.includes('render')) {
      showErrorNotification(error, 'Application Error');
    }
  };

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Only show notification for API errors
    if (event.reason?.response?.status) {
      showErrorNotification(event.reason);
    }
  });
}
