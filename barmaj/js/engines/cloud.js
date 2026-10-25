// Runs code in the cloud. Providers are tried in order and the next one is
// used when a server does not answer:
//   1. the user's own Piston server (or a Piston key)
//   2. the user's own Judge0 server (or a RapidAPI key)
//   3. Compiler Explorer (godbolt.org): free, no account, CORS enabled
import { read, write } from '../store.js';

const CE = 'https://godbolt.org/api';
const DAY = 864e5;

class ProviderError extends Error {
  constructor(message, retry = true) {
    super(message);
    this.retry = retry;
  }
}

const request = async (url, opts = {}, timeout = 45000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  const stop = () => ctrl.abort();
  opts.signal?.addEventListener('abort', stop);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.text()).slice(0, 200); } catch { /* no body */ }
      throw new ProviderError(`HTTP ${res.status}${detail ? ': ' + detail : ''}`, res.status >= 500 || res.status === 429 || res.status === 404);
    }
    return res.json();
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    if (opts.signal?.aborted) throw e;
    throw new ProviderError(e.name === 'AbortError' ? 'timeout' : navigator.onLine === false ? 'offline' : 'network error');
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', stop);
  }
};

const version = (s) => (String(s).match(/\d+(\.\d+)*/)?.[0] || '0').split('.').map(Number);
const newer = (a, b) => {
  const x = version(a);
  const y = version(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (y[i] || 0) - (x[i] || 0);
  }
  return 0;
};

const splitArgs = (s) => (s || '').match(/"[^"]*"|'[^']*'|\S+/g)?.map((a) => a.replace(/^["']|["']$/g, '')) || [];

const toB64 = (s) => {
  const bytes = new TextEncoder().encode(s || '');
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const fromB64 = (s) => {
  if (!s) return '';
  const bin = atob(s);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

// ---------------------------------------------------------------- Compiler Explorer
const UNWANTED = /trunk|nightly|snapshot|\bdev\b|beta|alpha|\brc\d*|preview|experimental|assert|debug|cross|arm|aarch|risc|mips|power|ppc|wasm|avr|msp|mingw|clang-cl|msvc|\bcl\b|nvc|cuda|edg|wine|zapcc|elvm|tendra|z180|6502|s390|loongarch|sparc|xtensa|ellcc|ez80|bpf|kvx|tricore|hexagon|vax|m68k|sh4|c6x|ia64|arc|lc3|sdcc|cproc|chibicc|tcc|movfuscator|qnx|android|ios|static|clad|cppx|circle|tinyc/i;
const PREFER = { c: /gcc/i, 'c++': /gcc/i, objc: /gcc/i, fortran: /gfortran/i, d: /ldc|dmd/i, csharp: /\.net|dotnet/i, fsharp: /\.net|dotnet/i, vb: /\.net|dotnet/i };

export const pickCompiler = (langId, list) => {
  const ok = list.filter((c) => c.supportsExecute && !c.hidden);
  const score = (c) => (UNWANTED.test(`${c.name} ${c.id}`) ? 0 : 4)
    + (!c.instructionSet || c.instructionSet === 'amd64' ? 2 : 0)
    + (PREFER[langId]?.test(c.name) ? 1 : 0);
  return ok.sort((a, b) => score(b) - score(a) || newer(a.semver || a.name, b.semver || b.name))[0] || null;
};

const ceCompiler = async (lang, signal, fresh) => {
  const key = 'ce:' + lang.ce;
  const cached = read(key, null);
  if (cached && !fresh && Date.now() - cached.t < 3 * DAY) return cached.c;
  const fields = 'id,name,lang,semver,supportsExecute,instructionSet,hidden';
  const list = await request(`${CE}/compilers/${encodeURIComponent(lang.ce)}?fields=${fields}`, { headers: { Accept: 'application/json' }, signal });
  const c = pickCompiler(lang.ce, Array.isArray(list) ? list : []);
  write(key, { t: Date.now(), c: c && { id: c.id, name: c.name } });
  return c && { id: c.id, name: c.name };
};

export const ceInfo = (lang) => read('ce:' + lang.ce, null)?.c;

const lines = (arr) => (Array.isArray(arr) ? arr.map((l) => l.text).join('\n') : '');
const tagged = (arr) => (Array.isArray(arr) ? arr : [])
  .filter((l) => l.tag?.line)
  .map((l) => ({ line: l.tag.line, col: l.tag.column, severity: l.tag.severity >= 3 ? 'error' : 'warning', text: l.tag.text }));

const runCE = async (lang, file, signal, retried = false) => {
  const compiler = await ceCompiler(lang, signal, retried);
  if (!compiler) throw new ProviderError('no-exec', false);
  const body = {
    source: file.code,
    compiler: compiler.id,
    lang: lang.ce,
    allowStoreCodeDebug: false,
    options: {
      userArguments: file.flags ?? lang.flags ?? '',
      executeParameters: { args: splitArgs(file.args), stdin: file.stdin || '' },
      compilerOptions: { executorRequest: true, skipAsm: true },
      filters: { execute: true },
      tools: [],
      libraries: [],
    },
  };
  let data;
  try {
    data = await request(`${CE}/compiler/${encodeURIComponent(compiler.id)}/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    // The compiler list changes over time: refresh it once
    if (!retried && /HTTP 404/.test(e.message)) return runCE(lang, file, signal, true);
    throw e;
  }
  const ex = data.execResult || data;
  const build = ex.buildResult || (data.execResult ? data : null);
  const compileFailed = ex.didExecute === false && build && build.code !== 0;
  return {
    provider: 'Compiler Explorer',
    engine: compiler.name,
    compileOut: lines(build?.stdout),
    compileErr: lines(build?.stderr),
    stdout: lines(ex.stdout),
    stderr: compileFailed ? '' : lines(ex.stderr),
    exitCode: compileFailed ? build.code : ex.code,
    compileFailed,
    timedOut: !!ex.timedOut,
    time: ex.execTime ? Number(ex.execTime) : null,
    problems: [...tagged(build?.stderr), ...tagged(ex.stderr)],
  };
};

// ---------------------------------------------------------------- Piston
const pistonBase = (url) => {
  const u = url.trim().replace(/\/+$/, '');
  return /\/api\/v2(\/piston)?$/.test(u) ? u : `${u}/api/v2`;
};
const pistonHeaders = (key) => ({ 'Content-Type': 'application/json', ...(key ? { Authorization: key } : {}) });

const pistonRuntimes = async (cfg, signal) => {
  const key = 'piston:' + cfg.url;
  const cached = read(key, null);
  if (cached && Date.now() - cached.t < DAY) return cached.list;
  const list = await request(`${pistonBase(cfg.url)}/runtimes`, { headers: pistonHeaders(cfg.key), signal });
  write(key, { t: Date.now(), list });
  return list;
};

export const testPiston = async (cfg) => (await request(`${pistonBase(cfg.url)}/runtimes`, { headers: pistonHeaders(cfg.key) }, 15000)).length;

const runPiston = async (lang, file, signal, cfg) => {
  const runtimes = await pistonRuntimes(cfg, signal);
  const rt = runtimes
    .filter((r) => r.language === lang.piston || r.aliases?.includes(lang.piston))
    .sort((a, b) => newer(a.version, b.version))[0];
  if (!rt) throw new ProviderError('no-runtime');
  const data = await request(`${pistonBase(cfg.url)}/execute`, {
    method: 'POST',
    headers: pistonHeaders(cfg.key),
    body: JSON.stringify({
      language: rt.language,
      version: rt.version,
      files: [{ name: lang.id === 'java' ? 'Main.java' : `main.${lang.ext}`, content: file.code }],
      stdin: file.stdin || '',
      args: splitArgs(file.args),
    }),
    signal,
  });
  if (!data.run) throw new ProviderError(data.message || 'bad response', false);
  const compileFailed = !!data.compile && data.compile.code !== 0 && data.compile.code !== null;
  return {
    provider: 'Piston',
    engine: `${rt.language} ${rt.version}`,
    compileOut: data.compile?.stdout || '',
    compileErr: data.compile?.stderr || '',
    stdout: compileFailed ? '' : data.run.stdout,
    stderr: compileFailed ? '' : data.run.stderr,
    exitCode: compileFailed ? data.compile.code : data.run.code ?? (data.run.signal ? 128 : 0),
    signal: data.run.signal,
    compileFailed,
    timedOut: data.run.status === 'TO' || data.run.signal === 'SIGKILL',
    time: data.run.wall_time ?? null,
    memory: data.run.memory ?? null,
    problems: [],
  };
};

// ---------------------------------------------------------------- Judge0
const judge0Headers = (cfg) => {
  const h = { 'Content-Type': 'application/json' };
  const host = (() => { try { return new URL(cfg.url).host; } catch { return ''; } })();
  if (host.endsWith('rapidapi.com')) Object.assign(h, { 'X-RapidAPI-Key': cfg.key, 'X-RapidAPI-Host': host });
  else if (cfg.key) h['X-Auth-Token'] = cfg.key;
  return h;
};
const judge0Base = (cfg) => cfg.url.trim().replace(/\/+$/, '');

const judge0Languages = async (cfg, signal) => {
  const key = 'judge0:' + cfg.url;
  const cached = read(key, null);
  if (cached && Date.now() - cached.t < DAY) return cached.list;
  const list = await request(`${judge0Base(cfg)}/languages`, { headers: judge0Headers(cfg), signal });
  write(key, { t: Date.now(), list });
  return list;
};

export const testJudge0 = async (cfg) => (await request(`${judge0Base(cfg)}/languages`, { headers: judge0Headers(cfg) }, 15000)).length;

const runJudge0 = async (lang, file, signal, cfg) => {
  const list = await judge0Languages(cfg, signal);
  const lng = list.filter((l) => l.name.startsWith(lang.judge0)).sort((a, b) => newer(a.name.replace(/^[^(]*/, ''), b.name.replace(/^[^(]*/, '')))[0];
  if (!lng) throw new ProviderError('no-runtime');
  const base = judge0Base(cfg);
  let data = await request(`${base}/submissions?base64_encoded=true&wait=true`, {
    method: 'POST',
    headers: judge0Headers(cfg),
    body: JSON.stringify({
      source_code: toB64(file.code),
      language_id: lng.id,
      stdin: toB64(file.stdin || ''),
      command_line_arguments: file.args || '',
    }),
    signal,
  });
  // Servers that ignore wait=true return a token to poll
  for (let i = 0; data.token && (!data.status || data.status.id <= 2) && i < 40; i++) {
    await new Promise((r) => setTimeout(r, 750));
    data = await request(`${base}/submissions/${data.token}?base64_encoded=true`, { headers: judge0Headers(cfg), signal });
  }
  const status = data.status || {};
  const compileFailed = status.id === 6;
  return {
    provider: 'Judge0',
    engine: lng.name,
    compileOut: '',
    compileErr: fromB64(data.compile_output),
    stdout: fromB64(data.stdout),
    stderr: fromB64(data.stderr) + (status.id >= 7 && status.id <= 12 && !data.stderr ? `${status.description}\n` : ''),
    exitCode: compileFailed ? 1 : data.exit_code ?? (status.id === 3 || status.id === 4 ? 0 : 1),
    compileFailed,
    timedOut: status.id === 5,
    time: data.time ? Number(data.time) * 1000 : null,
    memory: data.memory ? data.memory * 1024 : null,
    problems: [],
  };
};

// ---------------------------------------------------------------- dispatch
export const providersFor = (lang, s) => [
  s.piston.url && lang.piston && { name: 'Piston', run: (l, f, sig) => runPiston(l, f, sig, s.piston) },
  s.judge0.url && lang.judge0 && { name: 'Judge0', run: (l, f, sig) => runJudge0(l, f, sig, s.judge0) },
  s.ce && lang.ce && { name: 'Compiler Explorer', run: runCE },
].filter(Boolean);

let controller = null;

export const runCloud = async (lang, file, s, onRetry) => {
  const providers = providersFor(lang, s);
  if (!providers.length) return { error: 'no-server' };
  controller = new AbortController();
  const errors = [];
  try {
    for (const p of providers) {
      try {
        return await p.run(lang, file, controller.signal);
      } catch (e) {
        if (controller.signal.aborted) return { stopped: true };
        errors.push(`${p.name}: ${e.message}`);
        if (e.message === 'no-exec') { if (providers.length === 1) return { error: 'not-available' }; continue; }
        if (p !== providers[providers.length - 1]) onRetry?.(p.name);
      }
    }
    const offline = errors.every((e) => /offline|network/.test(e)) && navigator.onLine === false;
    return { error: offline ? 'offline' : 'down', detail: errors.join(' · ') };
  } finally {
    controller = null;
  }
};

export const stopCloud = () => controller?.abort();
