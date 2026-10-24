/**
 * TotpService — TOTP-based Two-Factor Authentication (RFC 6238, SHA-1, 30s).
 * Implemented directly on node:crypto so enrollment works regardless of
 * the installed otplib major version.
 */

import QRCode from 'qrcode';
import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(input) {
  const clean = String(input || '').replace(/=+$/, '').toUpperCase();
  let bits = '';
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid base32 secret');
    }
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret, counter) {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, '0');
}

export function totpNow(secret, atMs = Date.now()) {
  return hotp(secret, Math.floor(atMs / 30000));
}

export class TotpService {
  /**
   * Generate a new TOTP secret and QR code for setup.
   * @param {string} userEmail - User's email (used in the otpauth URI)
   * @param {string} [issuer] - App name shown in authenticator apps
   * @returns {{ secret: string, otpauthUrl: string, qrCode: string }}
   */
  async generateSecret(userEmail, issuer) {
    const appName = issuer || process.env.APP_NAME || 'Lume';
    const bytes = crypto.randomBytes(20);
    let bits = '';
    for (const byte of bytes) {
      bits += byte.toString(2).padStart(8, '0');
    }
    let secret = '';
    for (let i = 0; i + 5 <= bits.length; i += 5) {
      secret += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
    }
    secret = secret.slice(0, 32).padEnd(32, 'A');
    const label = encodeURIComponent(`${appName}:${userEmail}`);
    const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(appName)}&algorithm=SHA1&digits=6&period=30`;
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    return { secret, otpauthUrl, qrCode };
  }

  /**
   * Verify a TOTP token against a secret (±1 step window).
   * @param {string} secret - The user's TOTP secret
   * @param {string} token - The 6-digit token from their authenticator
   * @returns {boolean}
   */
  verifyToken(secret, token, atMs = Date.now()) {
    if (!secret || !/^\d{6}$/.test(String(token || ''))) {
      return false;
    }
    try {
      const step = Math.floor(atMs / 30000);
      return [step - 1, step, step + 1].some((counter) => {
        const expected = hotp(secret, counter);
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(token)));
      });
    } catch {
      return false;
    }
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
