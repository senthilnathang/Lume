/**
 * Unit tests for the validators utility module.
 */
import { describe, expect, it, vi } from 'vitest';

import {
  required,
  email,
  minLength,
  maxLength,
  lengthRange,
  pattern,
  phone,
  url,
  number,
  integer,
  minValue,
  maxValue,
  range,
  password,
  strongPassword,
  confirmPassword,
  date,
  dateAfter,
  employeeId,
  badgeId,
  salary,
  asyncValidator,
  combine,
  commonRules,
  hrmsRules,
} from './validators';

describe('required', () => {
  it('should create required rule with default message', () => {
    const rule = required();
    expect(rule.required).toBe(true);
    expect(rule.message).toBe('This field is required');
    expect(rule.trigger).toBe('blur');
  });

  it('should create required rule with custom message', () => {
    const rule = required('Name is required');
    expect(rule.message).toBe('Name is required');
  });
});

describe('email', () => {
  it('should create email rule with default message', () => {
    const rule = email();
    expect(rule.type).toBe('email');
    expect(rule.message).toBe('Please enter a valid email address');
  });

  it('should create email rule with custom message', () => {
    const rule = email('Invalid email');
    expect(rule.message).toBe('Invalid email');
  });
});

describe('minLength', () => {
  it('should create min length rule', () => {
    const rule = minLength(5);
    expect(rule.min).toBe(5);
    expect(rule.message).toBe('Must be at least 5 characters');
  });

  it('should use custom message', () => {
    const rule = minLength(3, 'Too short');
    expect(rule.message).toBe('Too short');
  });
});

describe('maxLength', () => {
  it('should create max length rule', () => {
    const rule = maxLength(100);
    expect(rule.max).toBe(100);
    expect(rule.message).toBe('Must be no more than 100 characters');
  });

  it('should use custom message', () => {
    const rule = maxLength(50, 'Too long');
    expect(rule.message).toBe('Too long');
  });
});

describe('lengthRange', () => {
  it('should create length range rule', () => {
    const rule = lengthRange(5, 10);
    expect(rule.min).toBe(5);
    expect(rule.max).toBe(10);
    expect(rule.message).toBe('Must be between 5 and 10 characters');
  });
});

describe('pattern', () => {
  it('should create pattern rule', () => {
    const regex = /^[A-Z]+$/;
    const rule = pattern(regex, 'Only uppercase letters');
    expect(rule.pattern).toBe(regex);
    expect(rule.message).toBe('Only uppercase letters');
  });
});

describe('phone', () => {
  it('should create phone rule with default message', () => {
    const rule = phone();
    expect(rule.pattern).toBeDefined();
    expect(rule.message).toBe('Please enter a valid phone number');
  });

  it('should match valid phone numbers', () => {
    const rule = phone();
    const regex = rule.pattern as RegExp;
    expect(regex.test('1234567890')).toBe(true);
    expect(regex.test('+1-555-123-4567')).toBe(true);
    expect(regex.test('(123) 456-7890')).toBe(true);
  });
});

describe('url', () => {
  it('should create url rule', () => {
    const rule = url();
    expect(rule.type).toBe('url');
    expect(rule.message).toBe('Please enter a valid URL');
  });
});

describe('number', () => {
  it('should create number rule', () => {
    const rule = number();
    expect(rule.type).toBe('number');
    expect(rule.message).toBe('Please enter a valid number');
  });

  it('should have transform function', () => {
    const rule = number();
    expect(rule.transform).toBeDefined();
    expect(rule.transform!('')).toBeUndefined();
    expect(rule.transform!('42')).toBe(42);
  });
});

describe('integer', () => {
  it('should create integer rule', () => {
    const rule = integer();
    expect(rule.type).toBe('integer');
    expect(rule.message).toBe('Please enter a valid integer');
  });
});

describe('minValue', () => {
  it('should create min value rule', () => {
    const rule = minValue(0);
    expect(rule.min).toBe(0);
    expect(rule.message).toBe('Must be at least 0');
  });
});

describe('maxValue', () => {
  it('should create max value rule', () => {
    const rule = maxValue(100);
    expect(rule.max).toBe(100);
    expect(rule.message).toBe('Must be no more than 100');
  });
});

describe('range', () => {
  it('should create range rule', () => {
    const rule = range(1, 10);
    expect(rule.min).toBe(1);
    expect(rule.max).toBe(10);
    expect(rule.message).toBe('Must be between 1 and 10');
  });
});

describe('password', () => {
  it('should create password rule', () => {
    const rule = password();
    expect(rule.validator).toBeDefined();
  });

  it('should reject short passwords', async () => {
    const rule = password();
    await expect((rule.validator as any)({}, 'short')).rejects.toThrow();
  });

  it('should reject passwords without letters', async () => {
    const rule = password();
    await expect((rule.validator as any)({}, '12345678')).rejects.toThrow();
  });

  it('should reject passwords without numbers', async () => {
    const rule = password();
    await expect((rule.validator as any)({}, 'abcdefgh')).rejects.toThrow();
  });

  it('should accept valid password', async () => {
    const rule = password();
    await expect((rule.validator as any)({}, 'password123')).resolves.toBeUndefined();
  });

  it('should accept empty password', async () => {
    const rule = password();
    await expect((rule.validator as any)({}, '')).resolves.toBeUndefined();
  });
});

describe('strongPassword', () => {
  it('should reject without uppercase', async () => {
    const rule = strongPassword();
    await expect((rule.validator as any)({}, 'password1!')).rejects.toThrow();
  });

  it('should reject without lowercase', async () => {
    const rule = strongPassword();
    await expect((rule.validator as any)({}, 'PASSWORD1!')).rejects.toThrow();
  });

  it('should reject without number', async () => {
    const rule = strongPassword();
    await expect((rule.validator as any)({}, 'Password!')).rejects.toThrow();
  });

  it('should reject without special character', async () => {
    const rule = strongPassword();
    await expect((rule.validator as any)({}, 'Password1')).rejects.toThrow();
  });

  it('should accept valid strong password', async () => {
    const rule = strongPassword();
    await expect((rule.validator as any)({}, 'Password1!')).resolves.toBeUndefined();
  });
});

describe('confirmPassword', () => {
  it('should accept matching passwords', async () => {
    const getPassword = () => 'secret123';
    const rule = confirmPassword(getPassword);
    await expect((rule.validator as any)({}, 'secret123')).resolves.toBeUndefined();
  });

  it('should reject non-matching passwords', async () => {
    const getPassword = () => 'secret123';
    const rule = confirmPassword(getPassword);
    await expect((rule.validator as any)({}, 'different')).rejects.toThrow();
  });

  it('should accept empty value', async () => {
    const getPassword = () => 'secret123';
    const rule = confirmPassword(getPassword);
    await expect((rule.validator as any)({}, '')).resolves.toBeUndefined();
  });
});

describe('date', () => {
  it('should create date rule', () => {
    const rule = date();
    expect(rule.type).toBe('date');
    expect(rule.trigger).toBe('change');
  });
});

describe('dateAfter', () => {
  it('should accept end date after start date', async () => {
    const getStartDate = () => '2024-01-01';
    const rule = dateAfter(getStartDate);
    await expect((rule.validator as any)({}, '2024-01-15')).resolves.toBeUndefined();
  });

  it('should reject end date before start date', async () => {
    const getStartDate = () => '2024-01-15';
    const rule = dateAfter(getStartDate);
    await expect((rule.validator as any)({}, '2024-01-01')).rejects.toThrow();
  });

  it('should reject same date', async () => {
    const getStartDate = () => '2024-01-15';
    const rule = dateAfter(getStartDate);
    await expect((rule.validator as any)({}, '2024-01-15')).rejects.toThrow();
  });

  it('should accept empty value', async () => {
    const getStartDate = () => '2024-01-01';
    const rule = dateAfter(getStartDate);
    await expect((rule.validator as any)({}, '')).resolves.toBeUndefined();
  });

  it('should accept when start date is null', async () => {
    const getStartDate = () => null;
    const rule = dateAfter(getStartDate);
    await expect((rule.validator as any)({}, '2024-01-01')).resolves.toBeUndefined();
  });
});

describe('employeeId', () => {
  it('should create employee ID rule', () => {
    const rule = employeeId();
    expect(rule.pattern).toBeDefined();
    expect(rule.message).toBe('Employee ID must be 4-20 alphanumeric characters');
  });

  it('should match valid employee IDs', () => {
    const rule = employeeId();
    const regex = rule.pattern as RegExp;
    expect(regex.test('EMP001')).toBe(true);
    expect(regex.test('A1B2')).toBe(true);
    expect(regex.test('EMPLOYEE12345')).toBe(true);
  });

  it('should reject invalid employee IDs', () => {
    const rule = employeeId();
    const regex = rule.pattern as RegExp;
    expect(regex.test('AB')).toBe(false); // Too short
    expect(regex.test('EMP-001')).toBe(false); // Contains hyphen
    expect(regex.test('EMP 001')).toBe(false); // Contains space
  });
});

describe('badgeId', () => {
  it('should create badge ID rule', () => {
    const rule = badgeId();
    expect(rule.pattern).toBeDefined();
    expect(rule.message).toBe('Badge ID must be alphanumeric');
  });

  it('should match valid badge IDs', () => {
    const rule = badgeId();
    const regex = rule.pattern as RegExp;
    expect(regex.test('BADGE001')).toBe(true);
    expect(regex.test('B-001')).toBe(true);
    expect(regex.test('123-ABC')).toBe(true);
  });
});

describe('salary', () => {
  it('should accept valid salary', async () => {
    const rule = salary();
    await expect((rule.validator as any)({}, 50000)).resolves.toBeUndefined();
    await expect((rule.validator as any)({}, '50000')).resolves.toBeUndefined();
    await expect((rule.validator as any)({}, 0)).resolves.toBeUndefined();
  });

  it('should reject negative salary', async () => {
    const rule = salary();
    await expect((rule.validator as any)({}, -1000)).rejects.toThrow();
  });

  it('should reject NaN', async () => {
    const rule = salary();
    await expect((rule.validator as any)({}, 'invalid')).rejects.toThrow();
  });

  it('should accept empty values', async () => {
    const rule = salary();
    await expect((rule.validator as any)({}, '')).resolves.toBeUndefined();
    await expect((rule.validator as any)({}, null)).resolves.toBeUndefined();
    await expect((rule.validator as any)({}, undefined)).resolves.toBeUndefined();
  });
});

describe('asyncValidator', () => {
  it('should accept when validation passes', async () => {
    const validateFn = vi.fn().mockResolvedValue(true);
    const rule = asyncValidator(validateFn, 'Validation failed');
    await expect((rule.validator as any)({}, 'test')).resolves.toBeUndefined();
    expect(validateFn).toHaveBeenCalledWith('test');
  });

  it('should reject when validation fails', async () => {
    const validateFn = vi.fn().mockResolvedValue(false);
    const rule = asyncValidator(validateFn, 'Validation failed');
    await expect((rule.validator as any)({}, 'test')).rejects.toThrow('Validation failed');
  });

  it('should skip validation for empty value', async () => {
    const validateFn = vi.fn().mockResolvedValue(false);
    const rule = asyncValidator(validateFn, 'Validation failed');
    await expect((rule.validator as any)({}, '')).resolves.toBeUndefined();
    expect(validateFn).not.toHaveBeenCalled();
  });
});

describe('combine', () => {
  it('should return array of rules', () => {
    const rules = combine(required(), email());
    expect(Array.isArray(rules)).toBe(true);
    expect(rules).toHaveLength(2);
  });
});

describe('commonRules', () => {
  it('should have email rules', () => {
    expect(commonRules.email).toBeDefined();
    expect(Array.isArray(commonRules.email)).toBe(true);
  });

  it('should have password rules', () => {
    expect(commonRules.password).toBeDefined();
    expect(Array.isArray(commonRules.password)).toBe(true);
  });

  it('should have phone rules', () => {
    expect(commonRules.phone).toBeDefined();
  });

  it('should have name rules', () => {
    expect(commonRules.name).toBeDefined();
  });

  it('should have employeeId rules', () => {
    expect(commonRules.employeeId).toBeDefined();
  });

  it('should have salary rules', () => {
    expect(commonRules.salary).toBeDefined();
  });
});

describe('hrmsRules', () => {
  it('should have employee rules', () => {
    expect(hrmsRules.employee).toBeDefined();
    expect(hrmsRules.employee.first_name).toBeDefined();
    expect(hrmsRules.employee.last_name).toBeDefined();
    expect(hrmsRules.employee.email).toBeDefined();
  });

  it('should have leave rules', () => {
    expect(hrmsRules.leave).toBeDefined();
    expect(hrmsRules.leave.leave_type_id).toBeDefined();
    expect(hrmsRules.leave.start_date).toBeDefined();
    expect(hrmsRules.leave.end_date).toBeDefined();
    expect(hrmsRules.leave.reason).toBeDefined();
  });

  it('should have attendance rules', () => {
    expect(hrmsRules.attendance).toBeDefined();
    expect(hrmsRules.attendance.employee_id).toBeDefined();
    expect(hrmsRules.attendance.date).toBeDefined();
  });

  it('should have asset rules', () => {
    expect(hrmsRules.asset).toBeDefined();
    expect(hrmsRules.asset.name).toBeDefined();
    expect(hrmsRules.asset.asset_tag).toBeDefined();
  });

  it('should have job rules', () => {
    expect(hrmsRules.job).toBeDefined();
    expect(hrmsRules.job.title).toBeDefined();
    expect(hrmsRules.job.department_id).toBeDefined();
  });

  it('should have login rules', () => {
    expect(hrmsRules.login).toBeDefined();
    expect(hrmsRules.login.username).toBeDefined();
    expect(hrmsRules.login.password).toBeDefined();
  });
});
