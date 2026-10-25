// Runs code on the phone: engine workers (JS/TS, Python, Lua, SQL) and the
// HTML / Markdown previews rendered in sandboxed iframes.
import { t } from '../i18n.js';
import { icon } from '../icons.js';

const PYODIDE = '0.29.5';
export const pythonConfig = () => self.BARMAJ_PYODIDE || {
  urls: [`https://cdn.jsdelivr.net/pyodide/v${PYODIDE}/full/`, `https://cdn.jsdelivr.net/npm/pyodide@${PYODIDE}/`],
  packages: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE}/full/`,
};

const workerFile = { js: 'js', ts: 'js', python: 'py', lua: 'lua', sql: 'sql' };
let python = null;
let current = null;
const waiting = new Set();

const pythonWorker = () => {
  if (!python) python = new Worker('workers/py.worker.js');
  return python;
};

// Start downloading Python as soon as the user picks it
export const preload = (engine) => {
  if (engine === 'python') pythonWorker().postMessage({ type: 'boot', cfg: pythonConfig() });
};

// Python stays loaded for the next run; the user can also download it ahead of time
export const warmPython = () => new Promise((resolve, reject) => {
  const w = pythonWorker();
  const onMsg = ({ data }) => {
    if (data.type === 'ready') { w.removeEventListener('message', onMsg); resolve(data.version); }
    if (data.type === 'done' && data.engineError) { w.removeEventListener('message', onMsg); reject(new Error(data.engineError)); }
  };
  w.addEventListener('message', onMsg);
  w.postMessage({ type: 'boot', cfg: pythonConfig() });
});

const answer = async (id, value) => {
  waiting.delete(id);
  const sw = navigator.serviceWorker;
  const target = sw?.controller || (await sw?.getRegistration())?.active;
  target?.postMessage({ type: 'stdin', id, value });
};

export const runWorker = (engine, file, ctx) => new Promise((resolve) => {
  const persistent = engine === 'python';
  const w = persistent ? pythonWorker() : new Worker(`workers/${workerFile[engine]}.worker.js`);
  let settled = false;
  const finish = (result) => {
    if (settled) return;
    settled = true;
    w.onmessage = null;
    w.onerror = null;
    if (!persistent) w.terminate();
    current = null;
    resolve(result);
  };
  current = {
    stop() {
      for (const id of waiting) answer(id, null);
      ctx.term.cancelAsk?.();
      w.terminate();
      if (persistent) python = null;
      finish({ ok: false, stopped: true });
    },
  };
  w.onmessage = ({ data: m }) => {
    switch (m.type) {
      case 'out': ctx.term.write(m.text, 'out'); break;
      case 'err': ctx.term.write(m.text, 'err'); ctx.sawStderr = true; break;
      case 'echo': ctx.term.write(m.text, 'echo'); break;
      case 'clear': ctx.term.clear(); break;
      case 'image': ctx.term.image(m.src); break;
      case 'loading': ctx.loading(m.what === 'python' ? t('load.python') : t('load.packages', { list: m.list })); break;
      case 'running': ctx.running(); break;
      case 'table':
        ctx.term.table(m.columns, m.rows, m.sql ? `${m.sql.length > 90 ? m.sql.slice(0, 90) + '…' : m.sql} · ${t('out.rows', { n: m.total })}` : null);
        break;
      case 'sqlinfo':
        ctx.term.note(`✓ ${m.sql.split('\n')[0].slice(0, 70)} — ${t('out.changes', { n: m.changes })}`, 'ok');
        break;
      case 'stdin':
        waiting.add(m.id);
        ctx.waiting(true);
        ctx.term.ask().then((value) => {
          ctx.waiting(false);
          if (waiting.has(m.id)) answer(m.id, value);
        });
        break;
      case 'done': finish(m); break;
      default: break;
    }
  };
  w.onerror = (e) => {
    e.preventDefault();
    finish({ ok: false, engineError: e.message || 'worker failed' });
  };
  w.postMessage({
    type: 'run',
    lang: engine,
    code: file.code,
    stdin: file.stdin,
    interactive: true,
    cfg: engine === 'python' ? pythonConfig() : undefined,
  });
});

export const stopLocal = () => current?.stop();

// ---------------------------------------------------------------- previews
const consoleBridge = (token) => `<script>(function(){var T=${JSON.stringify(token)};function s(k,a){try{parent.postMessage({__barmaj:T,k:k,a:a.map(function(x){if(typeof x==='string')return x;try{return x instanceof Error?String(x):JSON.stringify(x)}catch(e){return String(x)}})},'*')}catch(e){}}['log','info','warn','error','debug'].forEach(function(k){var o=console[k];console[k]=function(){s(k,[].slice.call(arguments));try{o.apply(console,arguments)}catch(e){}}});addEventListener('error',function(e){s('error',[(e.message||'Error')+(e.lineno?' ('+e.lineno+':'+e.colno+')':'')])});addEventListener('unhandledrejection',function(e){s('error',['Uncaught (in promise) '+((e.reason&&e.reason.message)||e.reason)])});var m={};try{localStorage.length}catch(e){var st={getItem:function(k){return k in m?m[k]:null},setItem:function(k,v){m[k]=String(v)},removeItem:function(k){delete m[k]},clear:function(){m={}},key:function(i){return Object.keys(m)[i]||null}};Object.defineProperty(st,'length',{get:function(){return Object.keys(m).length}});try{Object.defineProperty(window,'localStorage',{value:st});Object.defineProperty(window,'sessionStorage',{value:st})}catch(e){}}})();</script>`;

let previewListener = null;

const previewShell = (frame, onReload) => {
  const wrap = document.createElement('div');
  wrap.className = 'preview';
  const bar = document.createElement('div');
  bar.className = 'preview-bar';
  bar.innerHTML = `<span class="preview-dot"></span><span class="preview-title">${t('tab.output')}</span>
    <button type="button" class="ib sm" data-a="reload" aria-label="reload">${icon('redo')}</button>
    <button type="button" class="ib sm" data-a="full" aria-label="${t('out.full')}">${icon('expand')}</button>`;
  bar.addEventListener('click', (e) => {
    const a = e.target.closest('button')?.dataset.a;
    if (a === 'full') wrap.classList.toggle('full');
    if (a === 'reload') onReload();
  });
  wrap.append(bar, frame);
  return wrap;
};

export const renderWeb = (file, ctx) => {
  const token = Math.random().toString(36).slice(2);
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-scripts allow-modals allow-forms allow-popups allow-pointer-lock allow-downloads');
  frame.setAttribute('allow', 'fullscreen; clipboard-write');
  frame.title = file.name;
  const bridge = consoleBridge(token);
  const code = file.code;
  // Inject the console bridge without adding lines, so error line numbers stay right
  const html = /<head[^>]*>/i.test(code) ? code.replace(/<head[^>]*>/i, (m) => m + bridge)
    : /<html[^>]*>/i.test(code) ? code.replace(/<html[^>]*>/i, (m) => m + bridge) : bridge + code;
  const load = () => { frame.srcdoc = html; };
  if (previewListener) removeEventListener('message', previewListener);
  previewListener = (e) => {
    if (e.source !== frame.contentWindow || e.data?.__barmaj !== token) return;
    const text = e.data.a.join(' ') + '\n';
    ctx.term.write(text, e.data.k === 'error' || e.data.k === 'warn' ? 'err' : 'out');
    if (e.data.k === 'error') ctx.onWebError?.(text);
  };
  addEventListener('message', previewListener);
  ctx.term.block(previewShell(frame, load));
  load();
  return { ok: true, time: 0 };
};

let marked = null;
export const renderMarkdown = async (file, ctx) => {
  if (!marked) marked = await (await import('../../vendor/cm/cm.js')).loadMarked();
  const body = marked.parse(file.code, { gfm: true, breaks: false });
  const dark = document.documentElement.classList.contains('is-dark');
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-popups allow-popups-to-escape-sandbox');
  frame.title = file.name;
  frame.srcdoc = `<!doctype html><html dir="auto"><head><meta charset="utf-8"><base target="_blank"><style>
    :root{color-scheme:${dark ? 'dark' : 'light'}}
    body{font:16px/1.65 'IBM Plex Sans Arabic',system-ui,sans-serif;margin:0;padding:18px 20px 40px;color:${dark ? '#e7eaf0' : '#1b2130'};background:${dark ? '#0e1218' : '#ffffff'}}
    h1,h2,h3{line-height:1.25;margin:1.2em 0 .5em}h1{font-size:1.8em}h2{font-size:1.4em;border-bottom:1px solid ${dark ? '#262d3a' : '#e3e7ee'};padding-bottom:.3em}
    a{color:${dark ? '#7cc4ff' : '#1858d0'}}code,pre{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.88em}
    code{background:${dark ? '#1b212b' : '#f1f3f7'};padding:.15em .4em;border-radius:6px}pre{background:${dark ? '#151a22' : '#f5f7fa'};padding:12px 14px;border-radius:10px;overflow:auto}pre code{background:none;padding:0}
    table{border-collapse:collapse;display:block;overflow:auto}th,td{border:1px solid ${dark ? '#2b3341' : '#dde2ea'};padding:6px 12px}th{background:${dark ? '#171c25' : '#f5f7fa'}}
    blockquote{margin:0;padding:.2em 1em;border-inline-start:4px solid ${dark ? '#3ddc84' : '#17a35a'};color:${dark ? '#a7b0c0' : '#4a5468'}}img{max-width:100%}hr{border:0;border-top:1px solid ${dark ? '#262d3a' : '#e3e7ee'}}
  </style></head><body>${body}</body></html>`;
  ctx.term.block(previewShell(frame, () => { frame.srcdoc = frame.srcdoc; }));
  return { ok: true, time: 0 };
};
