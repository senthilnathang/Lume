/**
 * Business Hours Service
 * Handles business hours calculations for workflow scheduling
 */

import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import isoWeek from 'dayjs/plugin/isoWeek.js';

dayjs.extend(timezone);
dayjs.extend(isoWeek);

export class BusinessHoursService {
  /**
   * Check if a given time is within business hours
   * @param {Object} config - { start: 9, end: 17, timezone: 'UTC', days: [1,2,3,4,5] }
   * @param {Date} now - Time to check (defaults to now)
   * @returns {boolean}
   */
  isBusinessHours(config = {}, now = null) {
    const { start = 9, end = 17, timezone: tz = 'UTC', days = [1, 2, 3, 4, 5] } = config;
    const time = now ? dayjs(now).tz(tz) : dayjs().tz(tz);

    // Check if day of week is in business days (ISO weekday: 1=Mon, 7=Sun)
    const isDayInRange = days.includes(time.isoWeekday());
    if (!isDayInRange) return false;

    // Check if hour is in business hours [start, end)
    const hour = time.hour();
    return hour >= start && hour < end;
  }

  /**
   * Get the next business hours start time
   * @param {Object} config - Business hours configuration
   * @param {Date} from - Start searching from this time (defaults to now)
   * @returns {Date} The next business hours start time
   */
  getNextBusinessHoursTime(config = {}, from = null) {
    const { start = 9, timezone: tz = 'UTC', days = [1, 2, 3, 4, 5] } = config;
    let cursor = from ? dayjs(from).tz(tz) : dayjs().tz(tz);

    // Try up to 8 days (1 week + 1)
    for (let i = 0; i < 8; i++) {
      const dayOfWeek = cursor.isoWeekday();

      // If this day is a business day, advance to business hours start
      if (days.includes(dayOfWeek)) {
        const businessStart = cursor.hour(start).minute(0).second(0);

        // If it's before business start, return business start for this day
        if (cursor.isBefore(businessStart) || cursor.isSame(businessStart)) {
          return businessStart.toDate();
        }
      }

      // Move to next day
      cursor = cursor.add(1, 'day').hour(0).minute(0).second(0);
    }

    // Fallback: return tomorrow at business start
    return cursor.hour(start).minute(0).second(0).toDate();
  }
}

export default BusinessHoursService;
