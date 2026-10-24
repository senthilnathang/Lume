import { TotpService, totpNow } from '../../src/core/services/totp.service.js';

describe('totp service (F7.1)', () => {
  test('matches the RFC 6238 SHA-1 vector', () => {
    expect(totpNow('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59000)).toBe('287082');
  });

  test('generates unique verifiable secrets', async () => {
    const svc = new TotpService();
    const a = await svc.generateSecret('a@x.com');
    const b = await svc.generateSecret('a@x.com');
    expect(a.secret).toHaveLength(32);
    expect(a.secret).not.toBe(b.secret);
    expect(a.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    expect(a.qrCode).toMatch(/^data:image\/png;base64,/);
  });

  test('verifies current codes with clock window, rejects garbage', () => {
    const svc = new TotpService();
    expect(svc.verifyToken('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', totpNow('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'))).toBe(true);
    expect(svc.verifyToken('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', '000000')).toBe(false);
    expect(svc.verifyToken('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 'abc')).toBe(false);
    expect(svc.verifyToken('!!!', '123456')).toBe(false);
    expect(svc.verifyToken('', '123456')).toBe(false);
  });

  test('backup codes are single-use', () => {
    const svc = new TotpService();
    const codes = svc.generateBackupCodes(3);
    expect(new Set(codes).size).toBe(3);
    const first = svc.verifyBackupCode(codes, codes[0].toLowerCase());
    expect(first.valid).toBe(true);
    expect(first.remainingCodes).toHaveLength(2);
    expect(svc.verifyBackupCode(first.remainingCodes, codes[0]).valid).toBe(false);
  });
});
