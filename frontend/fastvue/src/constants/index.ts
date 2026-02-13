/**
 * Application Constants
 *
 * Centralized constants for colors, statuses, and configuration options
 * used across the HRMS application. This eliminates duplicate definitions
 * and ensures consistency.
 *
 * Usage:
 * ```ts
 * import { STATUS_COLORS, getStatusColor, STAGE_COLORS } from '#/constants';
 *
 * const color = getStatusColor('approved'); // 'green'
 * const tagColor = STATUS_COLORS.leave.approved; // 'green'
 * ```
 */

// =============================================================================
// STATUS COLORS
// =============================================================================

/**
 * Common status color mappings used across modules
 */
export const STATUS_COLORS = {
  // Generic statuses (used across multiple modules)
  generic: {
    pending: 'orange',
    approved: 'green',
    rejected: 'red',
    cancelled: 'default',
    completed: 'green',
    in_progress: 'blue',
    draft: 'default',
    active: 'green',
    inactive: 'red',
  },

  // Leave request statuses
  leave: {
    pending: 'orange',
    approved: 'green',
    rejected: 'red',
    cancelled: 'default',
    requested: 'blue',
  },

  // Asset statuses
  asset: {
    available: 'green',
    in_use: 'blue',
    assigned: 'blue',
    maintenance: 'orange',
    under_maintenance: 'orange',
    retired: 'default',
    disposed: 'red',
    lost: 'red',
    damaged: 'volcano',
  },

  // Asset request statuses
  assetRequest: {
    pending: 'orange',
    approved: 'green',
    rejected: 'red',
    fulfilled: 'cyan',
    cancelled: 'default',
    returned: 'purple',
  },

  // Payroll statuses
  payroll: {
    draft: 'default',
    pending: 'orange',
    processing: 'blue',
    processed: 'cyan',
    paid: 'green',
    cancelled: 'red',
    on_hold: 'volcano',
  },

  // Attendance statuses
  attendance: {
    present: 'green',
    absent: 'red',
    late: 'orange',
    half_day: 'cyan',
    on_leave: 'purple',
    holiday: 'blue',
    weekend: 'default',
  },

  // Recruitment candidate statuses
  recruitment: {
    new: 'blue',
    screening: 'cyan',
    interview: 'purple',
    offer: 'orange',
    hired: 'green',
    rejected: 'red',
    withdrawn: 'default',
  },

  // Resignation/Offboarding statuses
  resignation: {
    pending: 'orange',
    approved: 'blue',
    in_progress: 'purple',
    completed: 'green',
    cancelled: 'default',
    rejected: 'red',
  },
} as const;

/**
 * Get color for any status string (searches across all status types)
 */
export function getStatusColor(status: string | null | undefined): string {
  if (!status) return 'default';

  const normalizedStatus = status.toLowerCase().replace(/[\s-]/g, '_');

  // Check generic first
  if (normalizedStatus in STATUS_COLORS.generic) {
    return STATUS_COLORS.generic[normalizedStatus as keyof typeof STATUS_COLORS.generic];
  }

  // Check all module-specific colors
  for (const module of Object.values(STATUS_COLORS)) {
    if (normalizedStatus in module) {
      return module[normalizedStatus as keyof typeof module] as string;
    }
  }

  return 'default';
}

/**
 * Get status color for a specific module
 */
export function getModuleStatusColor(
  module: keyof typeof STATUS_COLORS,
  status: string | null | undefined,
): string {
  if (!status) return 'default';
  const normalizedStatus = status.toLowerCase().replace(/[\s-]/g, '_');
  const colors = STATUS_COLORS[module];
  return (colors as Record<string, string>)[normalizedStatus] || 'default';
}

// =============================================================================
// STAGE/PIPELINE COLORS
// =============================================================================

/**
 * Recruitment pipeline stage colors
 */
export const RECRUITMENT_STAGE_COLORS: Record<string, string> = {
  initial: '#1890ff',
  new: '#1890ff',
  screening: '#13c2c2',
  test: '#722ed1',
  interview: '#eb2f96',
  offer: '#fa8c16',
  hired: '#52c41a',
  rejected: '#f5222d',
  withdrawn: '#8c8c8c',
};

/**
 * Offboarding pipeline stage colors
 */
export const OFFBOARDING_STAGE_COLORS: Record<string, string> = {
  notice_period: '#1890ff',
  interview: '#722ed1',
  handover: '#fa8c16',
  fnf: '#52c41a',
  documentation: '#13c2c2',
  clearance: '#eb2f96',
  exit: '#8c8c8c',
  other: '#d9d9d9',
};

/**
 * Onboarding task category colors
 */
export const ONBOARDING_CATEGORY_COLORS: Record<string, string> = {
  documentation: '#1890ff',
  training: '#722ed1',
  setup: '#13c2c2',
  introduction: '#fa8c16',
  compliance: '#52c41a',
  other: '#8c8c8c',
};

// =============================================================================
// PRIORITY COLORS
// =============================================================================

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
  urgent: 'volcano',
  critical: 'magenta',
};

export function getPriorityColor(priority: string | null | undefined): string {
  if (!priority) return 'default';
  return PRIORITY_COLORS[priority.toLowerCase()] || 'default';
}

// =============================================================================
// CHART COLORS
// =============================================================================

/**
 * Default color palette for charts
 */
export const CHART_COLORS = [
  '#1890ff', // Blue
  '#52c41a', // Green
  '#faad14', // Yellow
  '#f5222d', // Red
  '#722ed1', // Purple
  '#13c2c2', // Cyan
  '#eb2f96', // Magenta
  '#fa8c16', // Orange
  '#2f54eb', // Geekblue
  '#a0d911', // Lime
];

/**
 * Get chart color by index (cycles through palette)
 */
export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]!;
}

/**
 * Status-specific chart colors
 */
export const CHART_STATUS_COLORS: Record<string, string> = {
  approved: '#52c41a',
  pending: '#faad14',
  rejected: '#f5222d',
  cancelled: '#d9d9d9',
  active: '#1890ff',
  inactive: '#8c8c8c',
};

// =============================================================================
// FORM OPTIONS
// =============================================================================

/**
 * Gender options
 */
export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * Marital status options
 */
export const MARITAL_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
] as const;

/**
 * Employment type options
 */
export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
  { value: 'temporary', label: 'Temporary' },
] as const;

/**
 * Leave request source options
 */
export const LEAVE_SOURCE_OPTIONS = [
  { value: 'web', label: 'Web Portal' },
  { value: 'mobile', label: 'Mobile App' },
  { value: 'email', label: 'Email' },
  { value: 'manual', label: 'Manual Entry' },
] as const;

/**
 * Recruitment source options
 */
export const RECRUITMENT_SOURCE_OPTIONS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'referral', label: 'Employee Referral' },
  { value: 'website', label: 'Company Website' },
  { value: 'agency', label: 'Recruitment Agency' },
  { value: 'job_fair', label: 'Job Fair' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'other', label: 'Other' },
] as const;

// =============================================================================
// PAGINATION DEFAULTS
// =============================================================================

export const PAGINATION_DEFAULTS = {
  pageSize: 20,
  pageSizeOptions: ['10', '20', '50', '100'],
  showSizeChanger: true,
  showQuickJumper: true,
} as const;

// =============================================================================
// DATE FORMATS
// =============================================================================

export const DATE_FORMATS = {
  display: 'MMM DD, YYYY',
  displayWithTime: 'MMM DD, YYYY HH:mm',
  input: 'YYYY-MM-DD',
  api: 'YYYY-MM-DD',
  month: 'MMM YYYY',
  time: 'HH:mm',
  full: 'dddd, MMMM DD, YYYY',
} as const;

// =============================================================================
// FILE SIZE LIMITS
// =============================================================================

export const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  video: 50 * 1024 * 1024, // 50MB
  avatar: 2 * 1024 * 1024, // 2MB
} as const;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
