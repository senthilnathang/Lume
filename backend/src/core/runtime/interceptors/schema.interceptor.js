/**
 * @fileoverview SchemaInterceptor [Stage 30] - Request payload validation against entity schema
 */

import logger from '../../services/logger.js';

class SchemaInterceptor {
  /**
   * Validate request data against entity schema
   * @param {OperationRequest} request - Operation request
   * @param {InterceptorContext} context - Execution context
   * @returns {Promise<InterceptorResult>}
   */
  static async process(request, context) {
    try {
      const errors = [];

      // Only validate for mutation actions
      if (!['create', 'update', 'bulk_create'].includes(request.action)) {
        return {};
      }

      if (!request.data) {
        return {};
      }

      // Validate each field
      for (const field of context.entity.fields || []) {
        const value = request.data[field.name];

        // Required validation
        if (field.required && (value === null || value === undefined || value === '')) {
          errors.push({
            field: field.name,
            message: `Field '${field.label}' is required`,
            code: 'REQUIRED',
          });
          continue;
        }

        // Skip if not provided and not required
        if (value === null || value === undefined) {
          continue;
        }

        // Type validation
        const typeError = this.validateType(field, value);
        if (typeError) {
          errors.push({
            field: field.name,
            message: typeError,
            code: 'INVALID_TYPE',
          });
          continue;
        }

        // Custom validation rules
        if (field.validation && Array.isArray(field.validation)) {
          for (const rule of field.validation) {
            const ruleError = this.validateRule(field, value, rule);
            if (ruleError) {
              errors.push({
                field: field.name,
                message: ruleError,
                code: rule.rule.toUpperCase(),
              });
            }
          }
        }
      }

      if (errors.length > 0) {
        logger.warn(`[SchemaInterceptor] Validation failed: ${errors.map(e => e.field).join(', ')}`);
        return {
          abort: true,
          abortReason: 'Validation error',
          result: {
            success: false,
            errors,
          },
        };
      }

      logger.debug('[SchemaInterceptor] Validation passed');
      return {};
    } catch (error) {
      logger.error('[SchemaInterceptor] Error:', error.message);
      return {
        abort: true,
        abortReason: `Schema validation error: ${error.message}`,
      };
    }
  }

  /**
   * Validate field type
   * @private
   * @param {FieldDefinition} field - Field definition
   * @param {*} value - Field value
   * @returns {string|null} Error message or null
   */
  static validateType(field, value) {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
      case 'color':
      case 'rich-text':
        if (typeof value !== 'string') return `Expected string, got ${typeof value}`;
        break;

      case 'number':
        if (typeof value !== 'number') return `Expected number, got ${typeof value}`;
        break;

      case 'boolean':
        if (typeof value !== 'boolean') return `Expected boolean, got ${typeof value}`;
        break;

      case 'date':
        if (!(value instanceof Date) && typeof value !== 'string') {
          return `Expected date, got ${typeof value}`;
        }
        break;

      case 'datetime':
        if (!(value instanceof Date) && typeof value !== 'string') {
          return `Expected datetime, got ${typeof value}`;
        }
        break;

      case 'select':
      case 'multi-select':
      case 'relation':
        // Allow most values for selects
        break;

      default:
        break;
    }

    return null;
  }

  /**
   * Validate field against a validation rule
   * @private
   * @param {FieldDefinition} field - Field definition
   * @param {*} value - Field value
   * @param {ValidationRule} rule - Validation rule
   * @returns {string|null} Error message or null
   */
  static validateRule(field, value, rule) {
    switch (rule.rule) {
      case 'min_length':
        if (typeof value === 'string' && value.length < rule.value) {
          return `Minimum length is ${rule.value}`;
        }
        break;

      case 'max_length':
        if (typeof value === 'string' && value.length > rule.value) {
          return `Maximum length is ${rule.value}`;
        }
        break;

      case 'min':
        if (typeof value === 'number' && value < rule.value) {
          return `Minimum value is ${rule.value}`;
        }
        break;

      case 'max':
        if (typeof value === 'number' && value > rule.value) {
          return `Maximum value is ${rule.value}`;
        }
        break;

      case 'enum':
        if (Array.isArray(rule.value) && !rule.value.includes(value)) {
          return `Must be one of: ${rule.value.join(', ')}`;
        }
        break;

      case 'email':
        if (typeof value === 'string' && !this.isValidEmail(value)) {
          return 'Invalid email format';
        }
        break;

      case 'url':
        if (typeof value === 'string' && !this.isValidUrl(value)) {
          return 'Invalid URL format';
        }
        break;

      case 'regex':
        if (typeof value === 'string' && !new RegExp(rule.value).test(value)) {
          return rule.message || `Does not match pattern ${rule.value}`;
        }
        break;

      default:
        break;
    }

    return null;
  }

  /**
   * Validate email format
   * @private
   * @param {string} email - Email to validate
   * @returns {boolean}
   */
  static isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  /**
   * Validate URL format
   * @private
   * @param {string} url - URL to validate
   * @returns {boolean}
   */
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

export default SchemaInterceptor;
