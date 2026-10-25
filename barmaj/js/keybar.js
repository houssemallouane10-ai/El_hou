// The symbol bar shown above the phone keyboard: Tab, arrows, undo/redo,
// a drag pad that moves the cursor, and language-aware symbols.
import { icon } from './icons.js';
import { t } from './i18n.js';

const sets = {
  base: ['(', ')', '{', '}', '[', ']', ';', '=', '"', "'", '<', '>', '+', '-', '*', '/', '%', '!', '&', '|', ':', '.', ',', '_', '#', '\\', '?', '^', '~', '$', '@', '`'],
  python: [':', '(', ')', '[', ']', '"', "'", '=', '#', '.', ',', '_', '+', '-', '*', '/', '%', '<', '>', '!', '{', '}', '\\', '@', '&', '|', '^', '~'],
  html: ['<', '>', '/', '=', '"', "'", '{', '}', '(', ')', ';', ':', '.', '#', '-', '!', '[', ']', '&', '_', '$', '`', '*', '+', '%', '@'],
  sql: ['(', ')', ',', ';', "'", '"', '=', '*', '<', '>', '.', '%', '_', '-', '+', '/', '!', '|'],
  lisp: ['(', ')', '[', ']', "'", '"', '-', '+', '*', '/', '=', '<', '>', '?', '!', ':', '#', '.', '`', ','],
};

const setFor = (lang) => {
  if (['python', 'nim', 'mojo'].includes(lang.id)) return sets.python;
  if (['html', 'markdown'].includes(lang.id)) return sets.html;
  if (lang.id === 'sql') return sets.sql;
  if (['clojure', 'racket', 'lisp'].includes(lang.id)) return sets.lisp;
  return sets.base;
};

const REPEAT_DELAY = 380;
const REPEAT_EVERY = 55;
const PAD_STEP = 11;

export class Keybar {
  constructor(el, editor) {
    this.el = el;
    this.editor = editor;
    el.innerHTML = `
      <div class="kb-fixed">
        <button type="button" class="kb-key kb-ic" data-act="tab" aria-label="Tab">${icon('tab')}</button>
        <button type="button" class="kb-pad" data-act="pad" aria-label="${t('kb.pad')}">${icon('pad')}</button>
      </div>
      <div class="kb-scroll" dir="ltr"></div>
      <div class="kb-fixed">
        <button type="button" class="kb-key kb-ic" data-act="undo" aria-label="Undo">${icon('undo')}</button>
        <button type="button" class="kb-key kb-ic" data-act="redo" aria-label="Redo">${icon('redo')}</button>
      </div>`;
    this.scroll = el.querySelector('.kb-scroll');
    el.addEventListener('pointerdown', (e) => this.down(e));
    el.addEventListener('pointermove', (e) => this.move(e));
    el.addEventListener('pointerup', (e) => this.up(e));
    el.addEventListener('pointercancel', () => this.cancel());
    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') this.cancel(); });
    // Keep focus (and the phone keyboard) in the editor
    el.addEventListener('mousedown', (e) => e.preventDefault());
  }

  setLanguage(lang) {
    const arrows = ['left', 'down', 'up', 'right'].map((d) =>
      `<button type="button" class="kb-key kb-ic" data-act="arrow" data-dir="${d}" aria-label="${d}">${icon(d)}</button>`).join('');
    this.scroll.innerHTML = arrows;
    for (const k of setFor(lang)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'kb-key';
      b.dataset.k = k;
      b.textContent = k;
      this.scroll.append(b);
    }
  }

  down(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    e.preventDefault();
    this.cancel();
    this.btn = btn;
    this.x0 = e.clientX;
    this.y0 = e.clientY;
    this.moved = false;
    btn.classList.add('on');
    if (btn.dataset.act === 'pad') {
      btn.setPointerCapture?.(e.pointerId);
      this.padX = e.clientX;
      this.padY = e.clientY;
      return;
    }
    if (btn.dataset.act === 'arrow') {
      this.timer = setTimeout(() => {
        this.repeating = true;
        this.press(btn);
        this.timer = setInterval(() => this.press(btn), REPEAT_EVERY);
      }, REPEAT_DELAY);
    }
  }

  move(e) {
    if (!this.btn) return;
    if (this.btn.dataset.act === 'pad') {
      const dx = e.clientX - this.padX;
      const dy = e.clientY - this.padY;
      const sx = Math.trunc(dx / PAD_STEP);
      const sy = Math.trunc(dy / (PAD_STEP * 2.2));
      if (sx) { this.editor.moveBy(sx, 0); this.padX += sx * PAD_STEP; this.moved = true; }
      if (sy) { this.editor.moveBy(0, sy); this.padY += sy * PAD_STEP * 2.2; this.moved = true; }
      return;
    }
    if (Math.abs(e.clientX - this.x0) > 8 || Math.abs(e.clientY - this.y0) > 8) {
      this.moved = true;
      this.clearTimer();
    }
  }

  up() {
    const btn = this.btn;
    if (!btn) return;
    if (!this.moved && !this.repeating) this.press(btn);
    this.cancel();
  }

  cancel() {
    this.clearTimer();
    this.btn?.classList.remove('on');
    this.btn = null;
    this.repeating = false;
  }

  clearTimer() {
    clearTimeout(this.timer);
    clearInterval(this.timer);
    this.timer = null;
  }

  press(btn) {
    const ed = this.editor;
    const act = btn.dataset.act;
    if (btn.dataset.k) ed.type(btn.dataset.k);
    else if (act === 'tab') ed.tabKey();
    else if (act === 'undo') ed.undo();
    else if (act === 'redo') ed.redo();
    else if (act === 'arrow') {
      const d = btn.dataset.dir;
      ed.moveBy(d === 'left' ? -1 : d === 'right' ? 1 : 0, d === 'up' ? -1 : d === 'down' ? 1 : 0);
    }
    navigator.vibrate?.(4);
  }
}
