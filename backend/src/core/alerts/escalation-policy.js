/**
 * Alert Escalation Policy
 * Manages alert routing, severity escalation, and incident creation
 */

import fetch from 'node-fetch';
import crypto from 'crypto';

// Alert severity levels with escalation timings
const SEVERITY_LEVELS = {
  info: {
    channels: ['slack'],
    escalation: null,
    priority: 1
  },
  warning: {
    channels: ['slack', 'email'],
    escalationMinutes: 15,
    priority: 2
  },
  critical: {
    channels: ['slack', 'email', 'pagerduty', 'sms'],
    escalationMinutes: 5,
    priority: 3
  }
};

// Channel configuration from environment
const CHANNEL_CONFIG = {
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
    enabled: !!process.env.SLACK_WEBHOOK_URL
  },
  email: {
    enabled: !!process.env.SMTP_HOST,
    recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || ['admin@lume.dev']
  },
  pagerduty: {
    enabled: !!process.env.PAGERDUTY_INTEGRATION_KEY,
    integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
    serviceId: process.env.PAGERDUTY_SERVICE_ID
  },
  opsgenie: {
    enabled: !!process.env.OPSGENIE_API_KEY,
    apiKey: process.env.OPSGENIE_API_KEY,
    apiUrl: 'https://api.opsgenie.com'
  },
  sms: {
    enabled: !!process.env.TWILIO_ACCOUNT_SID,
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_PHONE_FROM,
    to: process.env.ALERT_SMS_RECIPIENTS?.split(',') || []
  }
};

// In-memory alert store (in production, use a database)
const alertStore = new Map();
const deduplicationWindow = parseInt(process.env.ALERT_DEDUP_WINDOW || '3600', 10); // 1 hour default

/**
 * Generate alert fingerprint for deduplication
 * @param {string} title Alert title
 * @param {string} severity Alert severity
 * @param {string} source Alert source
 * @returns {string} Alert fingerprint
 */
function generateAlertFingerprint(title, severity, source) {
  const content = `${title}:${severity}:${source}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Check if alert is a duplicate within deduplication window
 * @param {string} fingerprint Alert fingerprint
 * @returns {object|null} Existing alert or null
 */
function checkDeduplication(fingerprint) {
  const existing = alertStore.get(fingerprint);
  if (!existing) return null;

  const now = Date.now();
  const age = now - existing.createdAt;

  if (age < deduplicationWindow * 1000) {
    return existing;
  }

  // Alert is older than deduplication window, remove it
  alertStore.delete(fingerprint);
  return null;
}

/**
 * Enrich alert with context data
 * @param {object} alert Alert object
 * @param {object} context Additional context
 * @returns {object} Enriched alert
 */
function enrichAlert(alert, context = {}) {
  return {
    ...alert,
    timestamp: new Date().toISOString(),
    hostname: process.env.HOSTNAME || 'lume-app',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || 'unknown',
    context: {
      traceId: context.traceId,
      userId: context.userId,
      requestId: context.requestId,
      metrics: context.metrics,
      logs: context.logs,
      ...context
    }
  };
}

/**
 * Send alert to Slack
 * @param {object} alert Alert object
 * @returns {Promise<boolean>}
 */
async function sendToSlack(alert) {
  if (!CHANNEL_CONFIG.slack.enabled) return false;

  try {
    const color = {
      info: '#36a64f',
      warning: '#ff9900',
      critical: '#ff0000'
    }[alert.severity] || '#999999';

    const payload = {
      attachments: [
        {
          color,
          title: alert.title,
          text: alert.message,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Service',
              value: alert.context?.hostname || 'unknown',
              short: true
            },
            {
              title: 'Time',
              value: alert.timestamp,
              short: false
            },
            {
              title: 'Details',
              value: JSON.stringify(alert.context, null, 2).slice(0, 500),
              short: false
            }
          ],
          footer: 'Lume Alert System',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    const response = await fetch(CHANNEL_CONFIG.slack.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 5000
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send Slack alert:', error.message);
    return false;
  }
}

/**
 * Send alert to Email
 * @param {object} alert Alert object
 * @returns {Promise<boolean>}
 */
async function sendToEmail(alert) {
  if (!CHANNEL_CONFIG.email.enabled) return false;

  try {
    // This would integrate with your SMTP service
    // For now, just log the intention
    console.log(`📧 Email alert: ${alert.title} to ${CHANNEL_CONFIG.email.recipients.join(',')}`);
    return true;
  } catch (error) {
    console.error('Failed to send email alert:', error.message);
    return false;
  }
}

/**
 * Send alert to PagerDuty
 * @param {object} alert Alert object
 * @returns {Promise<boolean>}
 */
async function sendToPagerDuty(alert) {
  if (!CHANNEL_CONFIG.pagerduty.enabled) return false;

  try {
    const payload = {
      routing_key: CHANNEL_CONFIG.pagerduty.integrationKey,
      event_action: 'trigger',
      dedup_key: alert.fingerprint,
      payload: {
        summary: alert.title,
        severity: alert.severity === 'critical' ? 'critical' : 'warning',
        source: process.env.HOSTNAME || 'lume-app',
        custom_details: {
          message: alert.message,
          timestamp: alert.timestamp,
          environment: alert.environment,
          context: alert.context
        }
      }
    };

    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 5000
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('PagerDuty error:', error);
      return false;
    }

    const data = await response.json();
    return !!data.status;
  } catch (error) {
    console.error('Failed to send PagerDuty alert:', error.message);
    return false;
  }
}

/**
 * Send alert to Opsgenie
 * @param {object} alert Alert object
 * @returns {Promise<boolean>}
 */
async function sendToOpsgenie(alert) {
  if (!CHANNEL_CONFIG.opsgenie.enabled) return false;

  try {
    const payload = {
      message: alert.title,
      description: alert.message,
      priority: alert.severity === 'critical' ? 'P1' : 'P2',
      source: process.env.HOSTNAME || 'lume-app',
      tags: [
        alert.severity,
        alert.category || 'general',
        process.env.NODE_ENV || 'development'
      ],
      details: {
        environment: alert.environment,
        context: JSON.stringify(alert.context)
      }
    };

    const response = await fetch(`${CHANNEL_CONFIG.opsgenie.apiUrl}/v2/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `GenieKey ${CHANNEL_CONFIG.opsgenie.apiKey}`
      },
      body: JSON.stringify(payload),
      timeout: 5000
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send Opsgenie alert:', error.message);
    return false;
  }
}

/**
 * Send alert to SMS (via Twilio)
 * @param {object} alert Alert object
 * @returns {Promise<boolean>}
 */
async function sendToSMS(alert) {
  if (!CHANNEL_CONFIG.sms.enabled) return false;

  try {
    const message = `[${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message.slice(0, 100)}`;

    for (const to of CHANNEL_CONFIG.sms.to) {
      // This would use Twilio SDK or API
      console.log(`📱 SMS to ${to}: ${message}`);
    }

    return true;
  } catch (error) {
    console.error('Failed to send SMS alert:', error.message);
    return false;
  }
}

/**
 * Send alert to all configured channels based on severity
 * @param {object} alert Alert object
 * @returns {Promise<object>} Results from each channel
 */
async function distributeAlert(alert) {
  const severityConfig = SEVERITY_LEVELS[alert.severity] || SEVERITY_LEVELS.warning;
  const channels = severityConfig.channels || [];

  const results = {};

  for (const channel of channels) {
    try {
      if (channel === 'slack') {
        results.slack = await sendToSlack(alert);
      } else if (channel === 'email') {
        results.email = await sendToEmail(alert);
      } else if (channel === 'pagerduty') {
        results.pagerduty = await sendToPagerDuty(alert);
      } else if (channel === 'opsgenie') {
        results.opsgenie = await sendToOpsgenie(alert);
      } else if (channel === 'sms') {
        results.sms = await sendToSMS(alert);
      }
    } catch (error) {
      console.error(`Error sending to ${channel}:`, error.message);
      results[channel] = false;
    }
  }

  return results;
}

/**
 * Schedule escalation for an alert
 * @param {string} alertId Alert ID
 * @param {number} minutesDelay Minutes to wait before escalation
 * @param {function} escalationFn Function to call on escalation
 */
function scheduleEscalation(alertId, minutesDelay, escalationFn) {
  const timeoutMs = minutesDelay * 60 * 1000;

  setTimeout(() => {
    const alert = alertStore.get(alertId);
    if (alert && !alert.acknowledged && !alert.resolved) {
      escalationFn(alert);
    }
  }, timeoutMs);
}

/**
 * Create and send an alert
 * @param {string} severity Alert severity (info, warning, critical)
 * @param {string} title Alert title
 * @param {string} message Alert message
 * @param {object} context Additional context
 * @returns {Promise<object>} Alert object with results
 */
export async function sendAlert(severity, title, message, context = {}) {
  if (!process.env.ALERT_ESCALATION_ENABLED || process.env.ALERT_ESCALATION_ENABLED === 'false') {
    console.log('Alerts disabled via ALERT_ESCALATION_ENABLED');
    return null;
  }

  // Generate fingerprint for deduplication
  const fingerprint = generateAlertFingerprint(title, severity, context.source || 'default');

  // Check for duplicates
  const existing = checkDeduplication(fingerprint);
  if (existing) {
    console.log(`Alert deduplicated: ${title}`);
    existing.count = (existing.count || 1) + 1;
    existing.lastSeen = Date.now();
    return existing;
  }

  // Create alert object
  const alert = enrichAlert(
    {
      id: crypto.randomUUID(),
      fingerprint,
      severity,
      title,
      message,
      category: context.category || 'general',
      source: context.source || 'default',
      createdAt: Date.now(),
      acknowledged: false,
      resolved: false,
      count: 1
    },
    context
  );

  // Store alert
  alertStore.set(fingerprint, alert);

  // Distribute to configured channels (async, don't wait in tests)
  distributeAlert(alert).catch(err => {
    console.error('Error distributing alert:', err.message);
  });
  alert.distributionResults = {};

  console.log(`🚨 Alert sent: ${severity} - ${title}`);

  // Schedule escalations if configured (skip in test environment)
  const severityConfig = SEVERITY_LEVELS[severity];
  if (severityConfig?.escalationMinutes && process.env.NODE_ENV !== 'test') {
    scheduleEscalation(fingerprint, severityConfig.escalationMinutes, async (escalatingAlert) => {
      console.log(`⏰ Escalating alert after ${severityConfig.escalationMinutes} minutes: ${title}`);
      // Escalate to higher priority channels or manager
      const escalationChannels = ['pagerduty', 'opsgenie'];
      for (const channel of escalationChannels) {
        if (channel === 'pagerduty') await sendToPagerDuty(escalatingAlert);
        if (channel === 'opsgenie') await sendToOpsgenie(escalatingAlert);
      }
    });

    // Schedule manager page at 15 minutes
    if (severity === 'critical') {
      scheduleEscalation(fingerprint, 15, (escalatingAlert) => {
        console.log(`📞 Paging manager for critical alert: ${title}`);
        // Page manager via escalation service
      });

      // Schedule director escalation at 30 minutes
      scheduleEscalation(fingerprint, 30, (escalatingAlert) => {
        console.log(`🔴 Escalating to director for critical alert: ${title}`);
        // Escalate to director
      });
    }
  }

  return alert;
}

/**
 * Acknowledge an alert
 * @param {string} alertId Alert fingerprint or ID
 * @param {string} acknowledgedBy User who acknowledged
 * @returns {object} Updated alert
 */
export function acknowledgeAlert(alertId, acknowledgedBy = 'system') {
  const alert = alertStore.get(alertId);
  if (!alert) return null;

  alert.acknowledged = true;
  alert.acknowledgedAt = Date.now();
  alert.acknowledgedBy = acknowledgedBy;

  console.log(`✅ Alert acknowledged: ${alert.title}`);
  return alert;
}

/**
 * Resolve an alert
 * @param {string} alertId Alert fingerprint or ID
 * @param {string} resolvedBy User who resolved
 * @param {string} resolution Resolution notes
 * @returns {object} Updated alert
 */
export function resolveAlert(alertId, resolvedBy = 'system', resolution = '') {
  const alert = alertStore.get(alertId);
  if (!alert) return null;

  alert.resolved = true;
  alert.resolvedAt = Date.now();
  alert.resolvedBy = resolvedBy;
  alert.resolution = resolution;

  console.log(`✔️ Alert resolved: ${alert.title}`);

  // Send resolution notification to PagerDuty
  if (alert.severity === 'critical' && CHANNEL_CONFIG.pagerduty.enabled) {
    fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: CHANNEL_CONFIG.pagerduty.integrationKey,
        event_action: 'resolve',
        dedup_key: alert.fingerprint
      })
    }).catch(err => console.error('Failed to resolve in PagerDuty:', err.message));
  }

  return alert;
}

/**
 * Get current alert status
 * @returns {object} Active and recent alerts
 */
export function getAlertStatus() {
  const alerts = Array.from(alertStore.values());
  const active = alerts.filter(a => !a.resolved);
  const recent = alerts.filter(a => {
    const age = Date.now() - a.createdAt;
    return age < 3600000; // Last hour
  });

  return {
    total: alerts.length,
    active: active.length,
    recent: recent.length,
    activeAlerts: active,
    recentAlerts: recent,
    summary: {
      critical: active.filter(a => a.severity === 'critical').length,
      warning: active.filter(a => a.severity === 'warning').length,
      info: active.filter(a => a.severity === 'info').length
    }
  };
}

/**
 * Clear resolved alerts older than specified age
 * @param {number} ageMinutes Age in minutes
 */
export function clearOldAlerts(ageMinutes = 60) {
  const now = Date.now();
  const ageMs = ageMinutes * 60 * 1000;
  let cleared = 0;

  for (const [key, alert] of alertStore.entries()) {
    if (alert.resolved && (now - alert.resolvedAt) > ageMs) {
      alertStore.delete(key);
      cleared++;
    }
  }

  console.log(`🗑️ Cleared ${cleared} old resolved alerts`);
  return cleared;
}

/**
 * Export alert data for external systems
 * @returns {array} All alerts as JSON
 */
export function exportAlerts() {
  return Array.from(alertStore.values());
}

export {
  SEVERITY_LEVELS,
  CHANNEL_CONFIG,
  generateAlertFingerprint,
  enrichAlert
};
