// Builds ../vendor from npm packages, then stamps sw.js (see stamp.mjs).
//   cd barmaj/tools && npm ci && npm run build
import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
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

console.log('vendor built');
await import('./stamp.mjs');
