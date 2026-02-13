/**
 * Unit tests for the formatters utility module.
 */
import { describe, expect, it } from 'vitest';

import {
  dateFormat,
  numberFormat,
  textFormat,
  formatPhone,
  formatEmployeeId,
  formatDuration,
  formatStatus,
} from './formatters';

describe('dateFormat', () => {
  describe('display', () => {
    it('should format date to default display format', () => {
      const result = dateFormat.display('2024-01-15');
      expect(result).toBe('Jan 15, 2024');
    });

    it('should format date with custom format', () => {
      const result = dateFormat.display('2024-01-15', 'DD/MM/YYYY');
      expect(result).toBe('15/01/2024');
    });

    it('should return "-" for null date', () => {
      expect(dateFormat.display(null)).toBe('-');
    });

    it('should return "-" for undefined date', () => {
      expect(dateFormat.display(undefined)).toBe('-');
    });

    it('should handle Date object', () => {
      const date = new Date('2024-06-20');
      const result = dateFormat.display(date);
      expect(result).toBe('Jun 20, 2024');
    });
  });

  describe('datetime', () => {
    it('should format datetime to default format', () => {
      const result = dateFormat.datetime('2024-01-15T14:30:00');
      expect(result).toContain('Jan 15, 2024');
      expect(result).toContain('14:30');
    });

    it('should return "-" for null datetime', () => {
      expect(dateFormat.datetime(null)).toBe('-');
    });
  });

  describe('time', () => {
    it('should format time only', () => {
      const result = dateFormat.time('2024-01-15T14:30:00');
      expect(result).toBe('14:30');
    });

    it('should return "-" for null time', () => {
      expect(dateFormat.time(null)).toBe('-');
    });
  });

  describe('relative', () => {
    it('should return relative time string', () => {
      const recentDate = new Date();
      recentDate.setSeconds(recentDate.getSeconds() - 30);
      const result = dateFormat.relative(recentDate);
      expect(result).toContain('second');
    });

    it('should return "-" for null date', () => {
      expect(dateFormat.relative(null)).toBe('-');
    });
  });

  describe('api', () => {
    it('should format date for API', () => {
      const result = dateFormat.api('2024-01-15');
      expect(result).toBe('2024-01-15');
    });

    it('should return empty string for null date', () => {
      expect(dateFormat.api(null)).toBe('');
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date();
      expect(dateFormat.isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(dateFormat.isToday(yesterday)).toBe(false);
    });
  });

  describe('isPast', () => {
    it('should return true for past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(dateFormat.isPast(pastDate)).toBe(true);
    });

    it('should return false for future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(dateFormat.isPast(futureDate)).toBe(false);
    });
  });

  describe('diffDays', () => {
    it('should calculate difference in days', () => {
      const start = '2024-01-01';
      const end = '2024-01-11';
      expect(dateFormat.diffDays(start, end)).toBe(10);
    });

    it('should return negative for reversed dates', () => {
      const start = '2024-01-11';
      const end = '2024-01-01';
      expect(dateFormat.diffDays(start, end)).toBe(-10);
    });
  });
});

describe('numberFormat', () => {
  describe('number', () => {
    it('should format number with thousand separators', () => {
      expect(numberFormat.number(1234567)).toBe('1,234,567');
    });

    it('should format with decimals', () => {
      expect(numberFormat.number(1234.5678, 2)).toBe('1,234.57');
    });

    it('should return "-" for null', () => {
      expect(numberFormat.number(null)).toBe('-');
    });

    it('should return "-" for undefined', () => {
      expect(numberFormat.number(undefined)).toBe('-');
    });

    it('should format zero correctly', () => {
      expect(numberFormat.number(0)).toBe('0');
    });
  });

  describe('currency', () => {
    it('should format as USD currency', () => {
      const result = numberFormat.currency(1234.56);
      expect(result).toContain('$');
      expect(result).toContain('1,234.56');
    });

    it('should format with different currency', () => {
      const result = numberFormat.currency(1000, 'EUR');
      expect(result).toContain('€');
    });

    it('should return "-" for null', () => {
      expect(numberFormat.currency(null)).toBe('-');
    });
  });

  describe('percent', () => {
    it('should format as percentage', () => {
      expect(numberFormat.percent(75.5)).toBe('75.5%');
    });

    it('should use custom decimals', () => {
      expect(numberFormat.percent(33.3333, 2)).toBe('33.33%');
    });

    it('should return "-" for null', () => {
      expect(numberFormat.percent(null)).toBe('-');
    });
  });

  describe('fileSize', () => {
    it('should format bytes', () => {
      expect(numberFormat.fileSize(500)).toBe('500 Bytes');
    });

    it('should format kilobytes', () => {
      expect(numberFormat.fileSize(1024)).toBe('1 KB');
    });

    it('should format megabytes', () => {
      expect(numberFormat.fileSize(1048576)).toBe('1 MB');
    });

    it('should format gigabytes', () => {
      expect(numberFormat.fileSize(1073741824)).toBe('1 GB');
    });

    it('should return "0 Bytes" for zero', () => {
      expect(numberFormat.fileSize(0)).toBe('0 Bytes');
    });

    it('should return "-" for null', () => {
      expect(numberFormat.fileSize(null)).toBe('-');
    });
  });

  describe('compact', () => {
    it('should format thousands', () => {
      expect(numberFormat.compact(1500)).toBe('1.5K');
    });

    it('should format millions', () => {
      expect(numberFormat.compact(2500000)).toBe('2.5M');
    });

    it('should return "-" for null', () => {
      expect(numberFormat.compact(null)).toBe('-');
    });
  });
});

describe('textFormat', () => {
  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(textFormat.capitalize('hello')).toBe('Hello');
    });

    it('should lowercase rest', () => {
      expect(textFormat.capitalize('HELLO')).toBe('Hello');
    });

    it('should return empty string for null', () => {
      expect(textFormat.capitalize(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(textFormat.capitalize(undefined)).toBe('');
    });
  });

  describe('titleCase', () => {
    it('should convert to title case', () => {
      expect(textFormat.titleCase('hello world')).toBe('Hello World');
    });

    it('should handle multiple words', () => {
      expect(textFormat.titleCase('the quick brown fox')).toBe('The Quick Brown Fox');
    });

    it('should return empty string for null', () => {
      expect(textFormat.titleCase(null)).toBe('');
    });
  });

  describe('truncate', () => {
    it('should truncate long text', () => {
      expect(textFormat.truncate('Hello World', 5)).toBe('Hello...');
    });

    it('should not truncate short text', () => {
      expect(textFormat.truncate('Hello', 10)).toBe('Hello');
    });

    it('should return empty string for null', () => {
      expect(textFormat.truncate(null, 10)).toBe('');
    });
  });

  describe('initials', () => {
    it('should get initials from name', () => {
      expect(textFormat.initials('John Doe')).toBe('JD');
    });

    it('should limit initials', () => {
      expect(textFormat.initials('John Middle Doe', 2)).toBe('JM');
    });

    it('should handle single word', () => {
      expect(textFormat.initials('John')).toBe('J');
    });

    it('should return empty string for null', () => {
      expect(textFormat.initials(null)).toBe('');
    });
  });

  describe('humanize', () => {
    it('should convert snake_case', () => {
      expect(textFormat.humanize('hello_world')).toBe('Hello World');
    });

    it('should convert kebab-case', () => {
      expect(textFormat.humanize('hello-world')).toBe('Hello World');
    });

    it('should return empty string for null', () => {
      expect(textFormat.humanize(null)).toBe('');
    });
  });

  describe('pluralize', () => {
    it('should return singular for count 1', () => {
      expect(textFormat.pluralize(1, 'item')).toBe('1 item');
    });

    it('should return plural for count > 1', () => {
      expect(textFormat.pluralize(5, 'item')).toBe('5 items');
    });

    it('should use custom plural', () => {
      expect(textFormat.pluralize(5, 'person', 'people')).toBe('5 people');
    });

    it('should return plural for count 0', () => {
      expect(textFormat.pluralize(0, 'item')).toBe('0 items');
    });
  });
});

describe('formatPhone', () => {
  it('should format 10-digit phone number', () => {
    expect(formatPhone('1234567890')).toBe('(123) 456-7890');
  });

  it('should handle phone with special characters', () => {
    expect(formatPhone('123-456-7890')).toBe('(123) 456-7890');
  });

  it('should return original for non-10-digit', () => {
    expect(formatPhone('12345')).toBe('12345');
  });

  it('should return "-" for null', () => {
    expect(formatPhone(null)).toBe('-');
  });

  it('should return "-" for undefined', () => {
    expect(formatPhone(undefined)).toBe('-');
  });
});

describe('formatEmployeeId', () => {
  it('should format with default prefix', () => {
    expect(formatEmployeeId(123)).toBe('EMP00123');
  });

  it('should format with custom prefix', () => {
    expect(formatEmployeeId(1, 'HR')).toBe('HR00001');
  });

  it('should handle string id', () => {
    expect(formatEmployeeId('42')).toBe('EMP00042');
  });

  it('should return "-" for null', () => {
    expect(formatEmployeeId(null)).toBe('-');
  });

  it('should return "-" for undefined', () => {
    expect(formatEmployeeId(undefined)).toBe('-');
  });
});

describe('formatDuration', () => {
  it('should format hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30m');
  });

  it('should format hours only', () => {
    expect(formatDuration(120)).toBe('2h');
  });

  it('should format minutes only', () => {
    expect(formatDuration(45)).toBe('45m');
  });

  it('should return "-" for null', () => {
    expect(formatDuration(null)).toBe('-');
  });

  it('should return "-" for undefined', () => {
    expect(formatDuration(undefined)).toBe('-');
  });
});

describe('formatStatus', () => {
  it('should format active status', () => {
    const result = formatStatus('active');
    expect(result.text).toBe('Active');
    expect(result.color).toBe('green');
  });

  it('should format inactive status', () => {
    const result = formatStatus('inactive');
    expect(result.text).toBe('Inactive');
    expect(result.color).toBe('red');
  });

  it('should format pending status', () => {
    const result = formatStatus('pending');
    expect(result.text).toBe('Pending');
    expect(result.color).toBe('orange');
  });

  it('should format approved status', () => {
    const result = formatStatus('approved');
    expect(result.text).toBe('Approved');
    expect(result.color).toBe('green');
  });

  it('should format rejected status', () => {
    const result = formatStatus('rejected');
    expect(result.text).toBe('Rejected');
    expect(result.color).toBe('red');
  });

  it('should handle unknown status with humanize', () => {
    const result = formatStatus('custom_status');
    expect(result.text).toBe('Custom Status');
    expect(result.color).toBe('default');
  });

  it('should return default for null', () => {
    const result = formatStatus(null);
    expect(result.text).toBe('-');
    expect(result.color).toBe('default');
  });

  it('should handle case insensitive', () => {
    const result = formatStatus('APPROVED');
    expect(result.text).toBe('Approved');
    expect(result.color).toBe('green');
  });
});
