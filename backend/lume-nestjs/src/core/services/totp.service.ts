import { Injectable } from '@nestjs/common';
import {
  TOTP,
  generateSecret as otpGenerateSecret,
  generateURI,
  verifySync,
} from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';

const totp = new TOTP();

@Injectable()
export class TotpService {
  /**
   * Generate a new TOTP secret and QR code for setup.
   * @param userEmail - User's email (used in the otpauth URI)
   * @param issuer - App name shown in authenticator apps
   * @returns {{ secret: string, otpauthUrl: string, qrCode: string }}
   */
  async generateSecret(
    userEmail: string,
    issuer?: string,
  ): Promise<{ secret: string; otpauthUrl: string; qrCode: string }> {
    const appName = issuer || process.env.APP_NAME || 'Lume';
    const secret = otpGenerateSecret();
    const otpauthUrl = generateURI({ secret, label: userEmail, issuer: appName });
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    return { secret, otpauthUrl, qrCode };
  }

  /**
   * Verify a TOTP token against a secret.
   * @param token - The 6-digit token from their authenticator
   * @param secret - The user's TOTP secret
   * @returns boolean
   */
  verifyToken(token: string, secret: string): boolean {
    try {
      const result = verifySync({ token, secret });
      return !!result;
    } catch {
      return false;
    }
  }

  /**
   * Generate single-use backup codes.
   * @param count - Number of codes to generate
   * @returns Array of backup codes
   */
  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Verify a backup code against the stored list.
   * Returns the updated list with the used code removed, or null if invalid.
   * @param storedCodes - Array of valid backup codes
   * @param code - Code to verify
   * @returns {{ valid: boolean, remainingCodes: string[] }}
   */
  verifyBackupCode(
    storedCodes: string[],
    code: string,
  ): { valid: boolean; remainingCodes: string[] } {
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
