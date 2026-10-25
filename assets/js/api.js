// Match data for the site. Fixtures, scores and match details come from
// data/fixtures.json and data/summary/<id>.json, refreshed from ESPN by
// GitHub Actions every few minutes. TheSportsDB and demo fixtures are
// fallbacks for when that file is missing or stale.

import { API } from './config.js';
import { demoDay } from './demo.js';
import { dayKey, addDays, fetchJSON } from './espn.js';

export { dayKey, addDays };

const STALE_MS = 12 * 3600_000;

/* ---------- TheSportsDB fallback ---------- */

function parseSportsDb(ev) {
  const kickoff = new Date(ev.strTimestamp ? `${ev.strTimestamp.replace(' ', 'T')}${/Z|[+-]\d\d:?\d\d$/.test(ev.strTimestamp) ? '' : 'Z'}` : `${ev.dateEvent}T${ev.strTime || '00:00:00'}Z`);
  const s = (ev.strStatus || '').toUpperCase();
  let state = 'pre';
  if (/FINISHED|^FT|AET|PEN/.test(s)) state = 'post';
  else if (/HT/.test(s)) state = 'ht';
  else if (/1H|2H|LIVE|ET/.test(s)) state = 'live';
  else if (/POSTP/.test(s)) state = 'postponed';
  else if (/CANC|ABAN/.test(s)) state = 'cancelled';
  const team = (name, badge, score) => ({
    id: name, name, short: name, abbr: name.slice(0, 3).toUpperCase(), logo: badge || '', color: '', alt: '',
    score: score === null || score === undefined || score === '' ? null : Number(score), pens: null, form: '', record: null, winner: false,
  });
  return {
    id: `tsdb-${ev.idEvent}`,
    league: { slug: `tsdb.${ev.idLeague}`, name: { ar: ev.strLeague, fr: ev.strLeague, en: ev.strLeague }, abbr: '', logo: ev.strLeagueBadge || '', order: 50 },
    kickoff,
    day: dayKey(kickoff),
    status: { state, clock: state === 'live' && ev.strProgress ? `${ev.strProgress}'` : '', detail: ev.strStatus || '', period: 0 },
    home: team(ev.strHomeTeam, ev.strHomeTeamBadge, ev.intHomeScore),
    away: team(ev.strAwayTeam, ev.strAwayTeamBadge, ev.intAwayScore),
    venue: ev.strVenue || '',
    city: ev.strCity || '',
    broadcasts: [],
    events: [],
    source: 'sportsdb',
  };
}

async function fetchSportsDbDay(date) {
  const data = await fetchJSON(`${API.sportsdb}/eventsday.php?d=${dayKey(date)}&s=Soccer`);
  return (data.events || []).map(parseSportsDb);
}

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
 * Returns { matches, source, updatedAt } where source is espn | sportsdb | demo.
 */
export async function loadDay(offset, { force = false } = {}) {
  const date = addDays(new Date(), offset);
  const key = dayKey(date);
  const fx = await loadFixtures({ force });
  if (fx) return { source: 'espn', updatedAt: fx.updatedAt, matches: fx.matches.filter((m) => m.day === key) };
  try {
    return { source: 'sportsdb', matches: await fetchSportsDbDay(date) };
  } catch {
    return { source: 'demo', matches: demoDay(date) };
  }
}

/** Stats, key events and line-ups published for one match. */
export async function loadSummary(slug, id) {
  const res = await fetch(`data/summary/${encodeURIComponent(id)}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { ...data, match: data.match ? revive(data.match) : null };
}
