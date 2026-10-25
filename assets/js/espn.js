// ESPN scoreboard and match summary: fetching and parsing.
// ESPN doesn't allow browsers on other sites to read its API (no CORS), so
// this runs in GitHub Actions (scripts/fixtures.mjs), which publishes the
// results as data/fixtures.json and data/summary/<id>.json for the site.

import { API, LEAGUES } from './config.js';

const leagueBySlug = new Map(LEAGUES.map((l, i) => [l.slug, { ...l, order: i }]));

export const dayKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const espnDate = (date) => dayKey(date).replaceAll('-', '');

export async function fetchJSON(url, { timeout = 10_000, retries = 1 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
      return await res.json();
    } catch (err) {
      // 4xx means the league slug or date is not served; retrying won't help
      if (attempt >= retries || (err.status >= 400 && err.status < 500)) throw err;
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
}

export async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { ok: true, value: await worker(items[i]) };
      } catch (error) {
        results[i] = { ok: false, error };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

/* ---------- ESPN parsing ---------- */

function parseRecord(c) {
  const rec = (c.records || c.record || []).find((r) => !r.type || r.type === 'total') || (c.records || [])[0];
  const parts = rec?.summary?.split('-').map(Number);
  if (!parts || parts.length < 3 || parts.some(Number.isNaN)) return null;
  // ESPN soccer records read W-D-L
  return { w: parts[0], d: parts[1], l: parts[2] };
}

function parseTeam(c) {
  const team = c.team || {};
  return {
    id: String(team.id ?? c.id ?? ''),
    name: team.displayName || team.name || team.shortDisplayName || '—',
    short: team.shortDisplayName || team.displayName || '—',
    abbr: team.abbreviation || (team.displayName || '').slice(0, 3).toUpperCase(),
    logo: team.logo || team.logos?.[0]?.href || '',
    color: team.color ? `#${team.color}` : '',
    alt: team.alternateColor ? `#${team.alternateColor}` : '',
    score: c.score === undefined || c.score === '' ? null : Number(typeof c.score === 'object' ? c.score.value : c.score),
    pens: c.shootoutScore ?? null,
    form: typeof c.form === 'string' ? c.form : '',
    record: parseRecord(c),
    winner: !!c.winner,
  };
}

function parseStatus(st = {}) {
  const type = st.type || {};
  const name = type.name || '';
  let state = type.state || 'pre';
  if (/POSTPONED|DELAYED|SUSPENDED/.test(name)) state = 'postponed';
  else if (/CANCEL|ABANDON/.test(name)) state = 'cancelled';
  else if (/HALFTIME/.test(name)) state = 'ht';
  else if (state === 'in') state = 'live';
  return {
    state,
    clock: st.displayClock && state === 'live' ? st.displayClock : '',
    detail: type.shortDetail || type.detail || '',
    period: st.period || 0,
  };
}

function parseDetails(details = [], homeId) {
  return details
    .map((d) => {
      const text = d.type?.text || '';
      let kind = null;
      if (d.scoringPlay || /goal|penalty - scored/i.test(text)) kind = /own/i.test(text) || d.ownGoal ? 'own' : 'goal';
      else if (d.redCard || /red/i.test(text)) kind = 'red';
      else if (d.yellowCard || /yellow/i.test(text)) kind = 'yellow';
      if (!kind) return null;
      const teamId = String(d.team?.id ?? '');
      return {
        kind,
        minute: d.clock?.displayValue || '',
        seconds: d.clock?.value ?? 0,
        side: teamId === homeId ? 'home' : 'away',
        player: d.athletesInvolved?.[0]?.displayName || d.athletesInvolved?.[0]?.shortName || '',
        penalty: !!d.penaltyKick || /penalty/i.test(text),
      };
    })
    .filter(Boolean);
}

function parseBroadcasts(comp) {
  const names = new Set();
  (comp.broadcasts || []).forEach((b) => (b.names || []).forEach((n) => names.add(n)));
  (comp.geoBroadcasts || []).forEach((g) => g.media?.shortName && names.add(g.media.shortName));
  return [...names];
}

function leagueMeta(slug, raw = {}) {
  const known = leagueBySlug.get(slug);
  return {
    slug,
    name: known?.name || { ar: raw.name, fr: raw.name, en: raw.name },
    abbr: raw.abbreviation || raw.shortName || '',
    logo: raw.logos?.[0]?.href || '',
    order: known?.order ?? 99,
  };
}

function parseEspnEvent(ev, league) {
  const comp = ev.competitions?.[0];
  if (!comp) return null;
  const homeC = comp.competitors?.find((c) => c.homeAway === 'home');
  const awayC = comp.competitors?.find((c) => c.homeAway === 'away');
  if (!homeC || !awayC) return null;
  const home = parseTeam(homeC);
  const away = parseTeam(awayC);
  const kickoff = new Date(ev.date || comp.date);
  return {
    id: String(ev.id),
    league,
    kickoff,
    day: dayKey(kickoff),
    status: parseStatus(ev.status || comp.status),
    home,
    away,
    venue: comp.venue?.fullName || '',
    city: comp.venue?.address?.city || '',
    broadcasts: parseBroadcasts(comp),
    events: parseDetails(comp.details, home.id),
    source: 'espn',
  };
}

export async function fetchLeagueDay(slug, date) {
  const url = `${API.espn}/${slug}/scoreboard?dates=${espnDate(date)}`;
  const data = await fetchJSON(url);
  const league = leagueMeta(slug, data.leagues?.[0]);
  return (data.events || []).map((ev) => parseEspnEvent(ev, league)).filter(Boolean);
}

/* ---------- Match summary ---------- */

function parseStats(boxscore, homeId) {
  const teams = boxscore?.teams || [];
  if (teams.length < 2) return [];
  const byId = Object.fromEntries(teams.map((t) => [String(t.team?.id), t.statistics || []]));
  const homeStats = byId[homeId] || teams[0].statistics || [];
  const awayStats = teams.find((t) => String(t.team?.id) !== homeId)?.statistics || teams[1].statistics || [];
  const wanted = ['possessionPct', 'totalShots', 'shotsOnTarget', 'wonCorners', 'foulsCommitted', 'offsides', 'yellowCards', 'redCards', 'saves', 'accuratePasses', 'totalPasses'];
  return wanted
    .map((name) => {
      const h = homeStats.find((s) => s.name === name);
      const a = awayStats.find((s) => s.name === name);
      if (!h || !a) return null;
      return { name, label: h.label || name, home: parseFloat(h.displayValue) || 0, away: parseFloat(a.displayValue) || 0 };
    })
    .filter(Boolean);
}

function parseKeyEvents(list = [], homeId) {
  return list
    .map((e) => {
      const text = e.type?.text || '';
      let kind = null;
      if (e.scoringPlay || /goal/i.test(text)) kind = /own/i.test(text) ? 'own' : 'goal';
      else if (/red/i.test(text)) kind = 'red';
      else if (/yellow/i.test(text)) kind = 'yellow';
      else if (/substitution/i.test(text)) kind = 'sub';
      else if (/kickoff|halftime|end|start/i.test(text)) kind = 'phase';
      if (!kind) return null;
      const teamId = String(e.team?.id ?? '');
      return {
        kind,
        minute: e.clock?.displayValue || '',
        seconds: e.clock?.value ?? 0,
        side: teamId ? (teamId === homeId ? 'home' : 'away') : '',
        player: e.participants?.[0]?.athlete?.displayName || '',
        other: e.participants?.[1]?.athlete?.displayName || '',
        text: e.shortText || e.text || text,
        penalty: /penalty/i.test(text),
      };
    })
    .filter(Boolean);
}

function parseRosters(rosters = [], homeId) {
  const out = { home: null, away: null };
  rosters.forEach((r) => {
    const side = String(r.team?.id) === homeId ? 'home' : 'away';
    const players = (r.roster || []).map((p) => ({
      name: p.athlete?.displayName || p.athlete?.shortName || '',
      number: p.jersey || '',
      pos: p.position?.abbreviation || '',
      starter: !!p.starter,
    }));
    out[side] = { formation: r.formation || '', players };
  });
  return out.home || out.away ? out : null;
}

export async function fetchSummary(slug, id) {
  const data = await fetchJSON(`${API.espn}/${slug}/summary?event=${id}`, { timeout: 12_000 });
  const comp = data.header?.competitions?.[0];
  let match = null;
  if (comp) {
    const league = leagueMeta(slug, data.header?.league);
    match = parseEspnEvent({ id, date: comp.date, status: comp.status, competitions: [comp] }, league);
    if (match && data.gameInfo?.venue) {
      match.venue = data.gameInfo.venue.fullName || match.venue;
      match.city = data.gameInfo.venue.address?.city || match.city;
    }
  }
  const homeId = match?.home.id || '';
  return {
    match,
    stats: parseStats(data.boxscore, homeId),
    keyEvents: parseKeyEvents(data.keyEvents, homeId),
    rosters: parseRosters(data.rosters, homeId),
  };
}
