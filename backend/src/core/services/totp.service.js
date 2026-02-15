/**
 * TotpService — TOTP-based Two-Factor Authentication.
 * Uses otplib for TOTP generation/verification and qrcode for QR code generation.
 */

import { TOTP, generateSecret as otpGenerateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';

const totp = new TOTP();

export class TotpService {
  /**
   * Generate a new TOTP secret and QR code for setup.
   * @param {string} userEmail - User's email (used in the otpauth URI)
   * @param {string} [issuer] - App name shown in authenticator apps
   * @returns {{ secret: string, otpauthUrl: string, qrCode: string }}
   */
  async generateSecret(userEmail, issuer) {
    const appName = issuer || process.env.APP_NAME || 'Lume';
    const secret = otpGenerateSecret();
    const otpauthUrl = generateURI(secret, userEmail, appName, 'SHA1', 6, 30);
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    return { secret, otpauthUrl, qrCode };
  }

  /**
   * Verify a TOTP token against a secret.
   * @param {string} secret - The user's TOTP secret
   * @param {string} token - The 6-digit token from their authenticator
   * @returns {boolean}
   */
  verifyToken(secret, token) {
    return verifySync(token, secret);
  }

  /**
   * Generate single-use backup codes.
   * @param {number} count - Number of codes to generate
   * @returns {string[]} Array of backup codes
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Verify a backup code against the stored list.
   * Returns the updated list with the used code removed, or null if invalid.
   * @param {string[]} storedCodes - Array of valid backup codes
   * @param {string} code - Code to verify
   * @returns {{ valid: boolean, remainingCodes: string[] }}
   */
  verifyBackupCode(storedCodes, code) {
    const upperCode = code.toUpperCase();
    const index = storedCodes.indexOf(upperCode);
    if (index === -1) {
      return { valid: false, remainingCodes: storedCodes };
    }
    const remainingCodes = [...storedCodes];
    remainingCodes.splice(index, 1);
    return { valid: true, remainingCodes };
  }
}

export default TotpService;
