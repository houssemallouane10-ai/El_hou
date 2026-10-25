// Bottom sheets, toasts and small dialogs.
import { t } from './i18n.js';
import { icon } from './icons.js';

export const $ = (sel, root = document) => root.querySelector(sel);

export const h = (tag, attrs = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c);
  return el;
};

// A modal sheet: slides up on phones, centred dialog on wide screens
export const sheet = ({ title, body, className = '', onClose, actions }) => {
  const dlg = h('dialog', { class: `sheet ${className}` });
  const close = h('button', { type: 'button', class: 'ib', 'aria-label': t('close'), html: icon('close') });
  const head = h('header', { class: 'sheet-head' }, h('h2', {}, title), actions || null, close);
  const content = h('div', { class: 'sheet-body' }, body);
  dlg.append(h('div', { class: 'sheet-grab', 'aria-hidden': 'true' }), head, content);
  const done = () => {
    if (!dlg.isConnected) return;
    dlg.classList.add('closing');
    setTimeout(() => { if (dlg.open) dlg.close(); dlg.remove(); }, 160);
    onClose?.();
  };
  close.addEventListener('click', done);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); done(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) done(); });
  // Drag the grab handle down to dismiss
  let y0 = null;
  const grab = dlg.querySelector('.sheet-grab');
  [grab, head].forEach((el) => {
    el.addEventListener('pointerdown', (e) => { if (e.target.closest('button,input')) return; y0 = e.clientY; el.setPointerCapture?.(e.pointerId); });
    el.addEventListener('pointermove', (e) => {
      if (y0 == null) return;
      const dy = Math.max(0, e.clientY - y0);
      dlg.style.transform = `translateY(${dy}px)`;
    });
    el.addEventListener('pointerup', (e) => {
      if (y0 == null) return;
      const dy = e.clientY - y0;
      y0 = null;
      dlg.style.transform = '';
      if (dy > 90) done();
    });
  });
  dlg.tabIndex = -1;
  document.body.append(dlg);
  dlg.showModal();
  dlg.focus();
  return { el: dlg, body: content, close: done };
};

let toastTimer;
export const toast = (text, { action, onAction, kind = '', ms = 2600 } = {}) => {
  let el = $('#toast');
  if (!el) {
    el = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(el);
  }
  el.className = `toast show ${kind}`;
  el.replaceChildren(h('span', {}, text));
  if (action) {
    el.append(h('button', { type: 'button', onclick: () => { el.classList.remove('show'); onAction(); } }, action));
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), action ? ms * 3 : ms);
};

export const confirmBox = (text, { ok = t('confirm.ok'), danger = false } = {}) => new Promise((resolve) => {
  let answered = false;
  const s = sheet({
    title: text,
    className: 'small',
    body: h('div', { class: 'row-actions' },
      h('button', { type: 'button', class: 'btn', onclick: () => { answered = true; s.close(); resolve(false); } }, t('confirm.cancel')),
      h('button', { type: 'button', class: `btn ${danger ? 'danger' : 'primary'}`, onclick: () => { answered = true; s.close(); resolve(true); } }, ok)),
    onClose: () => { if (!answered) resolve(false); },
  });
});

export const promptBox = (title, value = '') => new Promise((resolve) => {
  let answered = false;
  const input = h('input', { type: 'text', class: 'field', value, dir: 'auto', autocapitalize: 'off', spellcheck: 'false' });
  const submit = (e) => { e.preventDefault(); answered = true; s.close(); resolve(input.value.trim() || null); };
  const s = sheet({
    title,
    className: 'small',
    body: h('form', { onsubmit: submit },
      input,
      h('div', { class: 'row-actions' },
        h('button', { type: 'button', class: 'btn', onclick: () => s.close() }, t('confirm.cancel')),
        h('button', { type: 'submit', class: 'btn primary' }, t('confirm.ok')))),
    onClose: () => { if (!answered) resolve(null); },
  });
  setTimeout(() => { input.focus(); input.select(); }, 50);
});

export const download = (name, text, type = 'text/plain') => {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

export const pickFiles = (accept = '', multiple = true) => new Promise((resolve) => {
  const input = h('input', { type: 'file', accept, multiple, style: 'display:none' });
  input.addEventListener('change', () => { resolve([...input.files]); input.remove(); });
  document.body.append(input);
  input.click();
});

// Values with Latin units are wrapped in bidi isolates so "53 ms" stays in order inside Arabic text
const ltr = (s) => `\u2066${s}\u2069`;

export const fmtBytes = (n) => ltr(n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

export const fmtTime = (ms) => (ms == null ? '' : ltr(ms < 1000 ? `${Math.max(1, Math.round(ms))} ms` : `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)} s`));

export const timeAgo = (ts, lang) => {
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  const s = (ts - Date.now()) / 1000;
  const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [u, n] of units) if (Math.abs(s) >= n) return rtf.format(Math.round(s / n), u);
  return rtf.format(0, 'minute');
};
