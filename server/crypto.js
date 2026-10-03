import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Session cookies are encrypted at rest with AES-256-GCM.
// Key: SECRET_KEY_HEX (64 hex chars) > SECRET_KEY (any string) > data/secret.key (local, auto-generated, mode 0600).
let key;

export function initKey(dataDir) {
  if (process.env.SECRET_KEY_HEX) {
    key = Buffer.from(process.env.SECRET_KEY_HEX.trim(), 'hex');
    if (key.length !== 32) throw new Error('SECRET_KEY_HEX must be 64 hex characters (32 bytes)');
    return;
  }
  if (process.env.SECRET_KEY) {
    key = crypto.createHash('sha256').update(process.env.SECRET_KEY).digest();
    return;
  }
  if (!dataDir) throw new Error('Set SECRET_KEY_HEX (64 hex chars) when using a hosted database — it encrypts stored LeetCode cookies');
  const file = path.join(dataDir, 'secret.key');
  if (fs.existsSync(file)) {
    key = Buffer.from(fs.readFileSync(file, 'utf8').trim(), 'hex');
  } else {
    key = crypto.randomBytes(32);
    fs.writeFileSync(file, key.toString('hex'), { mode: 0o600 });
  }
}

export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
}

export function decrypt(blob) {
  const buf = Buffer.from(blob, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
}
