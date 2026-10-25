// Files, settings and version history, kept in localStorage on the device.
const P = 'barmaj:';

export const read = (key, fallback) => {
  try {
    const v = localStorage.getItem(P + key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
};

export const write = (key, value) => {
  try {
    localStorage.setItem(P + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const remove = (key) => {
  try { localStorage.removeItem(P + key); } catch { /* storage unavailable */ }
};

const defaults = {
  uiLang: 'ar',
  theme: 'auto',
  fontSize: 15,
  wrap: true,
  lineNumbers: true,
  closeBrackets: true,
  autocomplete: true,
  tabSize: 4,
  keybar: true,
  clearOnRun: true,
  autoOutput: true,
  livePreview: true,
  ce: true,
  piston: { url: '', key: '' },
  judge0: { url: '', key: '' },
  recent: [],
};

export const settings = { ...defaults, ...read('settings', {}) };

export const saveSettings = () => write('settings', settings);

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Files: an index of metadata plus one entry per file body
let index = read('files', []);

export const listFiles = () => [...index].sort((a, b) => b.updated - a.updated);

export const getFile = (id) => {
  const meta = index.find((f) => f.id === id);
  if (!meta) return null;
  const body = read('f:' + id, { code: '', stdin: '' });
  return { ...meta, ...body };
};

const saveIndex = () => write('files', index);

export const saveFile = (file) => {
  const { code, stdin, ...meta } = file;
  meta.updated = Date.now();
  meta.size = code.length;
  const i = index.findIndex((f) => f.id === file.id);
  if (i >= 0) index[i] = meta; else index.push(meta);
  const ok = write('f:' + file.id, { code, stdin });
  saveIndex();
  return ok;
};

export const createFile = ({ name, lang, code, stdin = '' }) => {
  const file = { id: uid(), name, lang, code, stdin, args: '', flags: null, created: Date.now() };
  saveFile(file);
  return file;
};

export const deleteFile = (id) => {
  index = index.filter((f) => f.id !== id);
  saveIndex();
  remove('f:' + id);
  remove('h:' + id);
};

export const uniqueName = (base, ext) => {
  const names = new Set(index.map((f) => f.name));
  let name = `${base}.${ext}`;
  for (let i = 2; names.has(name); i++) name = `${base}${i}.${ext}`;
  return name;
};

// Version history: a snapshot each time the code runs, newest first
const MAX_SNAPSHOTS = 30;

export const getHistory = (id) => read('h:' + id, []);

export const snapshot = (file) => {
  const list = getHistory(file.id);
  if (list[0]?.code === file.code) return;
  list.unshift({ t: Date.now(), code: file.code, lang: file.lang });
  write('h:' + file.id, list.slice(0, MAX_SNAPSHOTS));
};

export const storageUsed = () => {
  let n = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(P)) n += k.length + (localStorage.getItem(k) || '').length;
    }
  } catch { /* storage unavailable */ }
  return n * 2;
};

export const exportAll = () => ({
  app: 'barmaj',
  version: 1,
  exported: new Date().toISOString(),
  files: index.map((m) => ({ ...getFile(m.id), history: getHistory(m.id) })),
});

export const importAll = (data) => {
  if (!data || !Array.isArray(data.files)) throw new Error('not a Barmaj backup');
  let n = 0;
  for (const f of data.files) {
    if (typeof f.code !== 'string' || typeof f.lang !== 'string') continue;
    const exists = index.find((m) => m.id === f.id);
    const file = { ...f, id: exists ? uid() : f.id || uid() };
    delete file.history;
    saveFile(file);
    if (Array.isArray(f.history)) write('h:' + file.id, f.history.slice(0, MAX_SNAPSHOTS));
    n++;
  }
  return n;
};
