// Match data for the site. Fixtures, scores and match details come from
// data/fixtures.json and data/summary/<id>.json, refreshed from ESPN by
// GitHub Actions every few minutes (browsers can't call ESPN directly).

import { dayKey, addDays } from './espn.js';

export { dayKey, addDays };

const STALE_MS = 12 * 3600_000;

/* ---------- Public API ---------- */

let fixtures = null;
let pending = null;
let fetchedAt = 0;

// Day keys are recomputed here so matches land on the viewer's local day
const revive = (m) => {
  const kickoff = new Date(m.kickoff);
  return { ...m, kickoff, day: dayKey(kickoff) };
};

/** Fetches data/fixtures.json at most once a minute unless forced. */
export function loadFixtures({ force = false } = {}) {
  if (!force && pending && Date.now() - fetchedAt < 55_000) return pending;
  fetchedAt = Date.now();
  pending = fetch('data/fixtures.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      const fresh = d?.matches?.length && Date.now() - Date.parse(d.updatedAt) < STALE_MS;
      if (fresh) fixtures = { updatedAt: d.updatedAt, matches: d.matches.map(revive) };
      return fixtures;
    })
    .catch(() => fixtures);
  return pending;
}

/**
 * Matches for one calendar day (offset from today, viewer's time zone).
 * Returns { matches, source, updatedAt }; source is 'pending' while the
 * data file is missing, e.g. for the minute a new deploy takes to land.
 */
export async function loadDay(offset, { force = false } = {}) {
  const key = dayKey(addDays(new Date(), offset));
  const fx = await loadFixtures({ force });
  if (!fx) return { source: 'pending', matches: [] };
  return { source: 'espn', updatedAt: fx.updatedAt, matches: fx.matches.filter((m) => m.day === key) };
}

/** Stats, key events and line-ups published for one match. */
export async function loadSummary(slug, id) {
  const res = await fetch(`data/summary/${encodeURIComponent(id)}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { ...data, match: data.match ? revive(data.match) : null };
}
