// Builds ../vendor from npm packages and writes ../precache.json,
// the list of files the service worker stores for offline use.
//   cd barmaj/tools && npm ci && npm run build
import { build } from 'esbuild';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..');
const vendor = join(app, 'vendor');
const mod = (p) => join(here, 'node_modules', p);

await rm(vendor, { recursive: true, force: true });
await mkdir(vendor, { recursive: true });

await build({
  entryPoints: { cm: join(here, 'src/cm-entry.js') },
  outdir: join(vendor, 'cm'),
  bundle: true,
  splitting: true,
  format: 'esm',
  minify: true,
  target: ['es2020', 'chrome90', 'firefox90', 'safari15'],
  chunkNames: 'c-[hash]',
  legalComments: 'none',
});

await build({
  entryPoints: [join(here, 'src/sucrase-entry.js')],
  outfile: join(vendor, 'sucrase.js'),
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['es2020', 'chrome90', 'firefox90', 'safari15'],
  legalComments: 'none',
});

const copies = [
  ['sql.js/dist/sql-wasm.js', 'sql-wasm.js'],
  ['sql.js/dist/sql-wasm.wasm', 'sql-wasm.wasm'],
  ['sql.js/LICENSE', 'sql.js.LICENSE'],
  ['wasmoon/dist/index.js', 'wasmoon.js'],
  ['wasmoon/dist/glue.wasm', 'wasmoon.wasm'],
  ['wasmoon/LICENSE', 'wasmoon.LICENSE'],
  ['codemirror/LICENSE', 'codemirror.LICENSE'],
  ['sucrase/LICENSE', 'sucrase.LICENSE'],
  ['marked/LICENSE', 'marked.LICENSE'],
];
for (const [from, to] of copies) await cp(mod(from), join(vendor, to));

// Everything the app needs offline: the shell plus the vendor files.
const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((e) => {
  const p = join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
}))).flat();
const skip = /(\.LICENSE|\.md|\.map)$|^(tools|precache\.json|sw\.js)/;
const files = (await walk(app))
  .map((p) => relative(app, p).split('\\').join('/'))
  .filter((p) => !p.startsWith('tools/') && !skip.test(p))
  .sort();
const pkg = JSON.parse(await readFile(join(here, 'package.json'), 'utf8'));
await writeFile(join(app, 'precache.json'), JSON.stringify({ files: ['./', ...files.filter((f) => f !== 'index.html')], deps: pkg.devDependencies }, null, 1) + '\n');
console.log(`vendor built, ${files.length} files in precache.json`);
