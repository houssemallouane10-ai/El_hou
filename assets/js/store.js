// localStorage can be missing or throw (private mode, blocked storage),
// so every access goes through these helpers.

const PREFIX = 'mdrj:';

export const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* storage unavailable: keep running without persistence */
    }
  },
};

export const session = {
  get(key, maxAgeMs) {
    try {
      const raw = sessionStorage.getItem(PREFIX + key);
      if (!raw) return null;
      const { at, value } = JSON.parse(raw);
      return Date.now() - at > maxAgeMs ? null : value;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), value }));
    } catch {
      /* quota or unavailable */
    }
  },
};
