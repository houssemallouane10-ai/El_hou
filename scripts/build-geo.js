// Builds shared/geo.js: Algeria's 69 wilayas and 1,541 communes (Law 26-06 of 4 April 2026,
// Journal officiel n° 25). Run only when the source data changes:
//
//   node scripts/build-geo.js <wilayas.json> <communes.json> <wilaya-commune.json>
//
// Inputs (both MIT licensed, both following the 2026 division):
//   - wilayas.json, communes.json: github.com/me-yasserzaouag/algeria-wilayas-communes (data/)
//     Commune ids, wilaya membership and Latin names come from here.
//   - wilaya-commune.json: github.com/islam-re/Algeria-wilayas (json/wilaya-commune/)
//     Its Arabic names are cleaner (no decorative tatweel, presentation forms or typos), so
//     they replace the first source's Arabic names after matching communes by Latin name.
// Commune ids are stored in the database: never renumber them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [wilayasFile, communesFile, bilingualFile] = process.argv.slice(2);
if (!bilingualFile) {
  console.error('Usage: node scripts/build-geo.js <wilayas.json> <communes.json> <wilaya-commune.json>');
  process.exit(1);
}

const char = (code) => String.fromCharCode(code);
const range = (from, to) => `${char(from)}-${char(to)}`;
const ARABIC_NOISE = new RegExp(`[${char(0x640)}${range(0x64b, 0x652)}${char(0x654)}${char(0x670)}${range(0x200b, 0x200f)}]`, 'g');
const ARABIC_SWAPS = [
  [char(0x6a8), char(0x642)], // ڨ -> ق
  [char(0x6a4), char(0x642)], // ڤ -> ق
  [char(0x6af), char(0x642)], // گ -> ق
  [char(0x6be), char(0x647)], // ھ -> ه
  [char(0x6cc), char(0x64a)], // ی -> ي
  [char(0x6a9), char(0x643)], // ک -> ك
  [char(0x67e), char(0x628)], // پ -> ب
];
const LATIN_MARKS = new RegExp(`[${range(0x300, 0x36f)}]`, 'g');

const cleanArabic = (value) => {
  let text = String(value).normalize('NFKC').replace(ARABIC_NOISE, '');
  for (const [from, to] of ARABIC_SWAPS) text = text.split(from).join(to);
  return text.replace(/[().-]+/g, ' ').replace(/\s+/g, ' ').trim();
};

const cleanLatin = (value) => String(value).replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();
const latinKey = (value) => String(value).toLowerCase().normalize('NFKD').replace(LATIN_MARKS, '').replace(/[^a-z]/g, '');

const levenshtein = (a, b) => {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
};
const similarity = (a, b) => {
  const x = latinKey(a);
  const y = latinKey(b);
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length, 1);
};

// French spelling of wilaya names (the sources are ASCII-only).
const WILAYA_FRENCH = {
  6: 'Béjaïa',
  8: 'Béchar',
  12: 'Tébessa',
  19: 'Sétif',
  20: 'Saïda',
  22: 'Sidi Bel Abbès',
  26: 'Médéa',
  44: 'Aïn Defla',
  45: 'Naâma',
  46: 'Aïn Témouchent',
  47: 'Ghardaïa',
  52: 'Béni Abbès',
  65: 'Aïn Oussara',
  68: 'Bou Saâda',
};

// Communes where the sources disagree or carry an outdated name, settled by hand.
const COMMUNE_FIXES = {
  376: { fr: 'El Ogla El Malha', ar: 'العقلة المالحة' }, // wilaya 62; distinct from El Ogla (Tébessa)
};
const FIXES_BY_NAME = [
  { wilaya: 14, from: 'Ouled Djerad', fr: 'Djebilet Rosfa', ar: 'جبيلات الرصفاء' },
  { wilaya: 13, from: 'Souk El Khemis', fr: 'Beni Khellad', ar: 'بني خلاد' },
  { wilaya: 13, from: 'Oued Chouly', fr: 'Oued Lakhdar', ar: 'وادي الخضر' },
  { wilaya: 13, from: 'Beni Semiel', ar: 'بني صميل' },
  { wilaya: 13, from: 'Beni Mester', ar: 'بني مستر' },
  { wilaya: 14, from: 'Nadorah', ar: 'الناظورة' },
  { wilaya: 68, from: 'Oued Chair', fr: 'Mohamed Boudiaf', ar: 'محمد بوضياف' }, // renamed in 1992
  { wilaya: 68, from: 'Ouled Atia', fr: 'Menaa (Ouled Atia)', ar: 'منعة' },
  { wilaya: 60, from: 'Metkaouak', fr: 'Abdelkader Azil', ar: 'عبد القادر عزيل' },
  { wilaya: 24, from: 'Hammam Maskhoutine', fr: 'Hammam Debagh', ar: 'حمام دباغ' },
  { wilaya: 61, from: 'El Outaya', ar: 'الوطاية' },
  { wilaya: 63, from: 'El Gor', ar: 'القور' },
  { wilaya: 27, from: 'El Hassiane', ar: 'الحسيان' },
  { wilaya: 25, from: 'Ibn Badis', ar: 'ابن باديس' },
];

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const wilayas = readJson(wilayasFile);
const communes = readJson(communesFile);
const bilingual = readJson(bilingualFile);

if (wilayas.length !== 69 || communes.length !== 1541) throw new Error(`Unexpected counts: ${wilayas.length} wilayas, ${communes.length} communes`);

// Pair each commune with its counterpart in the bilingual source: same wilaya, closest Latin name.
const arabicById = new Map();
for (const wilaya of bilingual) {
  const ours = communes.filter((commune) => commune.wilaya_code === wilaya.code);
  if (ours.length !== wilaya.communes.length) throw new Error(`Commune count differs for wilaya ${wilaya.code}`);
  const candidates = [];
  for (const commune of ours) {
    wilaya.communes.forEach((other, index) => candidates.push({ commune, other, index, score: similarity(commune.name, other.ascii) }));
  }
  candidates.sort((a, b) => b.score - a.score);
  const usedOurs = new Set();
  const usedTheirs = new Set();
  for (const { commune, other, index } of candidates) {
    if (usedOurs.has(commune.id) || usedTheirs.has(index)) continue;
    usedOurs.add(commune.id);
    usedTheirs.add(index);
    arabicById.set(commune.id, cleanArabic(other.arabic));
  }
}

const rows = communes.map((commune) => ({
  id: commune.id,
  wilaya: commune.wilaya_code,
  ar: arabicById.get(commune.id) ?? cleanArabic(commune.name_ar),
  fr: cleanLatin(commune.name),
}));

for (const row of rows) {
  const wilaya = wilayas.find((item) => item.code === row.wilaya);
  if (latinKey(row.fr) === latinKey(wilaya.name) && WILAYA_FRENCH[row.wilaya]) row.fr = WILAYA_FRENCH[row.wilaya];
  if (COMMUNE_FIXES[row.id]) Object.assign(row, COMMUNE_FIXES[row.id]);
}
for (const fix of FIXES_BY_NAME) {
  const row = rows.find((item) => item.wilaya === fix.wilaya && latinKey(communes.find((c) => c.id === item.id).name) === latinKey(fix.from));
  if (!row) throw new Error(`Fix target not found: ${fix.from} (${fix.wilaya})`);
  if (fix.fr) row.fr = fix.fr;
  if (fix.ar) row.ar = fix.ar;
}

// Guard rails: every name present, no duplicate names inside a wilaya.
for (const wilaya of wilayas) {
  const list = rows.filter((row) => row.wilaya === wilaya.code);
  for (const key of ['ar', 'fr']) {
    const seen = new Set();
    for (const row of list) {
      if (!row[key]) throw new Error(`Missing ${key} name for commune ${row.id}`);
      if (seen.has(row[key])) throw new Error(`Duplicate ${key} name "${row[key]}" in wilaya ${wilaya.code}`);
      seen.add(row[key]);
    }
  }
}

const wilayaRows = wilayas
  .sort((a, b) => a.code - b.code)
  .map((wilaya) => [wilaya.code, cleanArabic(wilaya.name_ar), WILAYA_FRENCH[wilaya.code] ?? cleanLatin(wilaya.name)]);
const communeRows = rows
  .sort((a, b) => a.wilaya - b.wilaya || a.id - b.id)
  .map((row) => [row.id, row.wilaya, row.ar, row.fr]);

const quote = (value) => (typeof value === 'number' ? String(value) : `'${value.replace(/'/g, "\\'")}'`);
const line = (items) => `  [${items.map(quote).join(', ')}],`;

const source = `// Generated by scripts/build-geo.js — do not edit by hand.
// Algeria's 69 wilayas and 1,541 communes (Law 26-06 of 4 April 2026, Journal officiel n° 25).
// Data: github.com/me-yasserzaouag/algeria-wilayas-communes and github.com/islam-re/Algeria-wilayas
// (both MIT). Commune ids are stored in the database and must never change.

// [code, arabic, french]
const WILAYA_ROWS = [
${wilayaRows.map(line).join('\n')}
];

// [id, wilaya code, arabic, french]
const COMMUNE_ROWS = [
${communeRows.map(line).join('\n')}
];

export const WILAYAS = WILAYA_ROWS.map(([code, ar, fr]) => ({ code, ar, fr }));
export const COMMUNES = COMMUNE_ROWS.map(([id, wilaya, ar, fr]) => ({ id, wilaya, ar, fr }));

const wilayasByCode = new Map(WILAYAS.map((wilaya) => [wilaya.code, wilaya]));
const communesById = new Map(COMMUNES.map((commune) => [commune.id, commune]));
const communesByWilaya = new Map(WILAYAS.map((wilaya) => [wilaya.code, COMMUNES.filter((commune) => commune.wilaya === wilaya.code)]));

export const wilayaByCode = (code) => wilayasByCode.get(Number(code)) ?? null;
export const communeById = (id) => communesById.get(Number(id)) ?? null;
export const communesOfWilaya = (code) => communesByWilaya.get(Number(code)) ?? [];
`;

const target = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'shared', 'geo.js');
fs.writeFileSync(target, source);
console.log(`Wrote ${path.relative(process.cwd(), target)}: ${wilayaRows.length} wilayas, ${communeRows.length} communes`);
