// Everything the app needs from CodeMirror 6, bundled into vendor/cm.js.
// Language grammars are split into separate chunks and loaded on demand.
import { StreamLanguage } from '@codemirror/language';

export {
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter,
  drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars,
  Decoration, ViewPlugin, WidgetType, GutterMarker, gutter, placeholder,
} from '@codemirror/view';
export {
  EditorState, EditorSelection, Compartment, StateEffect, StateField, RangeSet, RangeSetBuilder, Prec,
} from '@codemirror/state';
export {
  defaultKeymap, history, historyKeymap, indentWithTab, undo, redo, indentMore, indentLess,
  toggleComment, selectAll, cursorCharLeft, cursorCharRight, cursorLineUp, cursorLineDown,
  cursorLineBoundaryBackward, cursorLineBoundaryForward, selectCharLeft, selectCharRight,
  insertNewlineAndIndent, undoDepth, redoDepth,
} from '@codemirror/commands';
export {
  indentOnInput, bracketMatching, foldGutter, foldKeymap, syntaxHighlighting, HighlightStyle,
  indentUnit, LanguageSupport, StreamLanguage, syntaxTree, ensureSyntaxTree,
} from '@codemirror/language';
export { searchKeymap, highlightSelectionMatches, openSearchPanel, closeSearchPanel } from '@codemirror/search';
export {
  autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap, completeAnyWord,
  insertBracket, snippetCompletion, nextSnippetField, hasNextSnippetField, acceptCompletion,
  completionStatus,
} from '@codemirror/autocomplete';
export { tags, tagHighlighter, highlightTree } from '@lezer/highlight';

const legacy = (load, name) => () => load().then((m) => StreamLanguage.define(m[name]));

// Keys are the `hl` values used by js/langs.js
export const grammars = {
  javascript: () => import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true })),
  typescript: () => import('@codemirror/lang-javascript').then((m) => m.javascript({ typescript: true })),
  python: () => import('@codemirror/lang-python').then((m) => m.python()),
  html: () => import('@codemirror/lang-html').then((m) => m.html()),
  css: () => import('@codemirror/lang-css').then((m) => m.css()),
  sql: () => import('@codemirror/lang-sql').then((m) => m.sql({ dialect: m.SQLite, upperCaseKeywords: true })),
  markdown: () => import('@codemirror/lang-markdown').then((m) => m.markdown()),
  cpp: () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
  java: () => import('@codemirror/lang-java').then((m) => m.java()),
  rust: () => import('@codemirror/lang-rust').then((m) => m.rust()),
  php: () => import('@codemirror/lang-php').then((m) => m.php()),
  go: () => import('@codemirror/lang-go').then((m) => m.go()),
  json: () => import('@codemirror/lang-json').then((m) => m.json()),
  xml: () => import('@codemirror/lang-xml').then((m) => m.xml()),
  lua: legacy(() => import('@codemirror/legacy-modes/mode/lua'), 'lua'),
  ruby: legacy(() => import('@codemirror/legacy-modes/mode/ruby'), 'ruby'),
  perl: legacy(() => import('@codemirror/legacy-modes/mode/perl'), 'perl'),
  r: legacy(() => import('@codemirror/legacy-modes/mode/r'), 'r'),
  shell: legacy(() => import('@codemirror/legacy-modes/mode/shell'), 'shell'),
  swift: legacy(() => import('@codemirror/legacy-modes/mode/swift'), 'swift'),
  kotlin: legacy(() => import('@codemirror/legacy-modes/mode/clike'), 'kotlin'),
  csharp: legacy(() => import('@codemirror/legacy-modes/mode/clike'), 'csharp'),
  scala: legacy(() => import('@codemirror/legacy-modes/mode/clike'), 'scala'),
  dart: legacy(() => import('@codemirror/legacy-modes/mode/clike'), 'dart'),
  objc: legacy(() => import('@codemirror/legacy-modes/mode/clike'), 'objectiveC'),
  haskell: legacy(() => import('@codemirror/legacy-modes/mode/haskell'), 'haskell'),
  clojure: legacy(() => import('@codemirror/legacy-modes/mode/clojure'), 'clojure'),
  erlang: legacy(() => import('@codemirror/legacy-modes/mode/erlang'), 'erlang'),
  fortran: legacy(() => import('@codemirror/legacy-modes/mode/fortran'), 'fortran'),
  pascal: legacy(() => import('@codemirror/legacy-modes/mode/pascal'), 'pascal'),
  d: legacy(() => import('@codemirror/legacy-modes/mode/d'), 'd'),
  julia: legacy(() => import('@codemirror/legacy-modes/mode/julia'), 'julia'),
  crystal: legacy(() => import('@codemirror/legacy-modes/mode/crystal'), 'crystal'),
  ocaml: legacy(() => import('@codemirror/legacy-modes/mode/mllike'), 'oCaml'),
  fsharp: legacy(() => import('@codemirror/legacy-modes/mode/mllike'), 'fSharp'),
  vb: legacy(() => import('@codemirror/legacy-modes/mode/vb'), 'vb'),
  cobol: legacy(() => import('@codemirror/legacy-modes/mode/cobol'), 'cobol'),
  scheme: legacy(() => import('@codemirror/legacy-modes/mode/scheme'), 'scheme'),
  commonlisp: legacy(() => import('@codemirror/legacy-modes/mode/commonlisp'), 'commonLisp'),
  groovy: legacy(() => import('@codemirror/legacy-modes/mode/groovy'), 'groovy'),
  powershell: legacy(() => import('@codemirror/legacy-modes/mode/powershell'), 'powerShell'),
  tcl: legacy(() => import('@codemirror/legacy-modes/mode/tcl'), 'tcl'),
  octave: legacy(() => import('@codemirror/legacy-modes/mode/octave'), 'octave'),
  gas: legacy(() => import('@codemirror/legacy-modes/mode/gas'), 'gas'),
  brainfuck: legacy(() => import('@codemirror/legacy-modes/mode/brainfuck'), 'brainfuck'),
  smalltalk: legacy(() => import('@codemirror/legacy-modes/mode/smalltalk'), 'smalltalk'),
  elm: legacy(() => import('@codemirror/legacy-modes/mode/elm'), 'elm'),
  toml: legacy(() => import('@codemirror/legacy-modes/mode/toml'), 'toml'),
  yaml: legacy(() => import('@codemirror/legacy-modes/mode/yaml'), 'yaml'),
  wast: legacy(() => import('@codemirror/legacy-modes/mode/wast'), 'wast'),
};

export const loadMarked = () => import('marked').then((m) => m.marked);
