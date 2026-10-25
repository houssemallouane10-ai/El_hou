// The symbol bar shown above the phone keyboard: Tab, arrows, undo/redo,
// a drag pad that moves the cursor, and language-aware symbols.
import { icon } from './icons.js';
import { t } from './i18n.js';

// The symbols each language uses most, most used first. A key can insert
// several characters (->, ::, %d); ‸ marks where the cursor goes, so ${‸}
// leaves it between the braces.
const C_OPS = ['=', '==', '!=', '<', '>', '<=', '>=', '+', '-', '*', '/', '%', '++', '--', '&&', '||', '!'];
const keys = {
  c: [';', '(', ')', '{', '}', '"', "'", ...C_OPS, '&', '[', ']', '->', '.', ',', '#', '%d', '%s', '%f', '%c', '\\n', '?', ':', '|', '^', '~', '_'],
  cpp: [';', '<<', '>>', '::', '(', ')', '{', '}', '"', "'", ...C_OPS, '&', '[', ']', '->', '.', ',', '#', '<‸>', '\\n', '?', ':', '|', '~', '_'],
  java: [';', '(', ')', '{', '}', '"', '.', ...C_OPS, '[', ']', ',', "'", '->', '?', ':', '@', '<‸>', '\\n', '&', '|', '_'],
  csharp: [';', '(', ')', '{', '}', '"', '.', ...C_OPS, '[', ']', ',', '=>', '$"‸"', '{‸}', "'", '?', '??', ':', '<‸>', '\\n', '&', '|', '_'],
  javascript: [';', '(', ')', '{', '}', '=>', '"', "'", '`', '${‸}', '.', '=', '===', '!==', '[', ']', ',', ':', '+', '-', '*', '/', '%', '<', '>', '<=', '>=', '&&', '||', '!', '?', '?.', '??', '++', '_', '$', '&', '|', '\\n'],
  typescript: [';', ':', '(', ')', '{', '}', '=>', '"', "'", '`', '${‸}', '.', '=', '===', '!==', '[', ']', ',', '<‸>', '|', '?', '?.', '??', '+', '-', '*', '/', '%', '<', '>', '&&', '||', '!', '++', '_', '&', '\\n'],
  python: [':', '(', ')', '"', "'", '=', '==', '!=', '[', ']', '.', ',', '#', '_', '{', '}', '+', '-', '*', '/', '//', '**', '%', '<', '>', '<=', '>=', '+=', 'f"‸"', '{‸}', '->', '\\n', '@', '\\', '&', '|', '~'],
  html: ['<', '>', '</', '/>', '="‸"', '"', '/', '=', '{', '}', '(', ')', ';', ':', '.', '#', '-', '!', '&', '_', "'", '[', ']', '%', '*', '+', '$', '`', '@'],
  sql: ['(', ')', ',', ';', "'", '*', '=', '<', '>', '<>', '<=', '>=', '.', '%', '_', '-', '+', '/', '"', '!=', '||'],
  php: ['$', ';', '->', '(', ')', '{', '}', '"', "'", '=', '==', '===', '!=', '.', '=>', '[', ']', '<', '>', '+', '-', '*', '/', '%', '&&', '||', '!', '?', ':', '::', '\\n', '_', '@', '<?php', '?>'],
  go: ['(', ')', '{', '}', ':=', '"', '.', '=', '==', '!=', ',', '<', '>', '<=', '>=', '+', '-', '*', '/', '%', '&', '[', ']', '<-', '&&', '||', '!', '`', "'", ':', ';', '_', '%d', '%s', '%v', '\\n', '++'],
  rust: [';', '(', ')', '{', '}', '"', '::', '->', '=>', '&', '&mut ', '.', '=', '==', '!=', ',', '<', '>', '!', '?', '[', ']', '..', '{}', '|', ':', "'", '+', '-', '*', '/', '%', '#', '_', '\\n'],
  kotlin: ['(', ')', '{', '}', '"', '.', '=', '==', '!=', ':', ',', '->', '$', '${‸}', '?', '?.', '?:', '!!', '<', '>', '+', '-', '*', '/', '%', '..', '[', ']', '&&', '||', '!', "'", '_', '@', '\\n'],
  swift: ['(', ')', '{', '}', '"', '.', '=', '==', '!=', ':', ',', '->', '\\(‸)', '?', '!', '<', '>', '+', '-', '*', '/', '%', '..<', '...', '[', ']', '&&', '||', '_', '@', '\\n'],
  dart: [';', '(', ')', '{', '}', "'", '"', '.', ...C_OPS, '[', ']', ',', '=>', '$', '${‸}', '?', '??', ':', '<‸>', '_', '\\n'],
  ruby: ['.', '"', "'", '(', ')', '=', '==', '!=', '|', '#{‸}', ':', '[', ']', '{', '}', '=>', '@', '<', '>', '+', '-', '*', '/', '%', '&&', '||', '!', '?', '&.', '<<', '..', '_', '#', '\\n'],
  lua: ['(', ')', '"', "'", '=', '==', '~=', '..', '.', ',', ':', '{', '}', '[', ']', '#', '<', '>', '<=', '>=', '+', '-', '*', '/', '%', '^', '--', '_'],
  bash: ['$', '"', "'", '${‸}', '$(‸)', '|', '>', '>>', '<', '&&', '||', ';', '[', ']', '[[ ‸ ]]', '(', ')', '{', '}', '-', '=', '#', '!', '\\', '~', '/', '*', '.', '_', '&'],
  r: ['<-', '(', ')', '"', ',', '=', '==', '!=', '[', ']', '{', '}', '$', '%>%', '|>', '.', ':', '+', '-', '*', '/', '^', '<', '>', '&', '|', '!', '~', '#', "'", '_'],
  haskell: ['=', '->', '<-', '::', '(', ')', '[', ']', ',', '$', '.', '"', "'", '|', '\\', '++', '==', '/=', '<', '>', '+', '-', '*', '/', '>>=', '<$>', '_', '`', '--'],
  markdown: ['#', '*', '**', '-', '`', '```', '[', ']', '(', ')', '!', '>', '|', '_', '~~', '1.', '- [ ] ', '<', '/', ':', '"'],
  lisp: ['(', ')', '[', ']', "'", '"', '-', '+', '*', '/', '=', '<', '>', '?', '!', ':', '#', '.', '`', ',', ';'],
  ml: ['(', ')', '=', '->', '|', ';', ';;', '"', '[', ']', '::', '@', '.', ',', ':', '<', '>', '+', '-', '*', '/', '^', '_', "'", '<-', '|>', '%d'],
  erlang: ['(', ')', '->', '.', ',', ';', '[', ']', '{', '}', '|', '"', "'", '=', '==', '=:=', '<', '>', '+', '-', '*', '/', '~n', '~p', '_', '%', ':'],
  pascal: [';', ':=', '(', ')', "'", '.', ',', ':', '=', '<>', '<', '>', '<=', '>=', '+', '-', '*', '/', '[', ']', '^', '_', '{', '}'],
  shellish: ['$', '"', "'", '(', ')', '{', '}', '[', ']', '|', '-', '=', ';', '.', ',', '#', '@', '<', '>', '+', '*', '/', '%', '!', '&', '_', '\\', '~'],
};

// Languages that share a set
const family = {
  objc: 'c', zig: 'c', d: 'c', vala: 'csharp', scala: 'kotlin', groovy: 'kotlin', gleam: 'rust', v: 'go', odin: 'go',
  crystal: 'ruby', elixir: 'ruby', nim: 'python', mojo: 'python', julia: 'python', octave: 'python',
  clojure: 'lisp', racket: 'lisp', ocaml: 'ml', fsharp: 'ml', prolog: 'erlang', ada: 'pascal', fortran: 'pascal',
  perl: 'shellish', raku: 'shellish', powershell: 'shellish', vb: 'pascal', cobol: 'pascal', asm: 'shellish',
};

// The comment key toggles comments; its label is the language's line comment
const comments = {
  '#': ['python', 'nim', 'mojo', 'julia', 'ruby', 'crystal', 'elixir', 'bash', 'r', 'perl', 'raku', 'powershell'],
  '--': ['sql', 'lua', 'haskell', 'ada', 'elm'],
  ';': ['lisp', 'clojure', 'racket', 'asm'],
  '%': ['erlang', 'prolog', 'octave'],
  '!': ['fortran'],
  "'": ['vb'],
  '<!--': ['html', 'markdown'],
  '(*': ['ocaml'],
};
const commentOf = (id) => Object.keys(comments).find((c) => comments[c].includes(id)) || (id === 'brainfuck' || id === 'cobol' ? '' : '//');

const setFor = (lang) => keys[lang.id] || keys[family[lang.id]] || keys.c;

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
    this.scroll.replaceChildren();
    const comment = commentOf(lang.id);
    if (comment) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'kb-key kb-comment';
      b.dataset.act = 'comment';
      b.dataset.c = comment;
      b.setAttribute('aria-label', t('kb.comment'));
      b.textContent = `${comment}…`;
      this.scroll.append(b);
    }
    for (const k of setFor(lang)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = k.length > 1 ? 'kb-key kb-wide' : 'kb-key';
      b.dataset.k = k;
      b.textContent = k.replace('‸', '');
      this.scroll.append(b);
    }
    this.scroll.insertAdjacentHTML('beforeend', arrows);
    this.scroll.scrollLeft = 0;
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
    else if (act === 'comment') ed.comment(btn.dataset.c);
    else if (act === 'undo') ed.undo();
    else if (act === 'redo') ed.redo();
    else if (act === 'arrow') {
      const d = btn.dataset.dir;
      ed.moveBy(d === 'left' ? -1 : d === 'right' ? 1 : 0, d === 'up' ? -1 : d === 'down' ? 1 : 0);
    }
    navigator.vibrate?.(4);
  }
}
