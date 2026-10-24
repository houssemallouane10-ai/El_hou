import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMobilePhone, normalizePhone } from '../shared/phone.js';

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
    publicUrl: String(env.PUBLIC_URL || '').replace(/\/+$/, ''),
    trustProxy: readTrustProxy(env.TRUST_PROXY),
    adminPhones: readList(env.ADMIN_PHONES).map(normalizePhone).filter(isMobilePhone),
    supportWhatsapp: isMobilePhone(normalizePhone(env.SUPPORT_WHATSAPP)) ? normalizePhone(env.SUPPORT_WHATSAPP) : '',
    sessionDays: readPositiveInt(env.SESSION_DAYS, 60),
    rateLimits: env.RATE_LIMITS !== 'off',
    logRequests: env.LOG_REQUESTS !== 'off',
  };
};
