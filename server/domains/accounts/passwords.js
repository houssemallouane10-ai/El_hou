import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;

export const hashPassword = async (password) => {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH, PARAMS);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), key.toString('base64')].join('$');
};

export const verifyPassword = async (password, stored) => {
  const [algorithm, n, r, p, salt, key] = String(stored ?? '').split('$');
  if (algorithm !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64');
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return timingSafeEqual(actual, expected);
};

// Spends the same work as a real check so unknown phone numbers cannot be told apart by timing.
let decoyHash = null;
export const burnPasswordCheck = async (password) => {
  decoyHash ??= await hashPassword('khedmati-decoy-password');
  await verifyPassword(password, decoyHash);
  return false;
};

const TEMPORARY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export const generateTemporaryPassword = (length = 10) => {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => TEMPORARY_ALPHABET[byte % TEMPORARY_ALPHABET.length]).join('');
};
