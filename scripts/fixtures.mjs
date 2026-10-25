// Publishes fixtures, live scores and match details for the site.
// Browsers can't read ESPN's API from another site (no CORS), so GitHub
// Actions fetches it here and the site reads the files it writes:
//   data/fixtures.json         matches from yesterday to the day after tomorrow
//   data/summary/<id>.json     stats, key events and line-ups per match
//
// Usage: node scripts/fixtures.mjs  (PREVIOUS_BASE_URL lets it skip
// redeploying when nothing changed since the last published version)

import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { LEAGUES } from '../assets/js/config.js';
import { fetchLeagueDay, fetchSummary, pool } from '../assets/js/espn.js';

const DATA_DIR = new URL('../data/', import.meta.url);
const SUMMARY_DIR = new URL('summary/', DATA_DIR);
const DAYS = [-1, 0, 1, 2];
const HOUR = 3_600_000;

// Matches whose details are worth publishing: live, recently finished,
// or close enough to kick-off for line-ups to be out
function wantsSummary(m, now) {
  const kickoff = new Date(m.kickoff).getTime();
  const { state } = m.status;
  if (state === 'live' || state === 'ht') return true;
  if (state === 'post') return now - kickoff < 36 * HOUR;
  if (state === 'pre') return kickoff - now < 90 * 60_000 && now - kickoff < 3 * HOUR;
  return false;
}

async function previousFixtures() {
  const base = process.env.PREVIOUS_BASE_URL;
  if (!base) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/data/fixtures.json?t=${Date.now()}`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function setOutput(key, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  await writeFile(process.env.GITHUB_OUTPUT, `${key}=${value}\n`, { flag: 'a' });
}

async function main() {
  const now = Date.now();
  const jobs = DAYS.flatMap((offset) => LEAGUES.map((league) => ({ league, date: new Date(now + offset * 24 * HOUR) })));
  const results = await pool(jobs, 8, ({ league, date }) => fetchLeagueDay(league.slug, date));
  const byId = new Map();
  results.forEach((r) => r.ok && r.value.forEach((m) => byId.set(m.id, m)));
  const matches = [...byId.values()]
    .map(({ day, ...m }) => m)
    .sort((a, b) => a.kickoff - b.kickoff || a.league.order - b.league.order);
  const reached = results.filter((r) => r.ok).length;
  console.log(`  ${matches.length} matches from ${reached}/${jobs.length} scoreboards`);

  const previous = await previousFixtures();
  if (!matches.length) {
    // ESPN unreachable this run: keep what's published rather than blank it
    console.log('! No matches fetched; keeping the published fixtures');
    if (previous) await writeFile(new URL('fixtures.json', DATA_DIR), `${JSON.stringify(previous)}\n`);
    await setOutput('changed', false);
    return;
  }

  await rm(SUMMARY_DIR, { recursive: true, force: true });
  await mkdir(SUMMARY_DIR, { recursive: true });
  const wanted = matches.filter((m) => wantsSummary(m, now));
  const summaries = await pool(wanted, 6, async (m) => {
    const s = await fetchSummary(m.league.slug, m.id);
    const body = JSON.stringify(s);
    await writeFile(new URL(`${encodeURIComponent(m.id)}.json`, SUMMARY_DIR), `${body}\n`);
    return body;
  });
  console.log(`  ${summaries.filter((r) => r.ok).length}/${wanted.length} match summaries`);

  const hash = createHash('sha256')
    .update(JSON.stringify(matches))
    .update(summaries.map((r) => (r.ok ? r.value : '')).join('\n'))
    .digest('hex')
    .slice(0, 16);
  const changed = previous?.hash !== hash;
  const out = { updatedAt: changed ? new Date(now).toISOString() : previous.updatedAt, hash, matches };
  await writeFile(new URL('fixtures.json', DATA_DIR), `${JSON.stringify(out)}\n`);
  await setOutput('changed', changed);
  console.log(changed ? 'Fixtures changed' : 'Fixtures unchanged');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
