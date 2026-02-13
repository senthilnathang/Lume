import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/**
 * Date formatting utilities
 */
export const dateFormat = {
  /**
   * Format date to display format
   */
  display(date: string | Date | null | undefined, format = 'MMM DD, YYYY'): string {
    if (!date) return '-';
    return dayjs(date).format(format);
  },

  /**
   * Format datetime to display format
   */
  datetime(date: string | Date | null | undefined, format = 'MMM DD, YYYY HH:mm'): string {
    if (!date) return '-';
    return dayjs(date).format(format);
  },

  /**
   * Format time only
   */
  time(date: string | Date | null | undefined, format = 'HH:mm'): string {
    if (!date) return '-';
    return dayjs(date).format(format);
  },

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  relative(date: string | Date | null | undefined): string {
    if (!date) return '-';
    return dayjs(date).fromNow();
  },

  /**
   * Format date for API requests
   */
  api(date: string | Date | null | undefined, format = 'YYYY-MM-DD'): string {
    if (!date) return '';
    return dayjs(date).format(format);
  },

  /**
   * Check if date is today
   */
  isToday(date: string | Date): boolean {
    return dayjs(date).isSame(dayjs(), 'day');
  },

  /**
   * Check if date is in the past
   */
  isPast(date: string | Date): boolean {
    return dayjs(date).isBefore(dayjs(), 'day');
  },

  /**
   * Get difference in days
   */
  diffDays(start: string | Date, end: string | Date): number {
    return dayjs(end).diff(dayjs(start), 'day');
  },
};

/**
 * Number formatting utilities
 */
export const numberFormat = {
  /**
   * Format number with thousand separators
   */
  number(value: number | null | undefined, decimals = 0): string {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  },

  /**
   * Format as currency
   */
  currency(value: number | null | undefined, currency = 'USD', decimals = 2): string {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  },

  /**
   * Format as percentage
   */
  percent(value: number | null | undefined, decimals = 1): string {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(decimals)}%`;
  },

  /**
   * Format bytes to human readable size
   */
  fileSize(bytes: number | null | undefined): string {
    if (bytes === null || bytes === undefined) return '-';
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  },

  /**
   * Format large numbers (e.g., 1.5K, 2.3M)
   */
  compact(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  },
};

/**
 * Text formatting utilities
 */
export const textFormat = {
  /**
   * Capitalize first letter
   */
  capitalize(text: string | null | undefined): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  },

  /**
   * Title case
   */
  titleCase(text: string | null | undefined): string {
    if (!text) return '';
    return text.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  },

  /**
   * Truncate text with ellipsis
   */
  truncate(text: string | null | undefined, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  },

  /**
   * Get initials from name
   */
  initials(name: string | null | undefined, maxLength = 2): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    return parts
      .slice(0, maxLength)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  },

  /**
   * Format snake_case or kebab-case to Title Case
   */
  humanize(text: string | null | undefined): string {
    if (!text) return '';
    return text
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  },

  /**
   * Pluralize word based on count
   */
  pluralize(count: number, singular: string, plural?: string): string {
    if (count === 1) return `${count} ${singular}`;
    return `${count} ${plural || `${singular}s`}`;
  },
};

/**
 * Phone number formatting
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  // Remove non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  // Format based on length
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Format employee ID with prefix
 */
export function formatEmployeeId(id: string | number | null | undefined, prefix = 'EMP'): string {
  if (id === null || id === undefined) return '-';
  const paddedId = String(id).padStart(5, '0');
  return `${prefix}${paddedId}`;
}

/**
 * Format duration in hours and minutes
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format status for display (snake_case to Title Case with color)
 */
export function formatStatus(status: string | null | undefined): { text: string; color: string } {
  if (!status) return { text: '-', color: 'default' };

  const statusMap: Record<string, { text: string; color: string }> = {
    active: { text: 'Active', color: 'green' },
    inactive: { text: 'Inactive', color: 'red' },
    pending: { text: 'Pending', color: 'orange' },
    approved: { text: 'Approved', color: 'green' },
    rejected: { text: 'Rejected', color: 'red' },
    cancelled: { text: 'Cancelled', color: 'default' },
    completed: { text: 'Completed', color: 'blue' },
    draft: { text: 'Draft', color: 'default' },
    present: { text: 'Present', color: 'green' },
    absent: { text: 'Absent', color: 'red' },
    late: { text: 'Late', color: 'orange' },
    on_leave: { text: 'On Leave', color: 'purple' },
    half_day: { text: 'Half Day', color: 'cyan' },
  };

  const normalized = status.toLowerCase();
  return statusMap[normalized] || {
    text: textFormat.humanize(status),
    color: 'default'
  };
}
