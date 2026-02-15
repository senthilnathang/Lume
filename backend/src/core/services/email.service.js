/**
 * EmailService — SMTP email sending with template support.
 * Uses nodemailer for transport, supports HTML templates with variable interpolation.
 */

import nodemailer from 'nodemailer';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', 'templates');

let transporterInstance = null;

function getConfig() {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: process.env.EMAIL_FROM || 'noreply@lume.dev',
  };
}

function getTransporter() {
  if (!transporterInstance) {
    const config = getConfig();
    if (!config.auth.user || !config.auth.pass) {
      return null;
    }
    transporterInstance = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }
  return transporterInstance;
}

export class EmailService {
  /**
   * Send a raw email.
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} html - HTML body
   * @param {string} [text] - Plain text fallback
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendEmail(to, subject, html, text) {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn('[EmailService] SMTP not configured — skipping email to', to);
      return { success: false, error: 'SMTP not configured' };
    }

    try {
      const config = getConfig();
      const info = await transporter.sendMail({
        from: config.from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email using a named template with variable interpolation.
   * Templates are HTML files in src/core/templates/ with {{variable}} placeholders.
   * @param {string} to - Recipient email
   * @param {string} templateName - Template file name (without .html)
   * @param {Object} variables - Key-value pairs for interpolation
   * @param {string} [subjectOverride] - Override the template's default subject
   */
  async sendFromTemplate(to, templateName, variables = {}, subjectOverride) {
    const templatePath = join(TEMPLATES_DIR, `${templateName}.html`);
    if (!existsSync(templatePath)) {
      console.error(`[EmailService] Template not found: ${templateName}`);
      return { success: false, error: `Template not found: ${templateName}` };
    }

    let html = readFileSync(templatePath, 'utf-8');

    // Interpolate variables: {{varName}}
    const vars = {
      appName: process.env.APP_NAME || 'Lume',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
      year: new Date().getFullYear().toString(),
      ...variables,
    };

    for (const [key, value] of Object.entries(vars)) {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value ?? ''));
    }

    // Extract subject from template <!-- subject: ... --> comment
    const subjectMatch = html.match(/<!--\s*subject:\s*(.+?)\s*-->/);
    const subject = subjectOverride || (subjectMatch ? subjectMatch[1] : templateName);

    return this.sendEmail(to, subject, html);
  }

  /**
   * Send welcome email to a new user.
   */
  async sendWelcome(to, name) {
    return this.sendFromTemplate(to, 'welcome', { name });
  }

  /**
   * Send password reset email with a reset link.
   */
  async sendPasswordReset(to, name, resetToken) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    return this.sendFromTemplate(to, 'password-reset', { name, resetLink, resetToken });
  }

  /**
   * Send email verification link.
   */
  async sendEmailVerification(to, name, verifyToken) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyLink = `${frontendUrl}/verify-email?token=${verifyToken}`;
    return this.sendFromTemplate(to, 'email-verification', { name, verifyLink, verifyToken });
  }

  /**
   * Send a notification digest email.
   * @param {string} to - Recipient
   * @param {string} name - User's name
   * @param {Array<{title: string, body: string, link?: string}>} notifications
   */
  async sendNotificationDigest(to, name, notifications = []) {
    const notificationHtml = notifications
      .map(n => `<li><strong>${n.title}</strong>: ${n.body}${n.link ? ` <a href="${n.link}">View</a>` : ''}</li>`)
      .join('\n');
    return this.sendFromTemplate(to, 'notification-digest', {
      name,
      notificationList: notificationHtml,
      notificationCount: notifications.length.toString(),
    });
  }

  /**
   * Verify SMTP connection is working.
   */
  async verifyConnection() {
    const transporter = getTransporter();
    if (!transporter) {
      return { success: false, error: 'SMTP not configured' };
    }
    try {
      await transporter.verify();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Reset the transporter (e.g., after config change).
   */
  resetTransporter() {
    transporterInstance = null;
  }
}

export default EmailService;
