// Runs JavaScript and TypeScript in a fresh worker per run.
// TypeScript is stripped with Sucrase, which also reports syntax errors with
// their position. Code with import/export runs as a module, and bare package
// names are loaded from esm.sh, so `import _ from "lodash"` just works online.
importScripts('stdin.js', '../vendor/sucrase.js');

const post = (type, data) => postMessage({ type, ...data });
const out = (text) => post('out', { text });
const err = (text) => post('err', { text });

let blobUrl = '';
const FILE = { js: 'main.js', ts: 'main.ts' };
let fileName = 'main.js';

// ---------------------------------------------------------------- inspect
const ident = /^[A-Za-z_$][\w$]*$/;
const quote = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;

const cleanStack = (stack) => stack
  .split('\n')
  .filter((l, i) => i === 0 || l.includes(blobUrl) || !/(js\.worker|stdin)\.js|<anonymous>|^\s*at\s*$/.test(l))
  .map((l) => l.split(blobUrl).join(fileName))
  .filter((l) => !/importScripts|js\.worker\.js/.test(l))
  .join('\n');

const inspect = (v, level = 0, seen = new Set(), top = true) => {
  const t = typeof v;
  if (t === 'string') return top ? v : quote(v);
  if (t === 'number') return Object.is(v, -0) ? '-0' : String(v);
  if (t === 'bigint') return `${v}n`;
  if (t === 'boolean' || v === undefined || v === null) return String(v);
  if (t === 'symbol') return v.toString();
  if (t === 'function') {
    if (/^class\s/.test(Function.prototype.toString.call(v))) return `[class ${v.name || '(anonymous)'}]`;
    return `[Function: ${v.name || '(anonymous)'}]`;
  }
  if (v instanceof Error) return cleanStack(v.stack || `${v.name}: ${v.message}`);
  if (v instanceof Date) return Number.isNaN(+v) ? 'Invalid Date' : v.toISOString();
  if (v instanceof RegExp) return String(v);
  if (v instanceof Promise) return 'Promise { … }';
  if (seen.has(v)) return '[Circular]';
  if (level > 3) return Array.isArray(v) ? '[Array]' : '[Object]';
  seen.add(v);
  try {
    let open = '{';
    let close = '}';
    let prefix = '';
    let items = [];
    if (Array.isArray(v) || ArrayBuffer.isView(v)) {
      open = '[';
      close = ']';
      if (!Array.isArray(v)) prefix = `${v.constructor.name}(${v.length}) `;
      const n = Math.min(v.length, 100);
      for (let i = 0; i < n; i++) items.push(inspect(v[i], level + 1, seen, false));
      if (v.length > n) items.push(`... ${v.length - n} more items`);
    } else if (v instanceof Map) {
      prefix = `Map(${v.size}) `;
      for (const [k, val] of v) items.push(`${inspect(k, level + 1, seen, false)} => ${inspect(val, level + 1, seen, false)}`);
    } else if (v instanceof Set) {
      prefix = `Set(${v.size}) `;
      for (const val of v) items.push(inspect(val, level + 1, seen, false));
    } else {
      const ctor = Object.getPrototypeOf(v)?.constructor?.name;
      if (ctor && ctor !== 'Object') prefix = `${ctor} `;
      if (Object.getPrototypeOf(v) === null) prefix = '[Object: null prototype] ';
      items = Object.keys(v).map((k) => `${ident.test(k) ? k : quote(k)}: ${inspect(v[k], level + 1, seen, false)}`);
    }
    if (!items.length) return `${prefix}${open}${close}`;
    const one = `${prefix}${open} ${items.join(', ')} ${close}`;
    if (one.length <= 72 && !one.includes('\n')) return one;
    const pad = '  '.repeat(level + 1);
    return `${prefix}${open}\n${items.map((i) => pad + i.replace(/\n/g, '\n' + pad)).join(',\n')}\n${'  '.repeat(level)}${close}`;
  } finally {
    seen.delete(v);
  }
};

const format = (args) => {
  if (typeof args[0] === 'string' && /%[sdifoOjc%]/.test(args[0])) {
    const rest = args.slice(1);
    const head = args[0].replace(/%([sdifoOjc%])/g, (m, f) => {
      if (f === '%') return '%';
      if (!rest.length) return m;
      const a = rest.shift();
      if (f === 's') return typeof a === 'string' ? a : inspect(a, 1, new Set(), false);
      if (f === 'd' || f === 'i') return String(f === 'i' ? Math.trunc(Number(a)) : Number(a));
      if (f === 'f') return String(Number(a));
      if (f === 'c') return '';
      return inspect(a, 0, new Set(), false);
    });
    return [head, ...rest.map((a) => inspect(a))].join(' ');
  }
  return args.map((a) => inspect(a)).join(' ');
};

// ---------------------------------------------------------------- console
let indent = '';
const counts = {};
const timersByLabel = {};
const line = (args) => {
  const text = format(args);
  return (indent ? text.replace(/^/gm, indent) : text) + '\n';
};

const table = (data, cols) => {
  if (data === null || typeof data !== 'object') { out(line([data])); return; }
  const rows = [];
  const keys = new Set();
  let hasValues = false;
  const entries = data instanceof Map ? [...data.entries()] : Object.entries(data);
  for (const [k, v] of entries) {
    if (v !== null && typeof v === 'object') Object.keys(v).forEach((c) => keys.add(c));
    else hasValues = true;
    rows.push([k, v]);
  }
  const columns = cols || [...keys];
  const head = ['(index)', ...columns, ...(hasValues ? ['Values'] : [])];
  const cell = (v) => (v === undefined ? '' : typeof v === 'object' && v !== null ? inspect(v, 2, new Set(), false) : v);
  post('table', {
    columns: head,
    rows: rows.map(([k, v]) => [k, ...columns.map((c) => (v !== null && typeof v === 'object' ? cell(v[c]) : '')),
      ...(hasValues ? [v !== null && typeof v === 'object' ? '' : cell(v)] : [])]),
  });
};

self.console = {
  log: (...a) => out(line(a)),
  info: (...a) => out(line(a)),
  debug: (...a) => out(line(a)),
  warn: (...a) => err(line(a)),
  error: (...a) => err(line(a)),
  trace: (...a) => err(line(a) + cleanStack(new Error().stack).split('\n').slice(2).join('\n') + '\n'),
  dir: (v) => out(line([v])),
  table,
  clear: () => post('clear'),
  group: (...a) => { if (a.length) out(line(a)); indent += '  '; },
  groupCollapsed: (...a) => { if (a.length) out(line(a)); indent += '  '; },
  groupEnd: () => { indent = indent.slice(2); },
  assert: (ok, ...a) => { if (!ok) err(line(['Assertion failed' + (a.length ? ':' : ''), ...a])); },
  count: (l = 'default') => { counts[l] = (counts[l] || 0) + 1; out(line([`${l}: ${counts[l]}`])); },
  countReset: (l = 'default') => { counts[l] = 0; },
  time: (l = 'default') => { timersByLabel[l] = performance.now(); },
  timeLog: (l = 'default', ...a) => out(line([`${l}: ${(performance.now() - timersByLabel[l]).toFixed(3)}ms`, ...a])),
  timeEnd: (l = 'default') => { out(line([`${l}: ${(performance.now() - timersByLabel[l]).toFixed(3)}ms`])); delete timersByLabel[l]; },
};

// Browser-style input: prompt() blocks until the user answers
self.prompt = (message = '') => {
  if (message) out(String(message) + ' ');
  return barmajStdin.readLine();
};
self.readline = () => barmajStdin.readLine();
self.alert = (message = '') => out(String(message) + '\n');
self.confirm = (message = '') => {
  out(`${message} [y/n] `);
  return /^(y|yes|o|oui|نعم|اي|واه)/i.test((barmajStdin.readLine() || '').trim());
};

// ---------------------------------------------------------------- lifecycle
let started = 0;
let finished = false;
let mainDone = false;
let pending = 0;
const timeouts = new Set();
const intervals = new Set();
const native = {
  setTimeout: setTimeout.bind(self),
  clearTimeout: clearTimeout.bind(self),
  setInterval: setInterval.bind(self),
  clearInterval: clearInterval.bind(self),
  fetch: self.fetch?.bind(self),
};

const where = (e) => {
  const stack = String(e?.stack || '');
  const at = stack.split('\n').find((l) => l.includes(blobUrl) || l.includes(fileName));
  const m = at && at.match(/:(\d+):(\d+)\)?\s*$/);
  if (m) return { line: +m[1], col: +m[2] };
  const s = String(e?.message || '').match(/\((\d+):(\d+)\)/);
  return s ? { line: +s[1], col: +s[2] + 1 } : {};
};

const finish = (error) => {
  if (finished) return;
  finished = true;
  [...timeouts].forEach((id) => native.clearTimeout(id));
  [...intervals].forEach((id) => native.clearInterval(id));
  post('done', { ok: !error, time: performance.now() - started, error });
};

const fail = (e) => {
  const isErr = e instanceof Error;
  const name = isErr ? e.name : 'Uncaught';
  const message = isErr ? e.message : inspect(e, 0, new Set(), false);
  err((isErr ? cleanStack(e.stack || `${name}: ${message}`) : `Uncaught ${message}`) + '\n');
  finish({ name, message, ...where(e) });
};

const check = () => {
  if (mainDone && !finished && !timeouts.size && !intervals.size && !pending) {
    native.setTimeout(() => {
      if (!timeouts.size && !intervals.size && !pending) finish();
    }, 0);
  }
};

const guard = (fn) => {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') r.then(null, fail);
  } catch (e) {
    fail(e);
  }
};

self.setTimeout = (fn, ms, ...args) => {
  const id = native.setTimeout(() => {
    timeouts.delete(id);
    guard(() => (typeof fn === 'function' ? fn(...args) : (0, eval)(String(fn))));
    check();
  }, ms);
  timeouts.add(id);
  return id;
};
self.clearTimeout = (id) => {
  if (timeouts.delete(id)) { native.clearTimeout(id); check(); }
};
self.setInterval = (fn, ms, ...args) => {
  const id = native.setInterval(() => guard(() => fn(...args)), ms);
  intervals.add(id);
  return id;
};
self.clearInterval = (id) => {
  if (intervals.delete(id)) { native.clearInterval(id); check(); }
};
self.requestAnimationFrame = (fn) => self.setTimeout(() => fn(performance.now()), 16);
self.cancelAnimationFrame = (id) => self.clearTimeout(id);
if (native.fetch) {
  self.fetch = (...args) => {
    pending++;
    return native.fetch(...args).finally(() => { pending--; check(); });
  };
}

self.addEventListener('unhandledrejection', (e) => { e.preventDefault(); fail(e.reason); });
self.addEventListener('error', (e) => { e.preventDefault(); fail(e.error || new Error(e.message)); });

const isModule = (code) => /^\s*(import\s*[\w{*'"]|export\s)/m.test(code);

// Bare specifiers (lodash, dayjs/plugin/utc) are fetched from esm.sh
const resolveImports = (code) => code.replace(
  /(\bfrom\s*|\bimport\s*\(\s*|^\s*import\s*)(['"])([^'".\/][^'"]*)\2/gm,
  (m, head, q, spec) => (/^(https?:|data:|blob:)/.test(spec) ? m : `${head}${q}https://esm.sh/${spec}${q}`),
);

self.onmessage = async ({ data }) => {
  if (data.type !== 'run') return;
  fileName = FILE[data.lang] || 'main.js';
  barmajStdin.reset(data);
  let js;
  try {
    js = self.sucrase.transform(data.code, {
      transforms: data.lang === 'ts' ? ['typescript'] : [],
      disableESTransforms: true,
      filePath: fileName,
    }).code;
  } catch (e) {
    const message = String(e.message).replace(/^Error transforming [^:]*:\s*/, '');
    const m = message.match(/\((\d+):(\d+)\)/);
    err(`SyntaxError: ${message}\n`);
    post('done', { ok: false, time: 0, error: { name: 'SyntaxError', message, line: m ? +m[1] : 0, col: m ? +m[2] + 1 : 0 } });
    return;
  }
  started = performance.now();
  try {
    if (isModule(js)) {
      blobUrl = URL.createObjectURL(new Blob([resolveImports(js)], { type: 'text/javascript' }));
      await import(blobUrl);
    } else {
      // An async wrapper on the first line keeps line numbers and allows top-level await
      const wrapped = `self.__main = (async () => {${js}\n})();`;
      blobUrl = URL.createObjectURL(new Blob([wrapped], { type: 'text/javascript' }));
      importScripts(blobUrl);
      await self.__main;
    }
  } catch (e) {
    fail(e);
    return;
  }
  mainDone = true;
  check();
};
