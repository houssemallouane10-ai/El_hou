// Barmaj: the app controller (files, running, sheets, PWA glue)
import { t, applyI18n, hintText, uiLangs, lang as uiLang } from './i18n.js';
import { langs, byId, runsOn, langForName, detectLang, hasChoice, enginePref } from './langs.js';
import {
  settings, saveSettings, listFiles, getFile, saveFile, createFile, deleteFile, uniqueName,
  getHistory, snapshot, storageUsed, exportAll, importAll, read, write,
} from './store.js';
import { icon, fillIcons } from './icons.js';
import { Editor } from './editor.js';
import { Keybar } from './keybar.js';
import { Term } from './term.js';
import { findProblems, findHints } from './hints.js';
import { shareUrl, decodeShare } from './share.js';
import { examples } from './examples.js';
import { $, h, sheet, toast, confirmBox, promptBox, download, pickFiles, fmtBytes, fmtTime, timeAgo } from './ui.js';
import {
  runWorker, stopLocal, renderWeb, renderMarkdown, preload, warmPython, resetPython, runClang, warmClang, localFlags,
} from './engines/local.js';
import { runCloud, stopCloud, ceInfo, testPiston, testJudge0 } from './engines/cloud.js';

const app = $('#app');
const coarse = matchMedia('(pointer: coarse)');
const wide = matchMedia('(min-width: 900px)');

let file = null;
let lang = null;
let running = null;
let saveTimer = null;
let previewTimer = null;
let installPrompt = null;
let offerShown = false;
let pythonVersion = null;

// ---------------------------------------------------------------- layout
const fitViewport = () => {
  const vv = window.visualViewport;
  document.documentElement.style.setProperty('--vvh', `${vv ? vv.height : innerHeight}px`);
  document.documentElement.style.setProperty('--vvt', `${vv ? vv.offsetTop : 0}px`);
};

const applyTheme = () => {
  const root = document.documentElement;
  if (settings.theme === 'auto') delete root.dataset.theme; else root.dataset.theme = settings.theme;
  const dark = settings.theme === 'dark' || (settings.theme === 'auto' && !matchMedia('(prefers-color-scheme: light)').matches);
  root.classList.toggle('is-dark', dark);
  document.querySelector('meta[name="theme-color"]').content = dark ? '#11151c' : '#ffffff';
  root.style.setProperty('--code-size', `${settings.fontSize}px`);
};

const setTab = (tab) => {
  app.dataset.tab = tab;
  app.querySelectorAll('.tabs [role="tab"]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  if (tab === 'code') requestAnimationFrame(() => editor.view.requestMeasure());
};

const updateKeybar = () => app.classList.toggle('kb', settings.keybar && coarse.matches);

const outputVisible = () => wide.matches || app.dataset.tab === 'output';

// ---------------------------------------------------------------- status
let tickTimer = null;
const setStatus = (kind, text) => {
  clearInterval(tickTimer);
  const el = $('#status');
  el.className = `status ${kind}`;
  $('#statusText').textContent = text;
  $('#tabState').className = `state ${kind === 'ok' ? 's-ok' : kind === 'err' ? 's-err' : kind === 'run' || kind === 'wait' ? 's-run' : ''}`;
};

const startClock = (label) => {
  const t0 = performance.now();
  setStatus('run', label);
  tickTimer = setInterval(() => {
    const s = (performance.now() - t0) / 1000;
    if (s > 1) $('#statusText').textContent = `${label} ${s.toFixed(1)}s`;
  }, 100);
};

const setRunButton = (on) => {
  const b = $('#runBtn');
  b.classList.toggle('running', on);
  b.querySelector('.run-ic').innerHTML = icon(on ? 'stop' : 'play');
  b.querySelector('.run-label').textContent = t(on ? 'stop' : 'run');
};

// ---------------------------------------------------------------- language & file UI
const engineOf = (l) => runsOn(l, settings);

const ENG_ICON = { local: 'device', cloud: 'cloud', server: 'server', 'needs-server': 'server' };
const ENG_LABEL = { local: 'eng.local', cloud: 'eng.cloud', server: 'eng.server', 'needs-server': 'eng.server' };

const engineTag = (l, withIcon = true) => {
  const e = engineOf(l);
  return h('span', { class: `eng ${e}`, html: (withIcon ? icon(ENG_ICON[e]) : '') + t(ENG_LABEL[e]) });
};

const paintBadge = (el, l) => {
  el.textContent = l.badge;
  el.style.setProperty('--c', l.color);
  el.style.setProperty('--fg', l.fg || '#fff');
};

const engineLabel = () => {
  const e = engineOf(lang);
  if (e === 'local') {
    if (lang.local === 'python') return `${pythonVersion ? 'Pyodide ' + pythonVersion : 'Python'} · ${t('eng.local')}`;
    if (lang.local === 'clang') return `Clang 22 · ${t('eng.local')}`;
    return t('eng.local');
  }
  const c = lang.ce && ceInfo(lang);
  return e === 'cloud' ? `${c?.name ? c.name + ' · ' : ''}Compiler Explorer` : t('eng.server');
};

const refreshHeader = () => {
  paintBadge($('#langBadge'), lang);
  $('#fileName').textContent = file.name;
  $('#langName').replaceChildren(h('bdi', { dir: 'ltr' }, lang.name));
  const tag = engineTag(lang, true);
  tag.id = 'engTag';
  $('#engTag').replaceWith(tag);
  $('#engineLabel').textContent = engineLabel();
  document.title = `${file.name} · ${t('app.name')}`;
};

const refreshInputPane = () => {
  const e = engineOf(lang);
  const noInput = ['web', 'markdown', 'sql'].includes(lang.local);
  $('#inputHelp').textContent = noInput ? t('input.helpNone') : e === 'local' ? t('input.helpLocal') : t('input.helpCloud');
  $('#stdin').value = file.stdin || '';
  $('#stdin').disabled = noInput;
  $('#runOpts').hidden = e === 'local' && lang.local !== 'clang';
  $('#flagsRow').hidden = !lang.ce && !lang.flags;
  $('#flags').value = file.flags ?? '';
  $('#flags').placeholder = (e === 'local' ? localFlags(lang.id) : lang.flags) || '';
  const choice = hasChoice(lang, settings);
  $('#engineRow').hidden = !choice;
  if (choice) {
    const pref = enginePref(lang, settings);
    const options = [...(lang.auto ? [['auto', t('engine.auto')]] : []), ['local', t('eng.local')], ['cloud', t('eng.cloud')]];
    $('#engineSeg').replaceChildren(...options.map(([value, label]) => h('button', {
      type: 'button',
      class: pref === value ? 'on' : '',
      'aria-pressed': String(pref === value),
      onclick: () => {
        settings.engine = { ...settings.engine, [lang.id]: value };
        saveSettings();
        refreshHeader();
        refreshInputPane();
      },
    }, label)));
    $('#engineHelp').textContent = lang.auto ? t('engine.autoHelp') : '';
  }
  $('#args').value = file.args || '';
  const n = (file.stdin || '').split('\n').filter((l) => l.trim()).length;
  $('#inputCount').hidden = !n;
  $('#inputCount').textContent = n;
};

const openFile = async (id) => {
  if (running) stop();
  const f = getFile(id);
  if (!f) return;
  if (file && file.id !== f.id) flushSave();
  file = f;
  lang = byId[f.lang] || byId.python;
  settings.current = f.id;
  saveSettings();
  editor.setDoc(f.code);
  editor.setLanguage(lang.hl);
  keybar.setLanguage(lang);
  refreshHeader();
  refreshInputPane();
  term.clear();
  showWelcome();
  setStatus('', t('status.idle'));
  if (lang.local === 'python' && !navigator.connection?.saveData) whenControlled().then(() => preload('python'));
  if (lang.local === 'web' || lang.local === 'markdown') schedulePreview(0);
};

const flushSave = () => {
  if (!saveTimer || !file) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!saveFile(file)) toast(t('toast.saveFail'), { kind: 'bad' });
};

const queueSave = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 400);
};

const remember = (id) => {
  settings.recent = [id, ...settings.recent.filter((r) => r !== id)].slice(0, 6);
  saveSettings();
};

const newFile = (l, { code, name, stdin } = {}) => {
  const base = name ? name.replace(/\.[^.]+$/, '') : 'main';
  const f = createFile({ name: name && !listFiles().some((x) => x.name === name) ? name : uniqueName(base, l.ext), lang: l.id, code: code ?? l.tpl, stdin: stdin || '' });
  remember(l.id);
  openFile(f.id);
  setTab('code');
  return f;
};

const changeLanguage = (l) => {
  const old = lang;
  const untouched = !file.code.trim() || file.code === old.tpl;
  file.lang = l.id;
  if (untouched) file.code = l.tpl;
  if (file.name.endsWith('.' + old.ext)) file.name = file.name.slice(0, -old.ext.length) + l.ext;
  saveFile(file);
  remember(l.id);
  openFile(file.id);
};

// ---------------------------------------------------------------- welcome & problems
const showWelcome = () => {
  if (!term.empty) return;
  term.el.replaceChildren(h('div', { class: 'welcome' },
    h('img', { class: 'logo', src: 'icons/icon.svg', alt: '' }),
    h('h3', {}, t('out.empty.title')),
    h('p', {}, t('out.empty.body')),
    h('ul', {},
      h('li', { html: icon('play') + `<span>${t('welcome.tip1')}</span>` }),
      coarse.matches ? h('li', { html: icon('pad') + `<span>${t('welcome.tip2')}</span>` }) : null,
      h('li', { html: icon('chevron') + `<span>${t('welcome.tip3')}</span>` }))));
};

const showProblems = (problems, hints) => {
  if (!problems.length && !hints.length) return;
  const box = h('div', { class: 'problems', dir: document.documentElement.dir });
  box.append(h('h4', { html: icon('alert') + `<span>${t('out.problems')}</span>` }));
  const used = new Set();
  const rows = problems.slice(0, 6).map((p, i) => {
    const hint = hints[i] && !used.has(i) ? (used.add(i), hints[i]) : null;
    return { p, hint };
  });
  hints.forEach((hint, i) => { if (!used.has(i)) rows.push({ p: null, hint }); });
  for (const { p, hint } of rows) {
    const row = h('div', { class: 'prob' });
    if (p?.line) {
      row.append(h('button', {
        type: 'button',
        class: `ln ${p.severity === 'warning' ? 'warn' : ''}`,
        onclick: () => { setTab('code'); editor.goToLine(p.line); },
      }, t('out.line', { n: p.line })));
    }
    const body = h('div', { class: 'prob-body' });
    if (hint) body.append(h('span', { html: hintText(hint.id, hint.groups) }));
    if (p?.text) body.append(h('span', { class: 'msg' }, p.text));
    row.append(body);
    if (body.childNodes.length) box.append(row);
  }
  if (box.querySelector('.prob')) term.block(box);
};

// ---------------------------------------------------------------- running
const askStdin = () => new Promise((resolve) => {
  let answered = false;
  const area = h('textarea', { class: 'field mono', dir: 'ltr', spellcheck: 'false', autocapitalize: 'off', placeholder: t('input.placeholder') });
  area.value = file.stdin || '';
  const done = (value) => { answered = true; s.close(); resolve(value); };
  const s = sheet({
    title: t('input.ask.title'),
    body: h('div', {},
      h('p', { class: 'note' }, t('input.ask.body')),
      area,
      h('div', { class: 'row-actions' },
        h('button', { type: 'button', class: 'btn', onclick: () => done('') }, t('input.ask.skip')),
        h('button', { type: 'button', class: 'btn primary', onclick: () => done(area.value) }, h('span', { html: icon('play') }), t('input.ask.run')))),
    onClose: () => { if (!answered) resolve(null); },
  });
  setTimeout(() => area.focus(), 60);
});

const finishRun = (r, { kind, label }) => {
  term.flushNow();
  running = null;
  setRunButton(false);
  if (r.stopped) { setStatus('', t('status.stopped')); term.note(t('status.stopped'), 'sys'); return; }
  const ok = r.ok;
  if (ok) setStatus('ok', r.preview ? t('out.done') : t('status.ok', { t: fmtTime(r.time) }));
  else if (r.compileFailed) setStatus('err', t('status.compile'));
  else if (r.timedOut) setStatus('err', t('status.timeout'));
  else setStatus('err', r.exitCode != null ? t('status.fail', { code: r.exitCode }) : t('status.error'));
  $('#engineLabel').textContent = label || engineLabel();
  const text = (r.errText || '').replace(/\x1b\[[\d;]*m/g, '');
  const problems = [...(r.problems || []), ...findProblems(lang.id, text, r.error)]
    .filter((p, i, all) => all.findIndex((q) => q.line === p.line) === i)
    .sort((a, b) => (a.severity === 'warning') - (b.severity === 'warning'));
  const hints = ok && !r.timedOut ? [] : findHints(lang.id, text + '\n' + (r.error?.message || ''), r);
  editor.mark(problems);
  if (!ok || problems.length) showProblems(problems, hints);
  if (kind === 'local' && lang.local === 'python' && r.engineError == null) {
    if (!settings.pyReady) { settings.pyReady = true; saveSettings(); }
  }
};

const runLocalEngine = async () => {
  const engine = lang.local;
  if (engine === 'web' || engine === 'markdown') {
    if (settings.clearOnRun) term.clear();
    const r = engine === 'web' ? renderWeb(file, { term }) : await renderMarkdown(file, { term });
    return { ...r, preview: true };
  }
  let errText = '';
  // The terminal, but stderr is also collected for the problems panel
  const tap = {
    write: (text, k) => { if (k === 'err') errText += text; term.write(text, k); },
    ask: () => term.ask(),
    image: (src) => term.image(src),
    table: (...a) => term.table(...a),
    note: (...a) => term.note(...a),
    block: (node) => term.block(node),
    clear: () => term.clear(),
    cancelAsk: () => term.cancelAsk?.(),
  };
  const ctx = {
    term: tap,
    ready: (v) => { pythonVersion = v; $('#engineLabel').textContent = engineLabel(); },
    loading: (what) => startClock(t('status.loading', { what })),
    running: () => startClock(t('status.running')),
    waiting: (on) => (on ? setStatus('wait', t('status.waiting')) : startClock(t('status.running'))),
  };
  running = { stop: stopLocal };
  let r;
  if (engine === 'clang') {
    ctx.compiling = () => startClock(t('status.compiling'));
    ctx.downloading = (p) => startClock(t('status.loading', { what: `${t('load.clang')} ${p}%` }));
    r = await runClang(lang.id, file, ctx);
    if (r.engineError && navigator.onLine === false) {
      term.write(t('err.noClang') + '\n', 'err');
      return { ok: false, error: null };
    }
    if (!r.engineError && !r.stopped && !settings.clangReady) { settings.clangReady = true; saveSettings(); }
  } else {
    if (engine !== 'python') startClock(t('status.running'));
    r = await runWorker(engine, file, ctx);
  }
  if (r.engineError) {
    term.write(t('err.engine', { e: r.engineError }) + '\n', 'err');
    return { ok: false, error: null };
  }
  if (r.exitCode && r.exitCode !== 0 && !r.error) term.note(`exit ${r.exitCode}`, 'sys');
  return { ...r, errText };
};

const runCloudEngine = async () => {
  if (lang.reads && !(file.stdin || '').trim() && lang.reads.test(file.code)) {
    const value = await askStdin();
    if (value === null) return null;
    file.stdin = value;
    saveFile(file);
    refreshInputPane();
  }
  if (settings.clearOnRun) term.clear();
  if (navigator.onLine === false) {
    term.write(t('err.needsNet') + '\n', 'err');
    return { ok: false };
  }
  startClock(t('status.running'));
  running = { stop: stopCloud };
  const r = await runCloud(lang, file, settings, (name) => term.note(t('err.trying', { name }), 'sys'));
  if (r.stopped) return r;
  if (r.error) {
    const msg = r.error === 'no-server' ? t('err.noServer') : r.error === 'not-available' ? t('err.notAvail')
      : r.error === 'offline' ? t('err.needsNet') : t('err.cloudDown', { e: r.detail || r.error });
    term.write(msg + '\n', 'err');
    if (r.error === 'no-server') term.block(h('button', { type: 'button', class: 'btn', onclick: openSettings }, t('menu.settings')));
    return { ok: false };
  }
  if (r.compileOut) term.write(r.compileOut.replace(/\n?$/, '\n'), 'sys');
  if (r.compileErr) term.write(r.compileErr.replace(/\n?$/, '\n'), r.compileFailed ? 'err' : 'sys');
  if (r.stdout) term.write(r.stdout, 'out');
  if (r.stderr) term.write(r.stderr.replace(/\n?$/, '\n'), 'err');
  if (!r.compileFailed && r.exitCode) term.note(`exit ${r.exitCode}`, 'sys');
  if (!r.stdout && !r.stderr && !r.compileErr && !r.exitCode) term.note('(no output)', 'sys');
  if (lang.local === 'clang' && !settings.clangReady && !offerShown) {
    offerShown = true;
    term.block(h('div', { class: 'offer' },
      h('span', { html: icon('device') }),
      h('span', {}, t('offer.clang')),
      h('button', { type: 'button', class: 'btn', onclick: () => downloadClang() }, t('offer.download'))));
  }
  return {
    ...r,
    ok: !r.compileFailed && !r.timedOut && !r.exitCode,
    errText: `${r.compileErr || ''}\n${r.stderr || ''}`,
    label: `${r.engine} · ${r.provider}${r.memory ? ' · ' + fmtBytes(r.memory) : ''}`,
  };
};

const run = async () => {
  if (running) { stop(); return; }
  file.code = editor.value;
  flushSave();
  saveFile(file);
  snapshot(file);
  const engine = engineOf(lang);
  if (engine === 'needs-server') {
    if (settings.clearOnRun) term.clear();
    if (!wide.matches) setTab('output');
    term.write(t('err.noServer') + '\n', 'err');
    term.block(h('button', { type: 'button', class: 'btn', onclick: openSettings }, t('menu.settings')));
    setStatus('err', t('status.error'));
    return;
  }
  running = { stop: () => {} };
  setRunButton(true);
  if (settings.clearOnRun && engine === 'local') term.clear();
  if (settings.autoOutput && !wide.matches) setTab('output');
  editor.mark([]);
  let r;
  try {
    r = engine === 'local' ? await runLocalEngine() : await runCloudEngine();
  } catch (e) {
    term.write(String(e?.message || e) + '\n', 'err');
    r = { ok: false };
  }
  if (r === null) { running = null; setRunButton(false); setStatus('', t('status.idle')); return; }
  finishRun(r, { kind: engine, label: r.label });
};

const stop = () => {
  running?.stop();
};

const schedulePreview = (delay = 700) => {
  clearTimeout(previewTimer);
  if (!settings.livePreview) return;
  previewTimer = setTimeout(() => {
    if (running || !outputVisible()) return;
    if (lang.local === 'web') { term.clear(); renderWeb(file, { term }); setStatus('ok', t('out.done')); }
    if (lang.local === 'markdown') { term.clear(); renderMarkdown(file, { term }); setStatus('ok', t('out.done')); }
  }, delay);
};

// ---------------------------------------------------------------- sheets
const langRow = (l, onPick, current) => {
  const b = h('button', { type: 'button', class: `row ${current ? 'on' : ''}`, onclick: () => onPick(l) });
  const badge = h('span', { class: 'badge' });
  paintBadge(badge, l);
  const c = l.ce && ceInfo(l);
  b.append(badge, h('span', { class: 'row-text' },
    h('span', { class: 'row-title' }, h('bdi', { dir: 'ltr' }, l.name)),
    h('span', { class: 'row-sub' }, engineTag(l, false), c?.name ? h('bdi', { dir: 'ltr' }, ' ' + c.name) : null)));
  return b;
};

const openLanguages = (mode = 'change') => {
  const search = h('input', { type: 'search', class: 'field', placeholder: t('lang.search'), autocomplete: 'off' });
  const listEl = h('div', {});
  let s;
  const pick = async (l) => {
    s.close();
    if (mode === 'new') { newFile(l); return; }
    if (l.id === lang.id) return;
    const untouched = !file.code.trim() || file.code === lang.tpl;
    if (untouched) { changeLanguage(l); return; }
    const choice = await new Promise((resolve) => {
      const choose = (value) => () => { resolve(value); c.close(); };
      const c = sheet({
        title: l.name,
        className: 'small',
        body: h('div', { class: 'list' },
          h('button', { type: 'button', class: 'row', onclick: choose('new'), html: icon('plus') + `<span class="row-text"><span class="row-title">${t('lang.newFile')}</span></span>` }),
          h('button', { type: 'button', class: 'row', onclick: choose('change'), html: icon('edit') + `<span class="row-text"><span class="row-title">${t('lang.keep')}</span></span>` })),
        onClose: () => resolve(null),
      });
    });
    if (choice === 'new') newFile(l);
    if (choice === 'change') changeLanguage(l);
  };
  const render = () => {
    const q = search.value.trim().toLowerCase();
    const match = (l) => !q || l.name.toLowerCase().includes(q) || l.id.includes(q) || l.ext === q || l.badge.toLowerCase() === q;
    const groups = [];
    if (!q && settings.recent.length) groups.push(['history', t('lang.recent'), settings.recent.map((id) => byId[id]).filter(Boolean)]);
    groups.push(['device', t('lang.offline'), langs.filter((l) => engineOf(l) === 'local' && match(l))]);
    groups.push(['cloud', t('lang.cloud'), langs.filter((l) => ['cloud', 'server'].includes(engineOf(l)) && match(l))]);
    groups.push(['server', t('lang.server'), langs.filter((l) => engineOf(l) === 'needs-server' && match(l))]);
    listEl.replaceChildren();
    let total = 0;
    for (const [ic, title, items] of groups) {
      if (!items.length) continue;
      total += items.length;
      listEl.append(h('div', { class: 'group-title', html: icon(ic) + `<span>${title}</span>` }),
        h('div', { class: 'lgrid' }, items.map((l) => langRow(l, pick, mode === 'change' && l.id === lang.id))));
    }
    if (!total) listEl.append(h('p', { class: 'empty' }, t('lang.none')));
  };
  search.addEventListener('input', render);
  render();
  s = sheet({
    title: mode === 'new' ? t('files.new') : `${t('lang.pick')} · ${t('lang.count', { n: langs.length })}`,
    body: h('div', {}, h('label', { class: 'search', html: icon('search') }, search), listEl),
  });
  if (!coarse.matches) setTimeout(() => search.focus(), 50);
};

const openFiles = () => {
  const search = h('input', { type: 'search', class: 'field', placeholder: t('files.search') });
  const listEl = h('div', { class: 'list' });
  let s;
  const render = () => {
    const q = search.value.trim().toLowerCase();
    const items = listFiles().filter((f) => !q || f.name.toLowerCase().includes(q));
    listEl.replaceChildren();
    if (!items.length) { listEl.append(h('p', { class: 'empty' }, t('files.empty'))); return; }
    for (const f of items) {
      const l = byId[f.lang] || byId.python;
      const badge = h('span', { class: 'badge' });
      paintBadge(badge, l);
      const act = (name, title, fn) => h('button', { type: 'button', class: 'ib sm', title, 'aria-label': title, html: icon(name), onclick: (e) => { e.stopPropagation(); fn(); } });
      listEl.append(h('div', { class: `row ${f.id === file.id ? 'on' : ''}`, role: 'button', tabindex: '0', onclick: () => { s.close(); openFile(f.id); setTab('code'); } },
        badge,
        h('span', { class: 'row-text' },
          h('span', { class: 'row-title', dir: 'auto' }, f.name),
          h('span', { class: 'row-sub' }, h('bdi', { dir: 'ltr' }, l.name), ` · ${timeAgo(f.updated, uiLang())} · ${fmtBytes(f.size || 0)}`)),
        h('span', { class: 'row-end' },
          act('edit', t('files.rename'), async () => { await renameFile(f.id); render(); }),
          act('copy', t('files.duplicate'), () => {
            const src = getFile(f.id);
            createFile({ name: uniqueName(src.name.replace(/\.[^.]+$/, '') + '-copy', l.ext), lang: src.lang, code: src.code, stdin: src.stdin });
            render();
          }),
          act('trash', t('files.delete'), async () => {
            if (!(await confirmBox(t('files.deleteConfirm', { name: f.name }), { ok: t('files.delete'), danger: true }))) return;
            deleteFile(f.id);
            if (f.id === file.id) {
              const next = listFiles()[0];
              if (next) openFile(next.id); else newFile(byId.python);
            }
            render();
          }))));
    }
  };
  search.addEventListener('input', render);
  render();
  s = sheet({
    title: `${t('files.title')} · ${t('files.count', { n: listFiles().length })}`,
    body: h('div', {},
      h('label', { class: 'search', html: icon('search') }, search),
      listEl,
      h('div', { class: 'row-actions' },
        h('button', { type: 'button', class: 'btn', onclick: () => { s.close(); openFromDevice(); }, html: icon('upload') + t('files.import') }),
        h('button', { type: 'button', class: 'btn primary', onclick: () => { s.close(); openLanguages('new'); }, html: icon('plus') + t('files.new') }))),
  });
};

const renameFile = async (id = file.id) => {
  const f = getFile(id);
  const name = await promptBox(t('files.renamePrompt'), f.name);
  if (!name || name === f.name) return;
  f.name = name.replace(/[\\/]/g, '-');
  const guess = langForName(f.name);
  if (guess && guess !== f.lang && !(guess === 'html' && f.lang === 'html')) f.lang = guess;
  saveFile(f);
  if (id === file.id) openFile(id);
};

const openFromDevice = async () => {
  const files = await pickFiles('');
  let n = 0;
  let last = null;
  for (const f of files) {
    if (f.size > 2_000_000) continue;
    const code = await f.text();
    const id = langForName(f.name) || detectLang(code);
    last = createFile({ name: uniqueName(f.name.replace(/\.[^.]+$/, ''), byId[id].ext), lang: id, code });
    n++;
  }
  if (last) { openFile(last.id); setTab('code'); }
  if (n) toast(t('toast.imported', { n }));
};

const openExamples = () => {
  let s;
  const listEl = h('div', { class: 'list' }, examples.map((ex) => {
    const l = byId[ex.lang];
    const badge = h('span', { class: 'badge' });
    paintBadge(badge, l);
    return h('button', { type: 'button', class: 'row', onclick: () => { s.close(); newFile(l, { code: ex.code, name: ex.name, stdin: ex.stdin }); } },
      badge,
      h('span', { class: 'row-text' },
        h('span', { class: 'row-title' }, (ex.title[uiLang()] || ex.title.en).replace(/^[^:]+:\s*/, '')),
        h('span', { class: 'row-sub' }, engineTag(l, false), h('bdi', { dir: 'ltr' }, ' ' + ex.name))));
  }));
  s = sheet({ title: t('menu.examples'), body: listEl });
};

const openHistory = () => {
  file.code = editor.value;
  const list = getHistory(file.id);
  let s;
  const body = h('div', { class: 'list' });
  if (!list.length) body.append(h('p', { class: 'empty' }, t('history.empty')));
  for (const snap of list) {
    const lines = snap.code.split('\n');
    body.append(h('div', { class: 'set col' },
      h('div', { style: 'display:flex;align-items:center;gap:8px' },
        h('span', { style: 'flex:1' }, h('b', {}, timeAgo(snap.t, uiLang())), h('small', {}, `${new Date(snap.t).toLocaleString(uiLang())} · ${t('history.lines', { n: lines.length })}`)),
        h('button', {
          type: 'button',
          class: 'btn',
          onclick: () => {
            snapshot({ ...file, code: editor.value });
            file.code = snap.code;
            saveFile(file);
            s.close();
            openFile(file.id);
            setTab('code');
            toast(t('toast.restored'));
          },
        }, t('history.restore'))),
      h('pre', { class: 'hist-pre' }, lines.slice(0, 3).join('\n'))));
  }
  s = sheet({ title: `${t('history.title')} · ${file.name}`, body });
};

const openShare = async () => {
  file.code = editor.value;
  saveFile(file);
  const url = await shareUrl(file);
  const note = h('p', { class: 'note' }, t('share.body'));
  const long = url.length > 7000 ? h('p', { class: 'note bad' }, t('share.long')) : null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast(t('out.copied')); } catch { promptBox(t('share.copy'), url); }
  };
  const fileObj = () => new File([file.code], file.name, { type: 'text/plain' });
  const actions = h('div', { class: 'row-actions' },
    h('button', { type: 'button', class: 'btn', onclick: copy, html: icon('link') + t('share.copy') }));
  if (navigator.share) {
    actions.append(h('button', {
      type: 'button',
      class: 'btn primary',
      html: icon('share') + t('share.native'),
      onclick: () => navigator.share({ title: file.name, text: `${file.name} · ${t('app.name')}`, url }).catch(() => {}),
    }));
  }
  const fileBtn = h('button', {
    type: 'button',
    class: 'btn block',
    html: icon('file') + t('share.file'),
    onclick: () => {
      const f = fileObj();
      if (navigator.canShare?.({ files: [f] })) navigator.share({ files: [f], title: file.name }).catch(() => {});
      else download(file.name, file.code);
    },
  });
  sheet({ title: t('share.title'), body: h('div', {}, note, h('div', { class: 'linkbox' }, url), long, actions, h('div', { style: 'margin-top:8px' }, fileBtn)) });
};

const toggle = (key, after) => {
  const input = h('input', { type: 'checkbox', class: 'switch', role: 'switch' });
  input.checked = !!settings[key];
  input.addEventListener('change', () => { settings[key] = input.checked; saveSettings(); after?.(); });
  return input;
};

const segment = (key, options, after) => {
  const seg = h('div', { class: 'seg', role: 'radiogroup' });
  for (const [value, label] of options) {
    const b = h('button', { type: 'button', class: settings[key] === value ? 'on' : '', role: 'radio', 'aria-checked': String(settings[key] === value) }, label);
    b.addEventListener('click', () => {
      settings[key] = value;
      saveSettings();
      seg.querySelectorAll('button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
      after?.();
    });
    seg.append(b);
  }
  return seg;
};

const setRow = (label, control, sub) => h('label', { class: 'set' }, h('span', {}, label, sub ? h('small', {}, sub) : null), control);

const serverBox = (key, title, test) => {
  const cfg = settings[key];
  const url = h('input', { type: 'url', class: 'field', dir: 'ltr', placeholder: key === 'piston' ? 'https://emkc.org/api/v2/piston' : 'https://judge0-ce.p.rapidapi.com', value: cfg.url, autocapitalize: 'off', spellcheck: 'false' });
  const keyIn = h('input', { type: 'password', class: 'field', dir: 'ltr', placeholder: t('settings.key'), value: cfg.key, autocomplete: 'off' });
  const out = h('p', { class: 'note' });
  const save = () => { settings[key] = { url: url.value.trim(), key: keyIn.value.trim() }; saveSettings(); refreshHeader(); refreshInputPane(); };
  url.addEventListener('change', save);
  keyIn.addEventListener('change', save);
  const btn = h('button', {
    type: 'button',
    class: 'btn',
    onclick: async () => {
      save();
      if (!settings[key].url) return;
      out.className = 'note';
      out.textContent = '…';
      try { out.textContent = t('settings.testOk', { n: await test(settings[key]) }); out.className = 'note ok'; } catch (e) { out.textContent = t('settings.testFail', { e: e.message }); out.className = 'note bad'; }
    },
  }, t('settings.test'));
  return h('div', { class: 'set col' }, h('b', {}, title), url, keyIn, h('div', {}, btn), out);
};

const openSettings = () => {
  const fontVal = h('b', { style: 'min-width:2.5em;text-align:center' }, String(settings.fontSize));
  const range = h('input', { type: 'range', min: '11', max: '24', value: String(settings.fontSize) });
  range.addEventListener('input', () => { settings.fontSize = +range.value; fontVal.textContent = range.value; applyTheme(); });
  range.addEventListener('change', saveSettings);
  const pyBtn = h('button', { type: 'button', class: 'btn' }, settings.pyReady ? t('settings.pythonReady') : t('settings.getPython'));
  if (settings.pyReady) pyBtn.prepend(h('span', { html: icon('check') }));
  pyBtn.addEventListener('click', async () => {
    pyBtn.disabled = true;
    pyBtn.textContent = t('status.loading', { what: 'Python' });
    try {
      pythonVersion = await warmPython();
      settings.pyReady = true;
      saveSettings();
      pyBtn.textContent = t('settings.pythonReady');
      toast(t('toast.pythonReady'));
    } catch (e) {
      pyBtn.textContent = t('err.engine', { e: e.message });
    }
    pyBtn.disabled = false;
  });
  const clangBtn = h('button', { type: 'button', class: 'btn' });
  const paintClang = () => {
    clangBtn.replaceChildren(...(settings.clangReady ? [h('span', { html: icon('check') }), t('settings.clangReady')] : [t('settings.getClang')]));
  };
  paintClang();
  clangBtn.addEventListener('click', () => downloadClang((text) => { clangBtn.textContent = text; }).then(paintClang, () => {}));
  const storage = h('small', {}, t('settings.storage', { s: fmtBytes(storageUsed()) }));
  navigator.storage?.estimate?.().then((e) => { storage.textContent = t('settings.storage', { s: fmtBytes(e.usage || storageUsed()) }); }).catch(() => {});
  const reopen = () => { s.close(); setTimeout(openSettings, 180); };
  const s = sheet({
    title: t('settings.title'),
    body: h('div', {},
      h('div', { class: 'set-group' }, t('settings.ui')),
      setRow(t('settings.uiLang'), segment('uiLang', uiLangs.map((u) => [u.id, u.name]), () => { applyI18n(); fillIcons(); refreshAll(); reopen(); })),
      setRow(t('settings.theme'), segment('theme', [['auto', t('settings.theme.auto')], ['dark', t('settings.theme.dark')], ['light', t('settings.theme.light')]], applyTheme)),
      h('div', { class: 'set-group' }, t('settings.editor')),
      setRow(t('settings.fontSize'), h('span', { style: 'display:flex;align-items:center;gap:8px;flex:none' }, range, fontVal)),
      setRow(t('settings.tabSize'), segment('tabSize', [[2, '2'], [4, '4'], [8, '8']], () => editor.configure(settings))),
      setRow(t('settings.wrap'), toggle('wrap', () => editor.configure(settings))),
      setRow(t('settings.lineNumbers'), toggle('lineNumbers', () => editor.configure(settings))),
      setRow(t('settings.closeBrackets'), toggle('closeBrackets', () => editor.configure(settings))),
      setRow(t('settings.autocomplete'), toggle('autocomplete', () => editor.configure(settings))),
      setRow(t('settings.keybar'), toggle('keybar', updateKeybar)),
      h('div', { class: 'set-group' }, t('settings.run')),
      setRow(t('settings.clearOnRun'), toggle('clearOnRun')),
      setRow(t('settings.autoOutput'), toggle('autoOutput')),
      setRow(t('settings.livePreview'), toggle('livePreview')),
      h('div', { class: 'set-group' }, t('settings.servers')),
      h('p', { class: 'note' }, t('settings.serversHint')),
      setRow(t('settings.ce'), toggle('ce', () => { refreshHeader(); refreshInputPane(); }), 'godbolt.org'),
      serverBox('piston', t('settings.piston'), testPiston),
      serverBox('judge0', t('settings.judge0'), testJudge0),
      h('div', { class: 'set-group' }, t('settings.offline')),
      h('p', { class: 'note' }, t('settings.offlineHint')),
      h('div', { class: 'set col' }, pyBtn, clangBtn),
      h('div', { class: 'set-group' }, t('settings.data')),
      h('div', { class: 'set col' },
        storage,
        h('button', { type: 'button', class: 'btn', html: icon('download') + t('settings.export'), onclick: () => download(`barmaj-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(exportAll(), null, 1), 'application/json') }),
        h('button', {
          type: 'button',
          class: 'btn',
          html: icon('upload') + t('settings.importBackup'),
          onclick: async () => {
            const [f] = await pickFiles('.json,application/json', false);
            if (!f) return;
            try { toast(t('toast.imported', { n: importAll(JSON.parse(await f.text())) })); } catch (e) { toast(e.message, { kind: 'bad' }); }
          },
        }),
        h('button', {
          type: 'button',
          class: 'btn',
          html: icon('trash') + t('settings.reset'),
          onclick: async () => {
            const keys = await caches.keys();
            await Promise.all(keys.filter((k) => k.startsWith('barmaj')).map((k) => caches.delete(k)));
            settings.pyReady = false;
            saveSettings();
            location.reload();
          },
        }))),
  });
};

// Download the C/C++ compiler (≈ 27 MB) so C and C++ also run offline
let clangDownload = null;
const downloadClang = (onText) => {
  if (!clangDownload) {
    const show = (text) => { onText?.(text); toast(text); };
    clangDownload = warmClang((p) => onText?.(t('status.loading', { what: `${t('load.clang')} ${p}%` })))
      .then(() => {
        settings.clangReady = true;
        saveSettings();
        show(t('toast.clangReady'));
      })
      .catch((e) => {
        show(t('err.engine', { e: e.message }));
        throw e;
      })
      .finally(() => { clangDownload = null; });
  }
  return clangDownload;
};

const openAbout = () => {
  sheet({
    title: t('about.title'),
    body: h('div', { class: 'about' },
      h('div', { class: 'menu-brand' }, h('img', { src: 'icons/icon.svg', alt: '' }), h('div', {}, h('b', {}, `${t('app.name')} · Barmaj`), h('span', {}, t('app.tagline')))),
      h('p', {}, t('about.body')),
      h('p', {}, t('about.features')),
      h('p', {}, t('about.credits'))),
  });
};

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;

const install = async () => {
  if (installPrompt) {
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => {});
    installPrompt = null;
  } else if (isIOS) {
    sheet({ title: t('menu.install'), className: 'small', body: h('p', { class: 'note' }, t('install.ios')) });
  }
};

const openMenu = () => {
  let s;
  const item = (ic, label, fn) => h('button', { type: 'button', onclick: () => { s.close(); setTimeout(fn, 120); }, html: icon(ic) + `<span>${label}</span>` });
  const grid = h('div', { class: 'menu-grid' },
    item('plus', t('menu.new'), () => openLanguages('new')),
    item('folder', t('menu.files'), openFiles),
    item('book', t('menu.examples'), openExamples),
    item('upload', t('menu.open'), openFromDevice),
    item('download', t('menu.download'), () => download(file.name, editor.value)),
    item('share', t('menu.share'), openShare),
    item('history', t('menu.history'), openHistory),
    item('search', t('menu.search'), () => { setTab('code'); editor.openSearch(); }),
    item('edit', t('files.rename'), () => renameFile()),
    item('settings', t('menu.settings'), openSettings),
    (installPrompt || (isIOS && !standalone)) ? item('install', t('menu.install'), install) : null,
    item('info', t('menu.about'), openAbout));
  s = sheet({
    title: t('menu'),
    body: h('div', {},
      h('div', { class: 'menu-brand' }, h('img', { src: 'icons/icon.svg', alt: '' }), h('div', {}, h('b', {}, t('app.name')), h('span', {}, t('app.tagline')))),
      grid),
  });
};

const refreshAll = () => {
  setRunButton(!!running);
  refreshHeader();
  refreshInputPane();
  if (term.empty) { term.el.replaceChildren(); showWelcome(); }
  keybar.setLanguage(lang);
  setStatus('', t('status.idle'));
};

// ---------------------------------------------------------------- incoming code (links, share target, shortcuts)
const incoming = async () => {
  const hash = location.hash;
  if (hash.startsWith('#c=')) {
    try {
      const shared = await decodeShare(hash.slice(3));
      const l = byId[shared.lang] || byId[detectLang(shared.code)];
      const existing = listFiles().map((m) => getFile(m.id)).find((f) => f.code === shared.code && f.lang === l.id);
      if (existing) openFile(existing.id);
      else newFile(l, { code: shared.code, name: shared.name, stdin: shared.stdin });
      toast(t('toast.opened'));
    } catch (e) {
      toast(e.message, { kind: 'bad' });
    }
    history.replaceState(null, '', location.pathname);
    return true;
  }
  const q = new URLSearchParams(location.search);
  if (q.has('text') || q.has('title') || q.has('url')) {
    const code = (q.get('text') || q.get('url') || q.get('title') || '').trim();
    if (code) newFile(byId[detectLang(code)], { code: code + '\n' });
    history.replaceState(null, '', location.pathname);
    return !!code;
  }
  if (q.get('new') && byId[q.get('new')]) {
    newFile(byId[q.get('new')]);
    history.replaceState(null, '', location.pathname);
    return true;
  }
  return false;
};

const firstRun = () => {
  const hello = {
    ar: '# مرحبا بك في برمج! اضغط ▶ للتشغيل',
    fr: '# Bienvenue dans Barmaj ! Appuyez sur ▶ pour exécuter',
    en: '# Welcome to Barmaj! Tap ▶ to run',
  }[uiLang()];
  return createFile({
    name: 'hello.py',
    lang: 'python',
    code: `${hello}
name = input("What's your name? ")
print(f"Hello, {name}! 👋")

for i in range(1, 6):
    print(f"{i} x {i} = {i * i}")
`,
  });
};

// ---------------------------------------------------------------- service worker
// Engine workers created before the service worker controls the page cannot
// use interactive input, so background work waits for it
const whenControlled = () => new Promise((resolve) => {
  if (!('serviceWorker' in navigator) || navigator.serviceWorker.controller) { resolve(); return; }
  navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
  setTimeout(resolve, 6000);
});

const registerSW = async () => {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('sw.js', { scope: './' });
    const offerUpdate = (worker) => {
      toast(t('toast.update'), { action: t('toast.updateBtn'), onAction: () => worker.postMessage({ type: 'skipWaiting' }) });
    };
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w);
      });
    });
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // The first takeover only enables interactive input; later ones are updates
      if (!hadController) { hadController = true; if (!running) resetPython(); return; }
      if (reloading || running) return;
      reloading = true;
      location.reload();
    });
    setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
  } catch { /* offline features unavailable */ }
};
let hadController = !!navigator.serviceWorker?.controller;

// ---------------------------------------------------------------- boot
fillIcons();
applyI18n();
applyTheme();
fitViewport();
window.visualViewport?.addEventListener('resize', fitViewport);
window.visualViewport?.addEventListener('scroll', fitViewport);
addEventListener('resize', fitViewport);
matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme);

const editor = new Editor($('#editor'), {
  onChange: (code) => {
    if (!file) return;
    file.code = code;
    queueSave();
    if (lang.local === 'web' || lang.local === 'markdown') schedulePreview();
  },
  onRun: () => run(),
  onSave: () => { flushSave(); toast('✓'); },
});
editor.configure(settings);
const keybar = new Keybar($('#keybar'), editor);
const term = new Term($('#term'));
updateKeybar();
coarse.addEventListener('change', updateKeybar);

app.querySelectorAll('.tabs [role="tab"]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
$('#runBtn').addEventListener('click', () => run());
$('#langBtn').addEventListener('click', () => openLanguages('change'));
$('#menuBtn').addEventListener('click', openMenu);
app.querySelector('.bar-tools').addEventListener('click', (e) => {
  const a = e.target.closest('button')?.dataset.act;
  if (a === 'files') openFiles();
  if (a === 'share') openShare();
  if (a === 'settings') openSettings();
});
$('#copyOut').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(term.text()); toast(t('out.copied')); } catch { /* clipboard blocked */ }
});
$('#clearOut').addEventListener('click', () => { term.clear(); editor.mark([]); showWelcome(); setStatus('', t('status.idle')); });
$('#stdin').addEventListener('input', () => { file.stdin = $('#stdin').value; queueSave(); refreshInputPaneCount(); });
$('#args').addEventListener('input', () => { file.args = $('#args').value; queueSave(); });
$('#flags').addEventListener('input', () => { file.flags = $('#flags').value.trim() === '' ? null : $('#flags').value; queueSave(); });
const refreshInputPaneCount = () => {
  const n = (file.stdin || '').split('\n').filter((l) => l.trim()).length;
  $('#inputCount').hidden = !n;
  $('#inputCount').textContent = n;
};

addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
});
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
addEventListener('appinstalled', () => { installPrompt = null; toast(t('toast.installed')); });
addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });
const onlineState = () => {
  $('#offlineDot').hidden = navigator.onLine !== false;
  if (file) { refreshHeader(); refreshInputPane(); }
};
addEventListener('online', () => { onlineState(); toast(t('toast.online')); });
addEventListener('offline', () => { onlineState(); toast(t('toast.offline')); });
addEventListener('hashchange', () => { if (location.hash.startsWith('#c=')) incoming(); });
onlineState();

if (!listFiles().length) firstRun();
if (!(await incoming())) {
  const start = getFile(settings.current) ? settings.current : listFiles()[0].id;
  openFile(start);
}
registerSW();

// Exposed for automated tests
self.barmaj = { run, openFile, setTab, get file() { return file; }, editor, term, settings, read, write };
