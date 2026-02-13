import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

type FormatDate = Date | dayjs.Dayjs | number | string;

type Format =
  | 'HH'
  | 'HH:mm'
  | 'HH:mm:ss'
  | 'YYYY'
  | 'YYYY-MM'
  | 'YYYY-MM-DD'
  | 'YYYY-MM-DD HH'
  | 'YYYY-MM-DD HH:mm'
  | 'YYYY-MM-DD HH:mm:ss'
  | (string & {});

export function formatDate(time?: FormatDate, format: Format = 'YYYY-MM-DD') {
  try {
    const date = dayjs.isDayjs(time) ? time : dayjs(time);
    if (!date.isValid()) {
      throw new Error('Invalid date');
    }
    return date.tz().format(format);
  } catch (error) {
    console.error(`Error formatting date: ${error}`);
    return String(time ?? '');
  }
}

export function formatDateTime(time?: FormatDate) {
  return formatDate(time, 'YYYY-MM-DD HH:mm:ss');
}

export function isDate(value: any): value is Date {
  return value instanceof Date;
}

export function isDayjsObject(value: any): value is dayjs.Dayjs {
  return dayjs.isDayjs(value);
}

/**
 * 获取当前时区
 * @returns 当前时区
 */
export const getSystemTimezone = () => {
  return dayjs.tz.guess();
};

/**
 * 自定义设置的时区
 */
let currentTimezone = getSystemTimezone();

/**
 * 设置默认时区
 * @param timezone
 */
export const setCurrentTimezone = (timezone?: string) => {
  currentTimezone = timezone || getSystemTimezone();
  dayjs.tz.setDefault(currentTimezone);
};

/**
 * 获取设置的时区
 * @returns 设置的时区
 */
export const getCurrentTimezone = () => {
  return currentTimezone;
};

/**
 * Format a date as relative time (e.g., "2 hours ago", "3 days ago")
 * @param time - The date to format
 * @param withSuffix - Whether to include "ago" suffix (default: true)
 * @returns Formatted relative time string
 */
export function formatTimeAgo(time?: FormatDate, withSuffix = true): string {
  try {
    const date = dayjs.isDayjs(time) ? time : dayjs(time);
    if (!date.isValid()) {
      return String(time ?? '');
    }
    return date.fromNow(withSuffix);
  } catch (error) {
    console.error(`Error formatting relative time: ${error}`);
    return String(time ?? '');
  }
}

/**
 * Check if a date is within a certain time range from now
 * @param time - The date to check
 * @param value - The amount of time
 * @param unit - The unit of time (e.g., 'day', 'hour', 'minute')
 * @returns Whether the date is within the range
 */
export function isWithin(
  time: FormatDate,
  value: number,
  unit: dayjs.ManipulateType,
): boolean {
  const date = dayjs.isDayjs(time) ? time : dayjs(time);
  const threshold = dayjs().subtract(value, unit);
  return date.isAfter(threshold);
}
