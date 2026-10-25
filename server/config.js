import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMobilePhone, normalizePhone } from '../shared/phone.js';
import { ANDROID_PACKAGE, EMAIL, SHA256_FINGERPRINT, normalizeFingerprint } from './shared/formats.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const readList = (value) => String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean);

const readTrustProxy = (value) => {
  if (value === undefined || value === '' || value === 'false' || value === '0') return false;
  if (value === 'true') return true;
  return Number.isInteger(Number(value)) ? Number(value) : value;
};

const readPositiveInt = (value, fallback) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
};

const readNonNegativeInt = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
};

// The Android app (a Trusted Web Activity) proves it belongs to this site through
// /.well-known/assetlinks.json. Fingerprints are the SHA-256 of the signing certificates: the
// Play App Signing key from Play Console and, for testing, the upload key. These environment
// values are defaults; owners normally enter them in the admin console (Settings).
const readAndroidApp = (env) => {
  const packageName = String(env.ANDROID_PACKAGE_NAME ?? '').trim();
  const fingerprints = readList(env.ANDROID_SHA256_FINGERPRINTS).map(normalizeFingerprint);
  const invalid = fingerprints.filter((item) => !SHA256_FINGERPRINT.test(item));
  if (invalid.length > 0) throw new Error(`ANDROID_SHA256_FINGERPRINTS has malformed entries: ${invalid.join(', ')}`);
  if (packageName && !ANDROID_PACKAGE.test(packageName)) throw new Error(`ANDROID_PACKAGE_NAME is not a valid package name: ${packageName}`);
  return { packageName, fingerprints };
};

export const loadConfig = (env = process.env) => {
  const dataDir = path.resolve(rootDir, env.DATA_DIR || 'data');
  return {
    env: env.NODE_ENV || 'development',
    isProduction: env.NODE_ENV === 'production',
    port: readPositiveInt(env.PORT, 3000),
    host: env.HOST || '0.0.0.0',
    rootDir,
    publicDir: path.join(rootDir, 'public'),
    sharedDir: path.join(rootDir, 'shared'),
    dataDir,
    databaseFile: env.DATABASE_FILE || path.join(dataDir, 'khedmati.db'),
    // Render provides RENDER_EXTERNAL_URL (https://<service>.onrender.com) to every web service.
    publicUrl: String(env.PUBLIC_URL || env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, ''),
    trustProxy: readTrustProxy(env.TRUST_PROXY),
    supportWhatsapp: isMobilePhone(normalizePhone(env.SUPPORT_WHATSAPP)) ? normalizePhone(env.SUPPORT_WHATSAPP) : '',
    supportEmail: EMAIL.test(String(env.SUPPORT_EMAIL ?? '').trim()) ? String(env.SUPPORT_EMAIL).trim() : '',
    androidApp: readAndroidApp(env),
    sessionDays: readPositiveInt(env.SESSION_DAYS, 60),
    // Daily database copies kept in DATA_DIR/backups; 0 turns backups off.
    backupDays: readNonNegativeInt(env.BACKUP_DAYS, 7),
    rateLimits: env.RATE_LIMITS !== 'off',
    logRequests: env.LOG_REQUESTS !== 'off',
  };
};
