import { createApp } from '../server/app.js';
import { loadConfig } from '../server/config.js';
import { createServices } from '../server/services.js';
import { DAY_MS } from '../server/shared/clock.js';
import { openDatabase } from '../server/shared/db/database.js';

export const ADMIN_PHONE = '0660000000';
export const PASSWORD = 'password123';

export const createTestClock = (start = '2026-10-01T09:00:00.000Z') => {
  let current = new Date(start).getTime();
  return {
    now: () => new Date(current),
    advance(ms) {
      current += ms;
    },
    advanceDays(days) {
      current += days * DAY_MS;
    },
  };
};

const silentLogger = { info() {}, error: (...args) => console.error(...args) };

export const startTestServer = async ({ env = {}, clock = createTestClock() } = {}) => {
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_FILE: ':memory:',
    RATE_LIMITS: 'off',
    LOG_REQUESTS: 'off',
    ADMIN_PHONES: ADMIN_PHONE,
    ...env,
  });
  const db = openDatabase(':memory:');
  const services = createServices({ db, clock, config });
  const app = createApp({ config, services, logger: silentLogger });
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return {
    baseUrl,
    clock,
    db,
    services,
    client: () => createClient(baseUrl),
    close: () => new Promise((resolve) => {
      server.closeAllConnections();
      server.close(() => {
        db.close();
        resolve();
      });
    }),
  };
};

// A cookie-keeping JSON client that behaves like one browser.
export const createClient = (baseUrl) => {
  let cookie = '';
  const request = async (method, path, body, headers = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    });
    for (const header of response.headers.getSetCookie()) {
      const [pair] = header.split(';');
      const index = pair.indexOf('=');
      if (pair.slice(0, index) === 'kh_session') cookie = pair.slice(index + 1) ? pair : '';
    }
    const text = await response.text();
    let data = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // Non-JSON bodies (HTML, XML) are returned as text.
    }
    return { status: response.status, data, headers: response.headers };
  };
  return {
    request,
    get: (path, headers) => request('GET', path, undefined, headers),
    post: (path, body = {}, headers) => request('POST', path, body, headers),
    put: (path, body = {}, headers) => request('PUT', path, body, headers),
    patch: (path, body = {}, headers) => request('PATCH', path, body, headers),
    del: (path, headers) => request('DELETE', path, undefined, headers),
    get hasSession() {
      return Boolean(cookie);
    },
  };
};

let phoneCounter = 0;
export const nextPhone = () => `0550${String(++phoneCounter).padStart(6, '0')}`;

// Places used across tests: Bir El Ater (wilaya 62) and two communes of Tébessa (wilaya 12).
export const PLACES = {
  birElAter: { wilayaCode: 62, communeId: 365 },
  negrine: { wilayaCode: 62, communeId: 372 },
  tebessa: { wilayaCode: 12, communeId: 364 },
  cheria: { wilayaCode: 12, communeId: 366 },
  algiers: { wilayaCode: 16, communeId: 554 },
};

export const signUp = async (server, { name = 'مستخدم تجريبي', role = 'seeker', phone = nextPhone(), wilayaCode = 62 } = {}) => {
  const client = server.client();
  const response = await client.post('/api/auth/register', { name, phone, password: PASSWORD, role, wilayaCode, acceptTerms: true });
  if (response.status !== 201) throw new Error(`sign up failed: ${response.status} ${JSON.stringify(response.data)}`);
  return { client, user: response.data.user, phone };
};

export const validJob = (overrides = {}) => ({
  title: 'مطلوب بائع في محل مواد غذائية',
  category: 'commerce',
  jobType: 'full_time',
  communeId: 365,
  address: 'وسط المدينة',
  description: 'نبحث عن بائع جاد ومنظم للعمل في محل مواد غذائية بوسط المدينة.',
  requirements: 'خبرة سنة على الأقل',
  salaryPeriod: 'month',
  salaryMin: 30000,
  salaryMax: 40000,
  positions: 1,
  contactPhone: '0661234567',
  isUrgent: false,
  ...overrides,
});
