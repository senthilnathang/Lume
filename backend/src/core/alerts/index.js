/**
 * Alerts API - Public Interface
 * Provides methods to create, manage, and monitor alerts
 */

export {
  sendAlert,
  acknowledgeAlert,
  resolveAlert,
  getAlertStatus,
  clearOldAlerts,
  exportAlerts,
  SEVERITY_LEVELS,
  CHANNEL_CONFIG,
  generateAlertFingerprint,
  enrichAlert
} from './escalation-policy.js';
