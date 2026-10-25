// CodeMirror 6 editor with themes driven by CSS variables, error marks and
// helpers used by the mobile symbol bar.
import * as CM from '../vendor/cm/cm.js';

const {
  EditorView, EditorState, Compartment, StateEffect, StateField, Decoration, GutterMarker, gutter, RangeSet,
  keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor,
  rectangularSelection, crosshairCursor, highlightSpecialChars, history, defaultKeymap, historyKeymap,
  indentWithTab, indentOnInput, bracketMatching, syntaxHighlighting, HighlightStyle, indentUnit,
  searchKeymap, highlightSelectionMatches, autocompletion, completionKeymap, closeBrackets,
  closeBracketsKeymap, completeAnyWord, insertBracket, tags: t, Prec, undo, redo, indentMore, indentLess,
  ViewPlugin, RangeSetBuilder, syntaxTree, ensureSyntaxTree, tagHighlighter, highlightTree,
} = CM;

// One table drives both the editor colours and the code image (snap.js)
const TOKENS = [
  [[t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword], 'kw'],
  [[t.string, t.special(t.string), t.character, t.inserted, t.processingInstruction], 'str'],
  [[t.number, t.bool, t.atom, t.null, t.unit], 'num'],
  [[t.function(t.variableName), t.function(t.propertyName), t.macroName, t.labelName], 'fn'],
  [[t.typeName, t.className, t.namespace, t.annotation, t.self, t.standard(t.name)], 'type'],
  [[t.propertyName, t.attributeName], 'prop'],
  [[t.definition(t.variableName), t.definition(t.propertyName)], 'def'],
  [[t.operator, t.escape, t.regexp, t.url, t.derefOperator], 'op'],
  [[t.tagName], 'tag'],
  [[t.comment, t.meta, t.docComment], 'comment'],
  [[t.heading], 'kw'],
  [[t.link], 'fn'],
  [[t.invalid], 'tag'],
  [[t.punctuation, t.bracket, t.separator], 'punc'],
];

const highlight = HighlightStyle.define([
  ...TOKENS.map(([tag, name]) => ({ tag, color: `var(--hl-${name})`, ...(name === 'comment' ? { fontStyle: 'italic' } : {}) })),
  { tag: t.heading, fontWeight: '700' },
  { tag: t.strong, fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, textDecoration: 'underline' },
]);

const tokenClasses = tagHighlighter(TOKENS.map(([tag, name]) => ({ tag, class: name })));

// Rainbow brackets: each nesting level gets its own colour
const OPEN = '([{';
const CLOSE = ')]}';
const skipNode = /string|comment|regexp|char/i;
const rainbowMarks = Array.from({ length: 6 }, (_, i) => Decoration.mark({ class: `cm-rb${i}` }));

const rainbow = ViewPlugin.fromClass(class {
  constructor(view) { this.decorations = this.build(view); }

  update(u) {
    if (u.docChanged || u.viewportChanged || syntaxTree(u.startState) !== syntaxTree(u.state)) this.decorations = this.build(u.view);
  }

  build(view) {
    const { state } = view;
    const tree = syntaxTree(state);
    const builder = new RangeSetBuilder();
    const { from, to } = view.viewport;
    const text = state.doc.sliceString(0, Math.min(to, 200000));
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const open = OPEN.includes(c);
      if (!open && !CLOSE.includes(c)) continue;
      if (skipNode.test(tree.resolveInner(i, 1).type.name)) continue;
      if (!open) depth = Math.max(0, depth - 1);
      if (i >= from) builder.add(i, i + 1, rainbowMarks[depth % 6]);
      if (open) depth++;
    }
    return builder.finish();
  }
}, { decorations: (v) => v.decorations });

// Indent guides: one thin line per indentation level, drawn as a background
const indentGuides = ViewPlugin.fromClass(class {
  constructor(view) { this.decorations = this.build(view); }

  update(u) {
    if (u.docChanged || u.viewportChanged) this.decorations = this.build(u.view);
  }

  build(view) {
    const { state } = view;
    const tab = state.tabSize;
    const unit = Math.max(1, state.facet(indentUnit).length || tab);
    const builder = new RangeSetBuilder();
    const columns = (line) => {
      let col = 0;
      for (const ch of line.text) {
        if (ch === ' ') col++;
        else if (ch === '\t') col += tab - (col % tab);
        else return col;
      }
      return -1;
    };
    for (const { from, to } of view.visibleRanges) {
      for (let pos = from; pos <= to;) {
        const line = state.doc.lineAt(pos);
        let col = columns(line);
        if (col < 0) {
          // Blank lines continue the guides of the next non-blank line
          for (let n = line.number + 1; n <= Math.min(state.doc.lines, line.number + 50); n++) {
            col = columns(state.doc.line(n));
            if (col >= 0) break;
          }
        }
        const levels = Math.floor(Math.max(0, col) / unit);
        if (levels > 0) {
          builder.add(line.from, line.from, Decoration.line({ class: 'cm-ig', attributes: { style: `--ig:${levels};--igu:${unit}` } }));
        }
        pos = line.to + 1;
      }
    }
    return builder.finish();
  }
}, { decorations: (v) => v.decorations });



const theme = EditorView.theme({
  '&': { height: '100%', color: 'var(--code-fg)', backgroundColor: 'var(--code-bg)', fontSize: 'var(--code-size)' },
  '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.6', overscrollBehavior: 'contain' },
  '.cm-content': { caretColor: 'var(--accent)', padding: '10px 0 40vh' },
  '.cm-line': { padding: '0 12px 0 6px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection':
    { backgroundColor: 'var(--code-sel) !important' },
  '.cm-gutters': { backgroundColor: 'var(--code-bg)', color: 'var(--code-gutter)', border: 'none', paddingInlineStart: '4px' },
  '.cm-activeLine': { backgroundColor: 'var(--code-active)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--code-fg)' },
  '.cm-lineNumbers .cm-gutterElement': { minWidth: '2.2ch', padding: '0 6px 0 2px' },
  '.cm-matchingBracket': { backgroundColor: 'var(--code-match)', outline: '1px solid var(--code-match-line)' },
  '.cm-selectionMatch': { backgroundColor: 'var(--code-match)' },
  '.cm-searchMatch': { backgroundColor: 'var(--code-search)', outline: '1px solid var(--warn)' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'var(--code-sel)' },
  '.cm-panels': { backgroundColor: 'var(--panel-2)', color: 'var(--text)', borderColor: 'var(--line)' },
  '.cm-panels.cm-panels-bottom': { borderTop: '1px solid var(--line)' },
  '.cm-panel.cm-search': { padding: '8px 10px', fontFamily: 'var(--sans)', fontSize: '14px' },
  '.cm-panel.cm-search input, .cm-panel.cm-search button': { fontSize: '14px', borderRadius: '8px', padding: '6px 10px' },
  '.cm-textfield': { backgroundColor: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--line)' },
  '.cm-button': { backgroundImage: 'none', backgroundColor: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--line)' },
  '.cm-tooltip': { backgroundColor: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden' },
  '.cm-tooltip-autocomplete > ul': { fontFamily: 'var(--mono)', maxHeight: '40vh' },
  '.cm-tooltip-autocomplete > ul > li': { padding: '6px 10px !important' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--accent)', color: 'var(--accent-ink)' },
  '.cm-completionIcon': { opacity: '.6' },
  '.cm-errline': { backgroundColor: 'var(--err-line)' },
  '.cm-warnline': { backgroundColor: 'var(--warn-line)' },
  '.cm-mark-gutter': { width: '10px' },
  '.cm-mark-err, .cm-mark-warn': { display: 'block', width: '7px', height: '7px', borderRadius: '50%', margin: '0.6em auto 0' },
  '.cm-mark-err': { backgroundColor: 'var(--danger)' },
  '.cm-mark-warn': { backgroundColor: 'var(--warn)' },
  '.cm-foldPlaceholder': { backgroundColor: 'var(--panel-2)', border: 'none', color: 'var(--muted)' },
});

// Error / warning marks set after a run, cleared on the next edit
const setMarks = StateEffect.define();

class Dot extends GutterMarker {
  constructor(kind) { super(); this.kind = kind; }
  eq(o) { return o.kind === this.kind; }
  toDOM() {
    const el = document.createElement('span');
    el.className = `cm-mark-${this.kind}`;
    return el;
  }
}

const marks = StateField.define({
  create: () => ({ lines: Decoration.none, dots: RangeSet.empty }),
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setMarks)) return e.value;
    if (tr.docChanged) return { lines: Decoration.none, dots: RangeSet.empty };
    return value;
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.lines),
});

const markGutter = gutter({
  class: 'cm-mark-gutter',
  markers: (view) => view.state.field(marks).dots,
});

const loaded = {};
const loadGrammar = (hl) => {
  if (!loaded[hl]) {
    const load = CM.grammars[hl];
    loaded[hl] = load ? load().catch(() => []) : Promise.resolve([]);
  }
  return loaded[hl];
};

export class Editor {
  constructor(parent, { onChange, onRun, onSave, onInput }) {
    this.onChange = onChange;
    this.onInput = onInput;
    this.langToken = 0;
    this.c = {
      lang: new Compartment(),
      indent: new Compartment(),
      wrap: new Compartment(),
      numbers: new Compartment(),
      brackets: new Compartment(),
      complete: new Compartment(),
      rainbow: new Compartment(),
      guides: new Compartment(),
    };
    // Current content of each compartment, reused when a new document state is created
    this.cur = { lang: [], indent: [], wrap: [], numbers: [], brackets: [], complete: [], rainbow: [], guides: [] };
    this.runKeys = keymap.of([
      { key: 'Mod-Enter', run: () => { onRun(); return true; } },
      { key: 'Shift-Enter', run: () => { onRun(); return true; } },
      { key: 'Mod-s', run: () => { onSave(); return true; }, preventDefault: true },
    ]);
    this.view = new EditorView({ parent, state: this.newState('') });
  }

  newState(doc) {
    const { c, cur } = this;
    return EditorState.create({
      doc,
      extensions: [
        Prec.highest(this.runKeys),
        c.numbers.of(cur.numbers),
        highlightActiveLineGutter(),
        markGutter,
        highlightSpecialChars(),
        history(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(highlight),
        bracketMatching(),
        c.brackets.of(cur.brackets),
        c.complete.of(cur.complete),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        marks,
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...completionKeymap, indentWithTab]),
        c.lang.of(cur.lang),
        c.indent.of(cur.indent),
        c.wrap.of(cur.wrap),
        c.rainbow.of(cur.rainbow),
        c.guides.of(cur.guides),
        EditorState.languageData.of(() => [{ autocomplete: completeAnyWord }]),
        EditorView.contentAttributes.of({ autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', translate: 'no' }),
        theme,
        EditorView.updateListener.of((u) => {
          if (!u.docChanged) return;
          this.onChange(u.state.doc.toString());
          for (const tr of u.transactions) {
            if (tr.isUserEvent('input')) this.onInput?.('type', tr);
            else if (tr.isUserEvent('delete')) this.onInput?.('delete', tr);
          }
        }),
      ],
    });
  }

  set(parts) {
    Object.assign(this.cur, parts);
    this.view.dispatch({ effects: Object.entries(parts).map(([k, v]) => this.c[k].reconfigure(v)) });
  }

  configure(s) {
    this.closeBracketsOn = s.closeBrackets;
    this.set({
      numbers: s.lineNumbers ? lineNumbers() : [],
      brackets: s.closeBrackets ? closeBrackets() : [],
      complete: s.autocomplete ? autocompletion({ activateOnTypingDelay: 150, icons: true }) : [],
      wrap: s.wrap ? EditorView.lineWrapping : [],
      indent: [indentUnit.of(' '.repeat(s.tabSize)), EditorState.tabSize.of(s.tabSize)],
      rainbow: s.rainbow ? rainbow : [],
      guides: s.guides ? indentGuides : [],
    });
  }

  async setLanguage(hl) {
    const token = ++this.langToken;
    const support = await loadGrammar(hl);
    if (token !== this.langToken) return;
    this.set({ lang: support });
  }

  // Replace the whole document (switching files) with a fresh undo history
  setDoc(code) {
    this.view.setState(this.newState(code));
  }

  get value() { return this.view.state.doc.toString(); }

  focus() { this.view.focus(); }

  type(text) {
    const v = this.view;
    if (this.closeBracketsOn && text.length === 1) {
      const tr = insertBracket(v.state, text);
      if (tr) { v.dispatch(tr); return; }
    }
    v.dispatch(v.state.update(v.state.replaceSelection(text), { scrollIntoView: true, userEvent: 'input.type' }));
  }

  tab(back) { (back ? indentLess : indentMore)(this.view); }

  // Insert the indent unit at the cursor (like a Tab key) when nothing is selected
  tabKey() {
    const v = this.view;
    if (!v.state.selection.main.empty) { indentMore(v); return; }
    this.type(v.state.facet(indentUnit));
  }

  undo() { undo(this.view); }

  redo() { redo(this.view); }

  run(cmd) { CM[cmd]?.(this.view); }

  moveBy(dx, dy) {
    const v = this.view;
    const cmd = dx < 0 ? CM.cursorCharLeft : dx > 0 ? CM.cursorCharRight : dy < 0 ? CM.cursorLineUp : CM.cursorLineDown;
    const n = Math.abs(dx || dy);
    for (let i = 0; i < n; i++) cmd(v);
  }

  goToLine(n) {
    const v = this.view;
    const line = v.state.doc.line(Math.max(1, Math.min(n, v.state.doc.lines)));
    v.dispatch({ selection: { anchor: line.from }, scrollIntoView: true, effects: EditorView.scrollIntoView(line.from, { y: 'center' }) });
    v.focus();
  }

  // problems: [{ line, severity: 'error' | 'warning' }]
  mark(problems) {
    const doc = this.view.state.doc;
    const lines = [];
    const dots = [];
    const seen = new Set();
    for (const p of problems) {
      if (!p.line || p.line > doc.lines || seen.has(p.line)) continue;
      seen.add(p.line);
      const from = doc.line(p.line).from;
      const kind = p.severity === 'warning' ? 'warn' : 'err';
      lines.push(Decoration.line({ class: `cm-${kind}line` }).range(from));
      dots.push(new Dot(kind).range(from));
    }
    const sort = (a, b) => a.from - b.from;
    this.view.dispatch({
      effects: setMarks.of({ lines: Decoration.set(lines.sort(sort)), dots: RangeSet.of(dots.sort(sort)) }),
    });
  }

  openSearch() { CM.openSearchPanel(this.view); }

  // Screen position of the cursor, for the typing effects
  caretCoords() {
    const v = this.view;
    return v.coordsAtPos(v.state.selection.main.head);
  }

  // Lines of [text, token class] pairs for the code image; uses the selection if there is one
  tokens(maxLines = 160) {
    const state = this.view.state;
    const sel = state.selection.main;
    const from = sel.empty ? 0 : state.doc.lineAt(sel.from).from;
    const to = sel.empty ? state.doc.length : state.doc.lineAt(sel.to).to;
    const tree = ensureSyntaxTree(state, to, 1500) || syntaxTree(state);
    const spans = [];
    highlightTree(tree, tokenClasses, (a, b, cls) => spans.push([a, b, cls]), from, to);
    const lines = [];
    let line = [];
    let pos = from;
    const push = (a, b, cls) => {
      const parts = state.doc.sliceString(a, b).split('\n');
      parts.forEach((part, i) => {
        if (i > 0) { lines.push(line); line = []; }
        if (part) line.push([part, cls]);
      });
    };
    for (const [a, b, cls] of spans) {
      if (a > pos) push(pos, a, '');
      push(a, b, cls.split(' ')[0]);
      pos = b;
    }
    if (pos < to) push(pos, to, '');
    lines.push(line);
    return { lines: lines.slice(0, maxLines), more: Math.max(0, lines.length - maxLines), firstLine: state.doc.lineAt(from).number };
  }
}
