import { invalid, notFound } from './errors.js';
import { isMobilePhone, isPhone, normalizePhone } from '../../shared/phone.js';

// Control characters, zero-width spaces, BOM and line/paragraph separators never belong in user text.
const UNWANTED_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B\u2028\u2029\uFEFF]/g;

const cleanLine = (value) => value.replace(UNWANTED_CHARS, '').replace(/\s+/g, ' ').trim();

const cleanMultiline = (value) => value
  .replace(/\r\n?/g, '\n')
  .replace(UNWANTED_CHARS, '')
  .split('\n')
  .map((line) => line.replace(/[ \t]+/g, ' ').trim())
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const isBlank = (value) => value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

// Collects field errors for one untrusted payload and throws a single VALIDATION_FAILED error.
// With `partial`, absent fields are skipped entirely (PATCH semantics); explicit null/'' clears them.
export const createValidator = (input, { partial = false } = {}) => {
  const source = input !== null && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const values = {};
  const errors = {};

  const fail = (field, code) => {
    errors[field] ??= code;
  };

  const begin = (field, required) => {
    const value = source[field];
    if (partial && value === undefined) return { skip: true };
    if (isBlank(value)) {
      if (required) fail(field, 'required');
      else values[field] = null;
      return { skip: true };
    }
    return { skip: false, value };
  };

  const validator = {
    text(field, { required = false, min = 0, max = Infinity, multiline = false } = {}) {
      const { skip, value } = begin(field, required);
      if (skip) return validator;
      if (typeof value !== 'string') {
        fail(field, 'invalid');
        return validator;
      }
      const cleaned = multiline ? cleanMultiline(value) : cleanLine(value);
      if (!cleaned) {
        if (required) fail(field, 'required');
        else values[field] = null;
      } else if (cleaned.length < min) fail(field, 'too_short');
      else if (cleaned.length > max) fail(field, 'too_long');
      else values[field] = cleaned;
      return validator;
    },

    secret(field, { min = 0, max = 1024 } = {}) {
      const value = source[field];
      if (partial && value === undefined) return validator;
      if (typeof value !== 'string' || value.length === 0) fail(field, isBlank(value) ? 'required' : 'invalid');
      else if (value.length < min) fail(field, 'too_short');
      else if (value.length > max) fail(field, 'too_long');
      else values[field] = value;
      return validator;
    },

    integer(field, { required = false, min = -Infinity, max = Infinity } = {}) {
      const { skip, value } = begin(field, required);
      if (skip) return validator;
      const number = typeof value === 'string' ? Number(value.trim()) : value;
      if (typeof number !== 'number' || !Number.isInteger(number)) fail(field, 'invalid');
      else if (number < min) fail(field, 'too_small');
      else if (number > max) fail(field, 'too_large');
      else values[field] = number;
      return validator;
    },

    oneOf(field, allowed, { required = false } = {}) {
      const { skip, value } = begin(field, required);
      if (skip) return validator;
      if (allowed.has(value)) values[field] = value;
      else fail(field, 'invalid');
      return validator;
    },

    boolean(field) {
      const value = source[field];
      if (value === undefined || value === null) {
        if (!(partial && value === undefined)) values[field] = false;
      } else if (typeof value === 'boolean') values[field] = value;
      else fail(field, 'invalid');
      return validator;
    },

    phone(field, { required = false, mobileOnly = false } = {}) {
      const { skip, value } = begin(field, required);
      if (skip) return validator;
      if (typeof value !== 'string' && typeof value !== 'number') {
        fail(field, 'invalid');
        return validator;
      }
      const phone = normalizePhone(value);
      const valid = mobileOnly ? isMobilePhone(phone) : isPhone(phone);
      if (valid) values[field] = phone;
      else fail(field, mobileOnly ? 'invalid_mobile' : 'invalid_phone');
      return validator;
    },

    list(field, { maxItems = Infinity, maxLength = Infinity, allowed = null } = {}) {
      const value = source[field];
      if (partial && value === undefined) return validator;
      if (value === undefined || value === null) {
        values[field] = [];
        return validator;
      }
      if (!Array.isArray(value)) {
        fail(field, 'invalid');
        return validator;
      }
      const items = [];
      for (const item of value) {
        if (typeof item !== 'string') {
          fail(field, 'invalid');
          return validator;
        }
        const cleaned = cleanLine(item);
        if (!cleaned) continue;
        if (allowed && !allowed.has(cleaned)) {
          fail(field, 'invalid');
          return validator;
        }
        if (cleaned.length > maxLength) {
          fail(field, 'item_too_long');
          return validator;
        }
        if (!items.some((existing) => existing.toLowerCase() === cleaned.toLowerCase())) items.push(cleaned);
      }
      if (items.length > maxItems) fail(field, 'too_many');
      else values[field] = items;
      return validator;
    },

    result() {
      if (Object.keys(errors).length > 0) throw invalid(errors);
      return values;
    },
  };

  return validator;
};

export const parseId = (value) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

export const requireIdParam = (value, code = 'NOT_FOUND') => {
  const id = parseId(value);
  if (!id) throw notFound(code);
  return id;
};
