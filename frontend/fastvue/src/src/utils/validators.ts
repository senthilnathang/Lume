/**
 * Form validation utilities for HRMS application
 * Compatible with Ant Design Vue form rules
 */

import type { Rule } from 'ant-design-vue/es/form';

/**
 * Required field validator
 */
export function required(message = 'This field is required'): Rule {
  return {
    required: true,
    message,
    trigger: 'blur',
  };
}

/**
 * Email validator
 */
export function email(message = 'Please enter a valid email address'): Rule {
  return {
    type: 'email',
    message,
    trigger: 'blur',
  };
}

/**
 * Min length validator
 */
export function minLength(min: number, message?: string): Rule {
  return {
    min,
    message: message || `Must be at least ${min} characters`,
    trigger: 'blur',
  };
}

/**
 * Max length validator
 */
export function maxLength(max: number, message?: string): Rule {
  return {
    max,
    message: message || `Must be no more than ${max} characters`,
    trigger: 'blur',
  };
}

/**
 * Length range validator
 */
export function lengthRange(min: number, max: number, message?: string): Rule {
  return {
    min,
    max,
    message: message || `Must be between ${min} and ${max} characters`,
    trigger: 'blur',
  };
}

/**
 * Pattern validator
 */
export function pattern(regex: RegExp, message: string): Rule {
  return {
    pattern: regex,
    message,
    trigger: 'blur',
  };
}

/**
 * Phone number validator
 */
export function phone(message = 'Please enter a valid phone number'): Rule {
  return {
    pattern: /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/,
    message,
    trigger: 'blur',
  };
}

/**
 * URL validator
 */
export function url(message = 'Please enter a valid URL'): Rule {
  return {
    type: 'url',
    message,
    trigger: 'blur',
  };
}

/**
 * Number validator
 */
export function number(message = 'Please enter a valid number'): Rule {
  return {
    type: 'number',
    message,
    trigger: 'blur',
    transform: (value: any) => (value === '' ? undefined : Number(value)),
  };
}

/**
 * Integer validator
 */
export function integer(message = 'Please enter a valid integer'): Rule {
  return {
    type: 'integer',
    message,
    trigger: 'blur',
    transform: (value: any) => (value === '' ? undefined : Number(value)),
  };
}

/**
 * Min value validator
 */
export function minValue(min: number, message?: string): Rule {
  return {
    type: 'number',
    min,
    message: message || `Must be at least ${min}`,
    trigger: 'blur',
    transform: (value: any) => (value === '' ? undefined : Number(value)),
  };
}

/**
 * Max value validator
 */
export function maxValue(max: number, message?: string): Rule {
  return {
    type: 'number',
    max,
    message: message || `Must be no more than ${max}`,
    trigger: 'blur',
    transform: (value: any) => (value === '' ? undefined : Number(value)),
  };
}

/**
 * Range validator for numbers
 */
export function range(min: number, max: number, message?: string): Rule {
  return {
    type: 'number',
    min,
    max,
    message: message || `Must be between ${min} and ${max}`,
    trigger: 'blur',
    transform: (value: any) => (value === '' ? undefined : Number(value)),
  };
}

/**
 * Password validator (min 8 chars, at least one letter and one number)
 */
export function password(message = 'Password must be at least 8 characters with letters and numbers'): Rule {
  return {
    validator: (_rule: any, value: string) => {
      if (!value) return Promise.resolve();
      if (value.length < 8) {
        return Promise.reject(new Error(message));
      }
      if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
        return Promise.reject(new Error(message));
      }
      return Promise.resolve();
    },
    trigger: 'blur',
  };
}

/**
 * Strong password validator
 */
export function strongPassword(
  message = 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
): Rule {
  return {
    validator: (_rule: any, value: string) => {
      if (!value) return Promise.resolve();
      const hasUpperCase = /[A-Z]/.test(value);
      const hasLowerCase = /[a-z]/.test(value);
      const hasNumber = /\d/.test(value);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
      const isLongEnough = value.length >= 8;

      if (!isLongEnough || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial) {
        return Promise.reject(new Error(message));
      }
      return Promise.resolve();
    },
    trigger: 'blur',
  };
}

/**
 * Confirm password validator
 */
export function confirmPassword(getPassword: () => string, message = 'Passwords do not match'): Rule {
  return {
    validator: (_rule: any, value: string) => {
      if (!value) return Promise.resolve();
      if (value !== getPassword()) {
        return Promise.reject(new Error(message));
      }
      return Promise.resolve();
    },
    trigger: 'blur',
  };
}

/**
 * Date validator
 */
export function date(message = 'Please enter a valid date'): Rule {
  return {
    type: 'date',
    message,
    trigger: 'change',
  };
}

/**
 * Date range validator (end date must be after start date)
 */
export function dateAfter(
  getStartDate: () => Date | string | null,
  message = 'End date must be after start date',
): Rule {
  return {
    validator: (_rule: any, value: Date | string) => {
      if (!value) return Promise.resolve();
      const startDate = getStartDate();
      if (!startDate) return Promise.resolve();

      const start = new Date(startDate);
      const end = new Date(value);

      if (end <= start) {
        return Promise.reject(new Error(message));
      }
      return Promise.resolve();
    },
    trigger: 'change',
  };
}

/**
 * Employee ID validator (alphanumeric, 4-20 chars)
 */
export function employeeId(message = 'Employee ID must be 4-20 alphanumeric characters'): Rule {
  return {
    pattern: /^[a-zA-Z0-9]{4,20}$/,
    message,
    trigger: 'blur',
  };
}

/**
 * Badge ID validator
 */
export function badgeId(message = 'Badge ID must be alphanumeric'): Rule {
  return {
    pattern: /^[a-zA-Z0-9-]+$/,
    message,
    trigger: 'blur',
  };
}

/**
 * Salary validator (positive number with up to 2 decimal places)
 */
export function salary(message = 'Please enter a valid salary amount'): Rule {
  return {
    validator: (_rule: any, value: number | string) => {
      if (value === '' || value === null || value === undefined) {
        return Promise.resolve();
      }
      const num = Number(value);
      if (isNaN(num) || num < 0) {
        return Promise.reject(new Error(message));
      }
      return Promise.resolve();
    },
    trigger: 'blur',
  };
}

/**
 * Create custom async validator
 */
export function asyncValidator(
  validateFn: (value: any) => Promise<boolean>,
  message: string,
): Rule {
  return {
    validator: async (_rule: any, value: any) => {
      if (!value) return Promise.resolve();
      const isValid = await validateFn(value);
      if (!isValid) {
        return Promise.reject(new Error(message));
      }
      return Promise.resolve();
    },
    trigger: 'blur',
  };
}

/**
 * Array of validators
 */
export function combine(...rules: Rule[]): Rule[] {
  return rules;
}

/**
 * Common field rules
 */
export const commonRules = {
  email: [required('Email is required'), email()],
  password: [required('Password is required'), password()],
  phone: [phone()],
  name: [required('Name is required'), minLength(2), maxLength(100)],
  employeeId: [required('Employee ID is required'), employeeId()],
  badgeId: [badgeId()],
  salary: [required('Salary is required'), salary()],
  description: [maxLength(500)],
  url: [url()],
};

/**
 * HRMS-specific validation rules
 */
export const hrmsRules = {
  // Employee form rules
  employee: {
    first_name: [required('First name is required'), minLength(2), maxLength(50)],
    last_name: [required('Last name is required'), minLength(2), maxLength(50)],
    email: [required('Email is required'), email()],
    phone: [phone()],
    employee_id: [required('Employee ID is required'), employeeId()],
    badge_id: [badgeId()],
    date_of_birth: [required('Date of birth is required')],
    date_of_joining: [required('Date of joining is required')],
    department_id: [required('Department is required')],
    designation_id: [required('Designation is required')],
  },

  // Leave request rules
  leave: {
    leave_type_id: [required('Leave type is required')],
    start_date: [required('Start date is required')],
    end_date: [required('End date is required')],
    reason: [required('Reason is required'), minLength(10), maxLength(500)],
  },

  // Attendance rules
  attendance: {
    employee_id: [required('Employee is required')],
    date: [required('Date is required')],
  },

  // Asset rules
  asset: {
    name: [required('Asset name is required'), minLength(2), maxLength(100)],
    asset_tag: [required('Asset tag is required')],
    category_id: [required('Category is required')],
    purchase_date: [required('Purchase date is required')],
    purchase_cost: [salary('Please enter a valid purchase cost')],
  },

  // Job posting rules
  job: {
    title: [required('Job title is required'), minLength(5), maxLength(100)],
    department_id: [required('Department is required')],
    description: [required('Description is required'), minLength(50)],
    requirements: [required('Requirements are required'), minLength(50)],
  },

  // Login rules
  login: {
    username: [required('Username is required')],
    password: [required('Password is required')],
  },
};
