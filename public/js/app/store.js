import { api } from '../shared/api.js';

// Session state shared by every screen: the signed-in user, saved ids and unread counters.
const EMPTY_SUMMARY = { notifications: 0, messages: 0, applications: 0 };

const state = {
  user: null,
  savedJobs: new Set(),
  savedWorkers: new Set(),
  summary: { ...EMPTY_SUMMARY },
  meta: null,
};

const listeners = new Set();

const emit = (change) => {
  for (const listener of listeners) listener(change, state);
};

export const store = {
  get user() {
    return state.user;
  },
  get summary() {
    return state.summary;
  },
  get meta() {
    return state.meta;
  },
  isSaved: (kind, id) => (kind === 'job' ? state.savedJobs : state.savedWorkers).has(id),

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setSession({ user, saved, summary }) {
    state.user = user ?? null;
    state.savedJobs = new Set(saved?.jobs ?? []);
    state.savedWorkers = new Set(saved?.workers ?? []);
    state.summary = { ...EMPTY_SUMMARY, ...(summary ?? {}) };
    emit('session');
  },

  setUser(user) {
    state.user = user;
    emit('user');
  },

  setSummary(summary) {
    state.summary = { ...EMPTY_SUMMARY, ...summary };
    emit('summary');
  },

  setSaved(kind, id, saved) {
    const set = kind === 'job' ? state.savedJobs : state.savedWorkers;
    if (saved) set.add(id);
    else set.delete(id);
    emit('saved');
  },

  setMeta(meta) {
    state.meta = meta;
    emit('meta');
  },

  clear() {
    this.setSession({ user: null });
  },
};

export const loadSession = async () => {
  store.setSession(await api.get('/api/session'));
};

export const refreshSummary = async () => {
  if (!store.user) return;
  try {
    store.setSummary(await api.get('/api/me/summary'));
  } catch {
    // Polling is best effort; the next tick or focus retries.
  }
};

export const loadMeta = async ({ fresh = false } = {}) => {
  if (store.meta && !fresh) return store.meta;
  const meta = await api.get('/api/meta');
  store.setMeta(meta);
  return meta;
};
