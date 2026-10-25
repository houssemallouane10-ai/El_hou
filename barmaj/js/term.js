// The output panel: streamed text with ANSI colours, inline input prompts,
// images, tables and other widgets. Writes are batched per animation frame.
import { t } from './i18n.js';
import { icon } from './icons.js';

const LIMIT = 1_500_000;
const ESC = /\x1b\[([\d;?]*)([A-Za-z])/g;

const ansiState = () => ({ fg: null, bg: null, bold: false, italic: false, under: false });

const applySgr = (st, params) => {
  const codes = params === '' ? [0] : params.split(';').map(Number);
  for (let i = 0; i < codes.length; i++) {
    const c = codes[i];
    if (c === 0) Object.assign(st, ansiState());
    else if (c === 1) st.bold = true;
    else if (c === 3) st.italic = true;
    else if (c === 4) st.under = true;
    else if (c === 22) st.bold = false;
    else if (c === 23) st.italic = false;
    else if (c === 24) st.under = false;
    else if ((c >= 30 && c <= 37) || (c >= 90 && c <= 97)) st.fg = c;
    else if (c === 39) st.fg = null;
    else if ((c >= 40 && c <= 47) || (c >= 100 && c <= 107)) st.bg = c;
    else if (c === 49) st.bg = null;
    else if (c === 38 || c === 48) i += codes[i + 1] === 5 ? 2 : 4; // 256 / truecolor: skipped
  }
};

const stateClass = (st) => [
  st.fg && `a${st.fg}`, st.bg && `a${st.bg}`, st.bold && 'ab', st.italic && 'ai', st.under && 'au',
].filter(Boolean).join(' ');

export class Term {
  constructor(el) {
    this.el = el;
    this.queue = [];
    this.size = 0;
    this.pinned = true;
    this.ansi = ansiState();
    el.addEventListener('scroll', () => {
      this.pinned = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
    }, { passive: true });
  }

  clear() {
    this.flushNow();
    this.el.replaceChildren();
    this.pre = null;
    this.size = 0;
    this.truncated = false;
    this.ansi = ansiState();
    this.pinned = true;
    this.cancelAsk?.();
  }

  get empty() { return !this.el.firstChild || this.el.querySelector('.welcome'); }

  write(text, kind = 'out') {
    if (!text || this.truncated) return;
    this.queue.push([text, kind]);
    if (!this.raf) this.raf = requestAnimationFrame(() => this.flushNow());
  }

  flushNow() {
    cancelAnimationFrame(this.raf);
    this.raf = null;
    if (!this.queue.length) return;
    const q = this.queue;
    this.queue = [];
    for (const [text, kind] of q) this.append(text, kind);
    this.scroll();
  }

  append(raw, kind) {
    if (this.size > LIMIT) {
      if (!this.truncated) {
        this.truncated = true;
        this.closeText();
        this.note(t('out.truncated'), 'warn');
      }
      return;
    }
    this.size += raw.length;
    this.el.querySelector('.welcome')?.remove();
    if (!this.pre) {
      this.pre = document.createElement('pre');
      this.pre.className = 'tout';
      this.el.append(this.pre);
    }
    const text = raw.replace(/\r\n/g, '\n').replace(/\r(?!\n)/g, '');
    if (kind !== 'out' && kind !== 'err') { this.span(text, `k-${kind}`); return; }
    let last = 0;
    ESC.lastIndex = 0;
    for (let m; (m = ESC.exec(text));) {
      if (m.index > last) this.span(text.slice(last, m.index), `k-${kind} ${stateClass(this.ansi)}`);
      if (m[2] === 'm') applySgr(this.ansi, m[1]);
      last = ESC.lastIndex;
    }
    if (last < text.length) this.span(text.slice(last), `k-${kind} ${stateClass(this.ansi)}`);
  }

  span(text, cls) {
    cls = cls.trim();
    const lastEl = this.pre.lastChild;
    if (lastEl && lastEl.className === cls) { lastEl.append(text); return; }
    const s = document.createElement('span');
    s.className = cls;
    s.textContent = text;
    this.pre.append(s);
  }

  closeText() {
    this.flushQueueInto();
    this.pre = null;
  }

  flushQueueInto() {
    if (this.queue.length) {
      const q = this.queue;
      this.queue = [];
      for (const [text, kind] of q) this.append(text, kind);
    }
  }

  // Append any element as its own block
  block(node) {
    this.closeText();
    this.el.querySelector('.welcome')?.remove();
    this.el.append(node);
    this.scroll();
    return node;
  }

  note(text, kind = 'sys') {
    const p = document.createElement('div');
    p.className = `tnote k-${kind}`;
    p.textContent = text;
    return this.block(p);
  }

  image(src, alt = '') {
    const fig = document.createElement('figure');
    fig.className = 'timg';
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.loading = 'lazy';
    img.addEventListener('load', () => this.scroll());
    fig.append(img);
    return this.block(fig);
  }

  table(columns, rows, caption) {
    const wrap = document.createElement('div');
    wrap.className = 'ttable';
    if (caption) {
      const c = document.createElement('div');
      c.className = 'ttable-cap';
      c.textContent = caption;
      wrap.append(c);
    }
    const scroller = document.createElement('div');
    scroller.className = 'ttable-scroll';
    const table = document.createElement('table');
    const thead = table.createTHead().insertRow();
    for (const col of columns) {
      const th = document.createElement('th');
      th.textContent = col;
      thead.append(th);
    }
    const body = table.createTBody();
    for (const row of rows) {
      const tr = body.insertRow();
      for (const v of row) {
        const td = tr.insertCell();
        if (v === null || v === undefined) { td.textContent = 'NULL'; td.className = 'null'; }
        else {
          td.textContent = typeof v === 'object' ? JSON.stringify(v) : String(v);
          if (typeof v === 'number') td.className = 'num';
        }
      }
    }
    scroller.append(table);
    wrap.append(scroller);
    return this.block(wrap);
  }

  // Inline input while a program runs. Resolves with the line, or null for end of input.
  ask() {
    this.flushNow();
    this.cancelAsk?.();
    return new Promise((resolve) => {
      const row = document.createElement('form');
      row.className = 'tin';
      row.innerHTML = `<input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send" dir="auto">
        <button type="submit" class="tin-send" aria-label="${t('term.send')}">${icon('right')}</button>
        <button type="button" class="tin-eof" title="${t('term.eof')}">EOF</button>`;
      const input = row.querySelector('input');
      input.placeholder = t('term.input');
      const finish = (value) => {
        this.cancelAsk = null;
        row.remove();
        if (value !== null) this.write(value + '\n', 'echo');
        else this.write('^D\n', 'sys');
        this.flushNow();
        resolve(value);
      };
      row.addEventListener('submit', (e) => { e.preventDefault(); finish(input.value); });
      row.querySelector('.tin-eof').addEventListener('click', () => finish(null));
      this.cancelAsk = () => { this.cancelAsk = null; row.remove(); resolve(null); };
      // Sit right after the program's prompt, like a real terminal
      this.flushQueueInto();
      if (!this.pre) this.append('', 'out');
      this.pre.append(row);
      this.scroll(true);
      input.focus({ preventScroll: true });
    });
  }

  scroll(force) {
    if (this.pinned || force) this.el.scrollTop = this.el.scrollHeight;
  }

  text() {
    this.flushNow();
    return [...this.el.querySelectorAll('pre.tout, .tnote')].map((n) => n.textContent).join('\n').trim();
  }
}
