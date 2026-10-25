// Runs SQL on a fresh in-memory SQLite database (sql.js). Every statement that
// returns rows becomes a table in the output panel.
importScripts('../vendor/sql-wasm.js');

const post = (type, data) => postMessage({ type, ...data });
const MAX_ROWS = 2000;

const lineAt = (code, offset) => {
  let i = offset;
  while (i < code.length && /\s/.test(code[i])) i++;
  return code.slice(0, i).split('\n').length;
};

self.onmessage = async ({ data }) => {
  if (data.type !== 'run') return;
  let SQL;
  try {
    SQL = await self.initSqlJs({ locateFile: (f) => new URL('../vendor/' + f, self.location.href).href });
  } catch (e) {
    post('done', { ok: false, time: 0, engineError: String(e.message || e) });
    return;
  }
  const db = new SQL.Database();
  const code = data.code;
  const start = performance.now();
  const it = db.iterateStatements(code);
  let offset = 0;
  let count = 0;
  try {
    for (const stmt of it) {
      const sql = stmt.getSQL().trim();
      const columns = stmt.getColumnNames();
      const rows = [];
      let total = 0;
      while (stmt.step()) {
        total++;
        if (rows.length < MAX_ROWS) rows.push(stmt.get());
      }
      stmt.free();
      count++;
      if (columns.length) post('table', { columns, rows, sql, total });
      else post('sqlinfo', { sql, changes: db.getRowsModified() });
      offset = code.length - (it.getRemainingSQL() || '').length;
    }
    post('done', { ok: true, time: performance.now() - start, statements: count });
  } catch (e) {
    const message = String(e.message || e);
    post('err', { text: `Error: ${message}\n` });
    post('done', { ok: false, time: performance.now() - start, error: { name: 'SQLError', message, line: lineAt(code, offset) } });
  } finally {
    db.close();
  }
};
