// Turns error output into problems with line numbers and friendly hints.
// Hint texts live in i18n.js (hintText).
const C = ['c', 'cpp', 'objc'];
const PY = ['python'];
const JS = ['javascript', 'typescript', 'html'];
const JAVA = ['java', 'kotlin', 'scala', 'csharp', 'vb', 'fsharp'];

// Broad rules that only apply when no specific rule matched
const GENERIC = new Set(['py.syntax', 'js.syntax', 'c.undeclared']);

const rules = [
  [PY, /NameError: name '(\w+)' is not defined/, 'py.name'],
  [PY, /IndentationError|TabError|unindent does not match|expected an indented block/, 'py.indent'],
  [PY, /SyntaxError: expected ':'/, 'py.colon'],
  [PY, /can only concatenate str \(not "\w+"\) to str|unsupported operand type\(s\) for \+: '(?:int|float)' and 'str'|unsupported operand type\(s\) for \+: 'str' and '(?:int|float)'/, 'py.concat'],
  [PY, /invalid literal for int\(\) with base 10: '([^']*)'/, 'py.int'],
  [PY, /ZeroDivisionError/, 'py.zero'],
  [PY, /IndexError: \w+ index out of range/, 'py.index'],
  [PY, /KeyError: (.+)/, 'py.key'],
  [PY, /ModuleNotFoundError: No module named '([\w.]+)'/, 'py.module'],
  [PY, /EOFError/, 'py.eof'],
  [PY, /AttributeError: '(\w+)' object has no attribute '(\w+)'/, 'py.attr'],
  [PY, /TypeError: '\w+' object is not callable/, 'py.notcallable'],
  [PY, /RecursionError/, 'py.recursion'],
  [PY, /UnboundLocalError: (?:cannot access local variable '(\w+)'|local variable '(\w+)')/, 'py.unbound'],
  [PY, /SyntaxError/, 'py.syntax'],
  [JS, /ReferenceError: (\S+) is not defined/, 'js.notdef'],
  [JS, /Cannot read propert(?:y|ies) of (undefined|null) \(reading '([^']*)'\)/, 'js.undef'],
  [JS, /TypeError: (\S+?) is not a function/, 'js.notfn'],
  [JS, /Assignment to constant variable/, 'js.const'],
  [JS, /SyntaxError/, 'js.syntax'],
  [C, /(?:'|‘)(printf|scanf|puts|gets|fgets|getchar|putchar)(?:'|’) (?:undeclared|was not declared)|implicit declaration of function (?:'|‘)(printf|scanf|puts)/, 'c.printf'],
  [C, /(?:'|‘)(cout|cin|endl)(?:'|’) (?:was not declared|undeclared)|use of undeclared identifier '(cout|cin|endl)'/, 'c.cout'],
  [C, /expected (?:'|‘);(?:'|’)/, 'c.semicolon'],
  [C, /(?:'|‘)(\w+)(?:'|’) (?:undeclared|was not declared in this scope)|use of undeclared identifier '(\w+)'/, 'c.undeclared'],
  [C, /fatal error: ([\w./]+): No such file/, 'c.include'],
  [['cpp'], /cannot use '(?:try|throw)' with exceptions disabled/, 'cpp.exceptions'],
  [C, /integer divide by zero|Floating point exception/, 'py.zero'],
  [C, /Stack overflow \(too much recursion\)/, 'py.recursion'],
  [C, /undefined reference to `(?:main|WinMain)/, 'c.main'],
  [['java'], /class (\w+) is public, should be declared in a file named/, 'java.public'],
  [JAVA, /cannot find symbol[\s\S]*?symbol:\s+\w+\s+(\w+)|The name '(\w+)' does not exist|Unresolved reference:? '?(\w+)/, 'java.symbol'],
  [JAVA, /';' expected|CS1002/, 'java.semicolon'],
  [JAVA, /NullPointerException|NullReferenceException/, 'java.npe'],
  [JAVA, /IndexOutOfBoundsException|IndexOutOfRangeException/, 'java.bounds'],
  [JAVA, /incompatible types|Type mismatch|CS0029/, 'java.types'],
  [['lua'], /attempt to (?:call|index|perform arithmetic on|concatenate|compare) (?:a )?nil value(?: \(([^)]*)\))?/, 'lua.nil'],
  [['sql'], /no such table: ([\w.]+)/, 'sql.table'],
  [['sql'], /no such column: ([\w.]+)/, 'sql.column'],
  [['sql'], /near "([^"]*)": syntax error/, 'sql.syntax'],
  [['rust'], /borrow of moved value|cannot borrow|value used here after move/, 'rust.borrow'],
  [['go'], /declared and not used|imported and not used/, 'go.unused'],
  ['*', /MemoryError|out of memory|bad_alloc|OutOfMemoryError/, 'gen.memory'],
];

// <source>:3:5  example.java:5  Main.cs(5,13)  example.pas(5,3)  --> src/main.rs:3:5
const LOC = /(?:<source>|[\w./-]*?(?:example|main|Main|source|prog|program)\.\w{1,6})(?::(\d+)(?::(\d+))?|\((\d+)(?:,(\d+))?\))/g;
const PYLOC = /File "([^"]*)", line (\d+)/g;

export const findProblems = (langId, text, known) => {
  const problems = [];
  if (known?.line) problems.push({ line: known.line, col: known.col, severity: 'error', text: known.message });
  if (!text) return problems;
  if (langId === 'python') {
    let last = null;
    for (const m of text.matchAll(PYLOC)) if (/main|example|source|<exec>|<string>/.test(m[1])) last = +m[2];
    if (last && !problems.length) problems.push({ line: last, severity: 'error' });
    return problems;
  }
  for (const m of text.matchAll(LOC)) {
    const line = +(m[1] || m[3]);
    if (!line) continue;
    const rest = text.slice(m.index, text.indexOf('\n', m.index) === -1 ? undefined : text.indexOf('\n', m.index));
    const severity = /warning|note:/i.test(rest) && !/error/i.test(rest) ? 'warning' : 'error';
    if (/note:/i.test(rest)) continue;
    problems.push({ line, col: +(m[2] || m[4]) || 0, severity, text: rest.replace(m[0], '').replace(/^[:\s]+/, '').slice(0, 200) });
  }
  return problems;
};

export const findHints = (langId, text, { exitCode, timedOut, signal } = {}) => {
  const out = [];
  if (timedOut) out.push({ id: 'gen.timeout', groups: [] });
  if (/Segmentation fault|SIGSEGV/.test(text || '') || (signal === 'SIGSEGV')) out.push({ id: 'c.segfault', groups: [] });
  if (!text) return out;
  for (const [langs, re, id] of rules) {
    if (out.length >= 2) break;
    if (langs !== '*' && !langs.includes(langId)) continue;
    if (GENERIC.has(id) && out.length) continue; // only when nothing more specific matched
    const m = text.match(re);
    if (!m || out.some((h) => h.id === id)) continue;
    // Patterns with alternatives capture into different groups; keep the first one found
    const g = m.slice(1);
    const first = g.find(Boolean);
    out.push({ id, groups: [m[0], first, g.filter(Boolean)[1] ?? g[1]] });
  }
  return out;
};
