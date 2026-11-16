import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
const format = 'sasago3-encrypted-backup-v1';
const derive = (secret) => {
  if (typeof secret !== 'string' || secret.trim().length < 32)
    throw new Error('BACKUP_KEY_MISSING');
  return hkdfSync('sha256', secret.trim(), 'sasago3/backup', format, 32);
};
export function sealBackup(payload, secret) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', derive(secret), iv);
  cipher.setAAD(Buffer.from(format));
  const data = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return {
    format,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  };
}
export function openBackup(archive, secret) {
  if (
    archive?.format !== format ||
    !['iv', 'tag', 'data'].every((key) => typeof archive[key] === 'string') ||
    Object.keys(archive).length !== 4
  )
    throw new Error('BACKUP_FORMAT');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    derive(secret),
    Buffer.from(archive.iv, 'base64'),
  );
  decipher.setAAD(Buffer.from(format));
  decipher.setAuthTag(Buffer.from(archive.tag, 'base64'));
  try {
    return JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(archive.data, 'base64')),
        decipher.final(),
      ]).toString('utf8'),
    );
  } catch {
    throw new Error('BACKUP_AUTHENTICATION_FAILED');
  }
}
