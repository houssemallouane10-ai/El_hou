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
} = CM;

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword], color: 'var(--hl-kw)' },
  { tag: [t.string, t.special(t.string), t.character, t.inserted, t.processingInstruction], color: 'var(--hl-str)' },
  { tag: [t.number, t.bool, t.atom, t.null, t.unit], color: 'var(--hl-num)' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName, t.labelName], color: 'var(--hl-fn)' },
  { tag: [t.typeName, t.className, t.namespace, t.annotation, t.self, t.standard(t.name)], color: 'var(--hl-type)' },
  { tag: [t.propertyName, t.attributeName], color: 'var(--hl-prop)' },
  { tag: [t.definition(t.variableName), t.definition(t.propertyName)], color: 'var(--hl-def)' },
  { tag: [t.operator, t.escape, t.regexp, t.url, t.derefOperator], color: 'var(--hl-op)' },
  { tag: [t.tagName], color: 'var(--hl-tag)' },
  { tag: [t.comment, t.meta, t.docComment], color: 'var(--hl-comment)', fontStyle: 'italic' },
  { tag: [t.heading], color: 'var(--hl-kw)', fontWeight: '700' },
  { tag: t.strong, fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: 'var(--hl-fn)', textDecoration: 'underline' },
  { tag: t.invalid, color: 'var(--danger)' },
  { tag: [t.punctuation, t.bracket, t.separator], color: 'var(--hl-punc)' },
]);

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
  constructor(parent, { onChange, onRun, onSave }) {
    this.onChange = onChange;
    this.langToken = 0;
    this.c = {
      lang: new Compartment(),
      indent: new Compartment(),
      wrap: new Compartment(),
      numbers: new Compartment(),
      brackets: new Compartment(),
      complete: new Compartment(),
    };
    // Current content of each compartment, reused when a new document state is created
    this.cur = { lang: [], indent: [], wrap: [], numbers: [], brackets: [], complete: [] };
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
        EditorState.languageData.of(() => [{ autocomplete: completeAnyWord }]),
        EditorView.contentAttributes.of({ autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', translate: 'no' }),
        theme,
        EditorView.updateListener.of((u) => { if (u.docChanged) this.onChange(u.state.doc.toString()); }),
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
}
