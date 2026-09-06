import crypto from 'crypto';

const PREFIX = 'enc:v1:';
const DEV_KEY_HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function getKey() {
  const raw = process.env.FIELD_ENCRYPTION_KEY || '';
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FIELD_ENCRYPTION_KEY must be 64 hex chars in production');
  }
  return Buffer.from(DEV_KEY_HEX, 'hex');
}

let warned = false;
function devWarning() {
  if (!process.env.FIELD_ENCRYPTION_KEY && process.env.NODE_ENV !== 'production' && !warned) {
    warned = true;
    console.warn('⚠️  FIELD_ENCRYPTION_KEY not set — using insecure dev key for field encryption');
  }
}

export function encryptValue(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return plaintext;
  }
  devWarning();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const text = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
}

export function decryptValue(payload) {
  if (typeof payload !== 'string' || !payload.startsWith(PREFIX)) {
    return payload;
  }
  devWarning();
  const parts = payload.split(':');
  const [ivB64, tagB64, ctB64] = [parts[2], parts[3], parts.slice(4).join(':')];
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error('Malformed encrypted payload');
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const text = Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function isEncryptedValue(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export default { encryptValue, decryptValue, isEncryptedValue };
