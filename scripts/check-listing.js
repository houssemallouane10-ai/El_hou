// Checks store/listing.md against Google Play's limits: in every language section, the first
// three subsections are the app name (30), the short description (80) and the full description
// (4000 characters).   node scripts/check-listing.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LIMITS = [['name', 30], ['short description', 80], ['full description', 4000]];
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'store', 'listing.md');
const text = fs.readFileSync(file, 'utf8');

let failed = false;
for (const section of text.split(/^## /m).slice(1)) {
  const language = section.split('\n')[0].trim();
  const fields = section.split(/^### /m).slice(1).map((part) => part.split('\n').slice(1).join('\n').trim());
  if (fields.length < LIMITS.length) continue;
  for (const [index, [label, max]] of LIMITS.entries()) {
    const length = [...fields[index]].length;
    const ok = length > 0 && length <= max;
    failed ||= !ok;
    console.log(`${ok ? '✔' : '✘'} ${language} — ${label}: ${length}/${max}`);
  }
}
process.exitCode = failed ? 1 : 0;
