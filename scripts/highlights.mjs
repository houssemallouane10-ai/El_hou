// Finds the official highlight video for every finished match.
// Runs in GitHub Actions on a schedule: reads finished fixtures from ESPN,
// reads the public YouTube feeds of official league channels, matches
// videos to fixtures by team names and time, and writes data/highlights.json.
//
// Usage: node scripts/highlights.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { LEAGUES, API } from '../assets/js/config.js';
import { ARABIC_NAMES } from './arabic-names.mjs';

const DATA_DIR = new URL('../data/', import.meta.url);
const OUT = new URL('highlights.json', DATA_DIR);
const CHANNEL_CACHE = new URL('yt-channels.json', DATA_DIR);
const EMBED_CACHE = new URL('yt-embed.json', DATA_DIR);

const DAYS_BACK = 3;
const KEEP_DAYS = 10;
const LATEST_MAX = 120;
const MATCH_WINDOW_H = 72;

// Official channels that publish match highlights. `id` is used when known,
// otherwise the channel id is discovered once from the handle page and cached.
export const SOURCES = [
  { key: 'premierleague', name: 'Premier League', id: 'UCG5qGWdu8nIRZqJ_GgDwQ-w', handles: ['@premierleague'], leagues: ['eng.1'] },
  { key: 'laliga', name: 'LALIGA', handles: ['@LaLiga', '@laligaeasports'], leagues: ['esp.1'] },
  { key: 'seriea', name: 'Serie A', id: 'UCBJeMCIeLQos7wacox4hmLQ', handles: ['@SerieA'], leagues: ['ita.1'] },
  { key: 'bundesliga', name: 'Bundesliga', id: 'UC6UL29enLNe4mqwTfAyeNuw', handles: ['@bundesliga'], leagues: ['ger.1'] },
  { key: 'ligue1', name: 'Ligue 1', handles: ['@Ligue1', '@ligue1mcdonalds'], leagues: ['fra.1'] },
  { key: 'golazo', name: 'CBS Sports Golazo', handles: ['@CBSSportsGolazo'], leagues: ['uefa.champions', 'uefa.europa', 'uefa.europa.conf', 'ita.1'] },
  { key: 'tntfootball', name: 'TNT Sports Football', handles: ['@footballontnt', '@tntsports'], leagues: ['uefa.champions', 'uefa.europa', 'uefa.europa.conf', 'eng.1'] },
  { key: 'mls', name: 'Major League Soccer', handles: ['@MLS'], leagues: ['usa.1'] },
  { key: 'spl', name: 'Roshn Saudi League', handles: ['@SPL', '@SaudiProLeague'], leagues: ['ksa.1'] },
  { key: 'caf', name: 'CAF TV', handles: ['@CAFTV', '@CAFonline'], leagues: ['caf.champions', 'caf.confed'] },
  { key: 'ligaportugal', name: 'Liga Portugal', handles: ['@LigaPortugal', '@ligaportugalbetclic', '@LigaPortugalOficial'], leagues: ['por.1'] },
  { key: 'eredivisie', name: 'Eredivisie', handles: ['@eredivisie', '@EredivisieOfficial', '@ESPNNL'], leagues: ['ned.1'] },
  { key: 'efl', name: 'EFL', handles: ['@EFL'], leagues: ['eng.league_cup'] },
  // Arabic-language official channels. Handles that don't exist are skipped.
  { key: 'bein', name: 'beIN SPORTS', lang: 'ar', handles: ['@beINSPORTS', 'c/beINSPORTS', '@beinsportsmena'], leagues: ['eng.1', 'esp.1', 'fra.1', 'uefa.champions', 'uefa.europa', 'uefa.europa.conf'] },
  { key: 'thmanyah', name: 'ثمانية', lang: 'ar', handles: ['@thmanyahsports', '@ThmanyahSport', '@thmanyah'], leagues: ['ksa.1'] },
  { key: 'ontime', name: 'ON Time Sports', lang: 'ar', handles: ['@ONTimeSports', '@ontimesports1'], leagues: ['egy.1'] },
  { key: 'adsports', name: 'AD Sports', lang: 'ar', handles: ['@ADSportsTV', '@adsports'], leagues: ['ita.1'] },
];

const ARABIC = /[؀-ۿ]/;

/** Folds Arabic spelling variants and Arabic-Indic digits so titles compare reliably. */
export function arabicFold(s) {
  return String(s || '')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

// Word lists use letter-aware boundaries so accented words (résumé) match
const words = (list) => new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${list})(?![\\p{L}\\p{N}])`, 'iu');
const HIGHLIGHT_WORDS = new RegExp(`${words('highlights?|resumen|r[eé]sum[eé]|resumo|sintesi|samenvatting|özet|ozet|goals?|goles|buts').source}|ملخص|أهداف|اهداف`, 'iu');
const NOT_ARABIC = /مؤتمر|تصريح|حوار|تدريب|تحليل|استوديو|ستوديو|قبل المباراه|سيدات|الناشيين|مباشر|بودكاست|حلقه/;
const NOT_HIGHLIGHT = words('press conference|conf[eé]rence de presse|rueda de prensa|preview|reaction|interview|training|entrenamiento|behind the scenes|unboxing|live stream|watchalong|classic|rewind|throwback|on this day|retro|women|wsl|u1[789]|u2[13]|academy|f[eé]minin[ea]?|femenino|frauen|femminile');

// Titles that name an earlier season (e.g. "Serie A 2019/20") are archive clips
function oldSeason(title) {
  const now = new Date();
  const current = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const years = [...title.matchAll(/(?:^|\D)(20\d\d)\s*[/-]\s*(\d\d)(?!\d)/g)].map((m) => Number(m[1]));
  return years.some((y) => y < current);
}

// Short forms used in highlight titles that the ESPN names don't contain
const ALIASES = {
  'manchester united': ['man united', 'man utd'],
  'manchester city': ['man city'],
  'tottenham hotspur': ['spurs', 'tottenham'],
  'wolverhampton wanderers': ['wolves'],
  'brighton & hove albion': ['brighton'],
  'nottingham forest': ["nott'm forest", 'forest'],
  'paris saint-germain': ['psg', 'paris sg'],
  'fc cologne': ['koln', 'cologne', 'fc koln'],
  'olympique de marseille': ['marseille', 'om'],
  marseille: ['om'],
  'olympique lyonnais': ['lyon', 'ol'],
  lyon: ['ol'],
  'bayern munich': ['bayern', 'fc bayern', 'bayern munchen', 'bayern muenchen'],
  'borussia dortmund': ['dortmund', 'bvb'],
  'bayer leverkusen': ['leverkusen', 'bayer 04'],
  'borussia monchengladbach': ['gladbach', 'monchengladbach'],
  'eintracht frankfurt': ['frankfurt', 'sge'],
  'internazionale': ['inter', 'inter milan'],
  'inter milan': ['inter'],
  'ac milan': ['milan'],
  'as roma': ['roma'],
  juventus: ['juve'],
  'atletico madrid': ['atletico', 'atleti', 'atletico de madrid'],
  barcelona: ['barca', 'fc barcelona'],
  'athletic club': ['athletic', 'athletic bilbao'],
  'real betis': ['betis'],
  'celta vigo': ['celta'],
  'sporting cp': ['sporting'],
  'al hilal': ['al-hilal', 'alhilal'],
  'al nassr': ['al-nassr', 'alnassr'],
  'al ittihad': ['al-ittihad', 'ittihad'],
  'al ahli': ['al-ahli'],
};

const ALIAS_MAP = Object.fromEntries(Object.entries(ALIASES).map(([k, v]) => [norm(k).trim(), v]));

const ARABIC_MAP = new Map();
ARABIC_NAMES.forEach(([en, ar]) =>
  en.forEach((name) => {
    const key = norm(name).trim();
    ARABIC_MAP.set(key, [...(ARABIC_MAP.get(key) || []), ...ar.map((a) => norm(a).trim())]);
  }),
);

const STRIP = /\b(fc|cf|afc|ac|as|ss|ssc|sc|us|rc|rcd|cd|ud|sd|club|de|calcio|1\.|sv|vfb|vfl|tsg|fsv)\b/g;

export function norm(s) {
  return ` ${arabicFold(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\u0621-\u064a\u0671-\u06d3&']+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

export function teamNames(team) {
  const out = new Set();
  [team.displayName, team.shortDisplayName, team.name, team.location].filter(Boolean).forEach((n) => {
    const full = norm(n).trim();
    out.add(full);
    const stripped = norm(full.replace(STRIP, ' ')).trim();
    if (stripped.length >= 3) out.add(stripped);
    (ALIAS_MAP[full] || ALIAS_MAP[stripped] || []).forEach((a) => out.add(norm(a).trim()));
  });
  [...out].forEach((n) => (ARABIC_MAP.get(n) || []).forEach((a) => out.add(a)));
  return [...out].filter((n) => n.length >= 2);
}

// Arabic titles glue و / ف / ب / ل onto the next word ("ريال مدريد وبرشلونة")
const hasName = (title, names) =>
  names.some((n) => {
    if (title.includes(` ${n} `)) return true;
    if (!ARABIC.test(n)) return false;
    if (['و', 'ف', 'ب', 'ل'].some((p) => title.includes(` ${p}${n} `))) return true;
    return n.startsWith('ال') && (title.includes(` لل${n.slice(2)} `) || title.includes(` ولل${n.slice(2)} `));
  });

const isArabic = (video) => video.lang === 'ar' || ARABIC.test(video.title);

/** Scores how well a video fits a fixture; 0 means no match. */
export function scoreVideo(video, match) {
  const title = norm(video.title);
  if (NOT_HIGHLIGHT.test(video.title) || NOT_ARABIC.test(arabicFold(video.title)) || oldSeason(video.title)) return 0;
  if (!hasName(title, match.homeNames) || !hasName(title, match.awayNames)) return 0;
  const hours = (Date.parse(video.published) - Date.parse(match.date)) / 3_600_000;
  if (hours < 1 || hours > MATCH_WINDOW_H) return 0;
  let score = 10;
  // A score in the title must be this match's result, otherwise it's another game
  const shown = arabicFold(video.title).match(/(?:^|[^\d])(\d{1,2})\s*[-–:]\s*(\d{1,2})(?!\d)/);
  if (shown && match.score?.every((v) => v !== undefined && v !== null)) {
    const [h, a] = match.score.map(Number);
    const [x, y] = [Number(shown[1]), Number(shown[2])];
    if ((x === h && y === a) || (x === a && y === h)) score += 5;
    else return 0;
  }
  if (HIGHLIGHT_WORDS.test(video.title)) score += 10;
  if (/extended|full highlights|resumen completo/i.test(video.title)) score += 3;
  if (video.leagues.includes(match.league)) score += 6;
  score -= Math.min(5, hours / 12);
  return score;
}

/* ---------- Fetching ---------- */

async function get(url, { json = false, timeout = 15_000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; MudarrajHighlights/1.0)', 'accept-language': 'en' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return json ? res.json() : res.text();
  } finally {
    clearTimeout(timer);
  }
}

const ymd = (d) => d.toISOString().slice(0, 10).replaceAll('-', '');

export async function finishedMatches(fetchJson = (u) => get(u, { json: true })) {
  const out = [];
  const days = Array.from({ length: DAYS_BACK }, (_, i) => new Date(Date.now() - i * 86_400_000));
  for (const league of LEAGUES) {
    for (const day of days) {
      try {
        const data = await fetchJson(`${API.espn}/${league.slug}/scoreboard?dates=${ymd(day)}`);
        for (const ev of data.events || []) {
          const comp = ev.competitions?.[0];
          if (ev.status?.type?.state !== 'post' || !comp) continue;
          const home = comp.competitors?.find((c) => c.homeAway === 'home');
          const away = comp.competitors?.find((c) => c.homeAway === 'away');
          if (!home || !away) continue;
          out.push({
            id: String(ev.id),
            league: league.slug,
            date: ev.date,
            home: home.team?.displayName,
            away: away.team?.displayName,
            score: [home.score, away.score].map((s) => (typeof s === 'object' ? s?.value : s)),
            homeNames: teamNames(home.team || {}),
            awayNames: teamNames(away.team || {}),
          });
        }
      } catch {
        /* league or date not served: skip */
      }
    }
  }
  return [...new Map(out.map((m) => [m.id, m])).values()];
}

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

export function parseFeed(xml, source) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map(([, e]) => ({
      videoId: e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1],
      title: decode(e.match(/<title>([^<]*)<\/title>/)?.[1] || ''),
      published: e.match(/<published>([^<]+)<\/published>/)?.[1],
      channel: source.name,
      source: source.key,
      leagues: source.leagues,
      lang: source.lang || '',
    }))
    .filter((v) => v.videoId && /^[\w-]{11}$/.test(v.videoId) && v.published);
}

async function resolveChannelId(source, cache) {
  if (source.id) return source.id;
  if (cache[source.key]) return cache[source.key];
  for (const handle of source.handles || []) {
    try {
      const html = await get(`https://www.youtube.com/${handle}`);
      const id = html.match(/feeds\/videos\.xml\?channel_id=(UC[\w-]{22})/)?.[1] || html.match(/"externalId":"(UC[\w-]{22})"/)?.[1];
      if (id) {
        cache[source.key] = id;
        return id;
      }
    } catch {
      /* try the next handle */
    }
  }
  return null;
}

/**
 * Marks which videos may play on other sites. YouTube's oEmbed endpoint
 * answers 401/403 when the owner turned embedding off and 404 when the video
 * is gone; those videos would only show a "Watch on YouTube" link.
 */
async function checkEmbeddable(ids, cache, statuses = {}) {
  const unknown = [...new Set(ids)].filter((id) => !(id in cache));
  for (let i = 0; i < unknown.length; i += 8) {
    await Promise.all(
      unknown.slice(i, i + 8).map(async (id) => {
        try {
          const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
          const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; MudarrajHighlights/1.0)' } });
          statuses[res.status] = (statuses[res.status] || 0) + 1;
          if (res.ok) cache[id] = true;
          else if ([401, 403, 404].includes(res.status)) cache[id] = false;
        } catch (err) {
          // unknown for now; checked again next run
          statuses[err.name] = (statuses[err.name] || 0) + 1;
        }
      }),
    );
  }
  return cache;
}

async function readJson(url, fallback) {
  try {
    return JSON.parse(await readFile(url, 'utf8'));
  } catch {
    return fallback;
  }
}

/* ---------- Main ---------- */

export function buildOutput(matches, videos, previous) {
  const now = Date.now();
  const byMatch = { ...(previous.matches || {}) };
  const pick = (v) => ({ videoId: v.videoId, title: v.title, channel: v.channel, published: v.published });
  for (const m of matches) {
    let best = null;
    let bestAr = null;
    for (const v of videos) {
      const s = scoreVideo(v, m);
      if (s <= 0) continue;
      if (!best || s > best.score) best = { score: s, v };
      if (isArabic(v) && (!bestAr || s > bestAr.score)) bestAr = { score: s, v };
    }
    const prev = byMatch[m.id];
    if (best && (!prev || best.score >= (prev.score || 0))) {
      byMatch[m.id] = {
        ...pick(best.v), score: Math.round(best.score),
        league: m.league, date: m.date, home: m.home, away: m.away, result: m.score,
        ...(prev?.ar ? { ar: prev.ar } : {}),
      };
    }
    // Keep an Arabic version alongside, since the site prefers Arabic commentary
    if (bestAr && byMatch[m.id]) byMatch[m.id].ar = pick(bestAr.v);
  }
  // Forget matches older than KEEP_DAYS
  Object.keys(byMatch).forEach((id) => {
    if (now - Date.parse(byMatch[id].date) > KEEP_DAYS * 86_400_000) delete byMatch[id];
  });

  const matchByVideo = new Map(
    Object.entries(byMatch).flatMap(([id, h]) => [[h.videoId, id], ...(h.ar ? [[h.ar.videoId, id]] : [])]),
  );
  const seen = new Map((previous.latest || []).map((v) => [v.videoId, v]));
  videos
    // Matched videos count even without a keyword (AD Sports titles are just "Torino 3 - 2 Monza")
    .filter((v) => (HIGHLIGHT_WORDS.test(v.title) || matchByVideo.has(v.videoId)) && !NOT_HIGHLIGHT.test(v.title) && !NOT_ARABIC.test(arabicFold(v.title)) && !oldSeason(v.title))
    .forEach((v) =>
      seen.set(v.videoId, { videoId: v.videoId, title: v.title, channel: v.channel, published: v.published, league: v.leagues[0] || null, lang: isArabic(v) ? 'ar' : '' }),
    );
  const latest = [...seen.values()]
    .map((v) => {
      const matchId = matchByVideo.get(v.videoId) || v.matchId || null;
      return { ...v, matchId, league: byMatch[matchId]?.league || v.league };
    })
    .filter((v) => now - Date.parse(v.published) < KEEP_DAYS * 86_400_000)
    .sort((a, b) => Date.parse(b.published) - Date.parse(a.published))
    .slice(0, LATEST_MAX);

  return { matches: byMatch, latest };
}

// The last published data lives on the site itself; read it from there so
// history survives between runs without committing to the repo.
async function previousData(name, fallback) {
  const base = process.env.PREVIOUS_BASE_URL;
  if (base) {
    try {
      return JSON.parse(await get(`${base.replace(/\/$/, '')}/data/${name}?t=${Date.now()}`));
    } catch {
      /* first deploy, or the site is unreachable */
    }
  }
  return readJson(new URL(name, DATA_DIR), fallback);
}

async function setOutput(key, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  await writeFile(process.env.GITHUB_OUTPUT, `${key}=${value}\n`, { flag: 'a' });
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  const previous = await previousData('highlights.json', { matches: {}, latest: [] });
  const cache = await previousData('yt-channels.json', {});
  const embeds = await previousData('yt-embed.json', {});

  // Checked recently: carry the published files over unchanged
  const minGap = Number(process.env.HIGHLIGHTS_MIN_INTERVAL_MIN || 0) * 60_000;
  const lastRun = minGap ? await previousData('hl-status.json', {}) : {};
  if (minGap && lastRun.at && previous.latest?.length && Date.now() - Date.parse(lastRun.at) < minGap) {
    await writeFile(OUT, `${JSON.stringify(previous)}\n`);
    await writeFile(CHANNEL_CACHE, `${JSON.stringify(cache, null, 2)}\n`);
    await writeFile(EMBED_CACHE, `${JSON.stringify(embeds)}\n`);
    await writeFile(new URL('hl-status.json', DATA_DIR), `${JSON.stringify(lastRun)}\n`);
    await setOutput('changed', false);
    console.log(`Highlights checked at ${lastRun.at}; carrying the published files over`);
    return;
  }
  // Compare against what's live, before blocked videos are cleaned out below
  const published = JSON.stringify({ m: previous.matches, l: previous.latest });
  const cacheBefore = JSON.stringify(cache);

  const videos = [];
  const feedErrors = {};
  for (const source of SOURCES) {
    const id = await resolveChannelId(source, cache);
    if (!id) {
      feedErrors[source.name] = 'channel not found';
      console.log(`! ${source.name}: channel not found`);
      continue;
    }
    // YouTube's feeds fail now and then from datacenter IPs; one retry
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const feed = parseFeed(await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`), source);
        videos.push(...feed);
        delete feedErrors[source.name];
        console.log(`  ${source.name}: ${feed.length} videos`);
        if (source.lang) feed.slice(0, 3).forEach((v) => console.log(`      · ${v.title.slice(0, 90)}`));
        break;
      } catch (err) {
        feedErrors[source.name] = err.message;
        console.log(`! ${source.name}: feed failed (${err.message})`);
        if (attempt === 1) await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  // Only keep videos that can play inside the site
  const embedStatuses = {};
  await checkEmbeddable(videos.map((v) => v.videoId), embeds, embedStatuses);
  console.log(`  embed check responses: ${JSON.stringify(embedStatuses)}`);
  const blockedBy = {};
  videos.forEach((v) => embeds[v.videoId] === false && (blockedBy[v.channel] = (blockedBy[v.channel] || 0) + 1));
  Object.entries(blockedBy).forEach(([ch, n]) => console.log(`  ${ch}: ${n} videos can't be embedded, skipped`));
  const playableVideos = videos.filter((v) => embeds[v.videoId] !== false);
  const ok = (id) => embeds[id] !== false;
  Object.entries(previous.matches || {}).forEach(([id, h]) => {
    if (h.ar && !ok(h.ar.videoId)) delete h.ar;
    if (!ok(h.videoId)) {
      if (h.ar) Object.assign(h, h.ar);
      else delete previous.matches[id];
    }
  });
  previous.latest = (previous.latest || []).filter((v) => ok(v.videoId));

  const matches = await finishedMatches();
  console.log(`  ${matches.length} finished matches in the last ${DAYS_BACK} days`);
  const out = buildOutput(matches, playableVideos, previous);

  const changed =
    published !== JSON.stringify({ m: out.matches, l: out.latest }) ||
    JSON.stringify(cache) !== cacheBefore;
  await writeFile(CHANNEL_CACHE, `${JSON.stringify(cache, null, 2)}\n`);
  // Keep the embed cache to the videos still in play
  const keep = new Set([...videos.map((v) => v.videoId), ...Object.values(out.matches).flatMap((h) => [h.videoId, h.ar?.videoId]), ...out.latest.map((v) => v.videoId)]);
  await writeFile(EMBED_CACHE, `${JSON.stringify(Object.fromEntries(Object.entries(embeds).filter(([id]) => keep.has(id))))}\n`);
  await writeFile(OUT, `${JSON.stringify({ updatedAt: changed ? new Date().toISOString() : previous.updatedAt || null, ...out })}\n`);
  // Run diagnostics, published so the site check can read them
  const feeds = Object.fromEntries(SOURCES.map((src) => [src.name, videos.filter((v) => v.source === src.key).length]));
  await writeFile(new URL('hl-status.json', DATA_DIR), `${JSON.stringify({ at: new Date().toISOString(), feeds, feedErrors, embedStatuses })}\n`);
  await setOutput('changed', changed);
  const arabic = Object.values(out.matches).filter((h) => h.ar).length;
  console.log(changed ? `Found ${Object.keys(out.matches).length} matched highlights (${arabic} in Arabic), ${out.latest.length} latest videos` : 'No new highlights');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
