import { SITE, REFRESH, COMMENTARY_LANGS, LEAGUES } from './config.js';
import { REGIONS, DEFAULT_REGION, CHANNELS, channelsFor, coverage } from './channels.js';
import { loadHighlights, highlightFor, highlightsFor, latestHighlights, markUnplayable, thumbUrl } from './highlights.js';
import { mountYouTube } from './yt.js';
import { t, getLang, setLang, onLangChange, applyDocumentLang, languageName, formatTime, formatDay, formatShortDay } from './i18n.js';
import { loadDay, loadFixtures, loadSummary, dayKey, addDays } from './api.js';
import { predict, grade } from './predict.js';
import { sourcesFor, addUserLink } from './streams.js';
import { StreamPlayer } from './player.js';
import { MatchSim } from './sim.js';
import { PitchView, kitColors } from './pitch.js';
import { icon } from './icons.js';
import { store } from './store.js';
import { esc, safeUrl } from './util.js';

const hex = (c, fallback = '#2a3a35') => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : fallback);

const app = document.getElementById('app');
const DAY_ROUTES = { yesterday: -1, today: 0, tomorrow: 1 };

const state = {
  days: {},
  byId: new Map(),
  route: { name: 'home', day: 0 },
  filter: 'all',
  league: 'all',
  query: '',
  updatedAt: null,
  flash: new Set(),
};

let hero = null;
let matchPage = null;
let lastListKey = '';

/* ---------- Helpers ---------- */

const lname = (league) => esc(league.name?.[getLang()] || league.name?.en || league.abbr || '');
const isLive = (m) => m.status.state === 'live' || m.status.state === 'ht';
const isOver = (m) => m.status.state === 'post';
const isUpcoming = (m) => m.status.state === 'pre';
const matchHref = (m) => `#/match/${encodeURIComponent(m.league.slug)}/${encodeURIComponent(m.id)}`;
const pct = (v) => `${Math.round(v * 100)}%`;
const minutesUntil = (m) => Math.round((m.kickoff - Date.now()) / 60_000);

function crest(team, size = '') {
  const color = hex(team.color, '#3a4a44');
  const logo = safeUrl(team.logo);
  return `<span class="crest${size ? ` crest-${size}` : ''}" style="--c:${color}"><b>${esc(team.abbr.slice(0, 3))}</b>${logo ? `<img src="${logo}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ''}</span>`;
}

function statusLabel(m) {
  const s = m.status.state;
  if (s === 'live') return `<span class="st st-live"><i></i>${esc(m.status.clock || t('status.live'))}</span>`;
  if (s === 'ht') return `<span class="st st-live"><i></i>${t('status.ht')}</span>`;
  if (s === 'post') return `<span class="st st-ft">${t('status.ft')}${m.home.pens !== null && m.home.pens !== undefined ? ` · ${esc(m.home.pens)}-${esc(m.away.pens)} P` : ''}</span>`;
  if (s === 'postponed') return `<span class="st st-off">${t('status.postponed')}</span>`;
  if (s === 'cancelled') return `<span class="st st-off">${t('status.cancelled')}</span>`;
  const mins = minutesUntil(m);
  if (mins > 0 && mins <= 90) return `<span class="st st-soon">${t('status.soon', { m: mins })}</span>`;
  return m.day === dayKey(new Date()) ? '' : `<span class="st">${formatShortDay(m.kickoff)}</span>`;
}

function centerBox(m) {
  const scored = (isLive(m) || isOver(m)) && m.home.score !== null;
  if (scored) {
    return `<div class="sc ${isLive(m) ? 'sc-live' : ''}"><b>${esc(m.home.score)}</b><i>:</i><b>${esc(m.away.score)}</b></div>${statusLabel(m)}`;
  }
  return `<div class="sc sc-time"><b>${formatTime(m.kickoff)}</b></div>${statusLabel(m)}`;
}

// Score pair laid out in reading order, so the home side sits next to the home team
const scorePair = (h, a) => `<span class="psc"><b>${esc(h)}</b><i>-</i><b>${esc(a)}</b></span>`;

function predBar(p, compact = false) {
  return `<div class="pbar ${compact ? 'pbar-sm' : ''}" role="img" aria-label="1 ${pct(p.pHome)} · X ${pct(p.pDraw)} · 2 ${pct(p.pAway)}">
    <span class="pb-h" style="flex:${p.pHome.toFixed(3)}">${compact ? '' : pct(p.pHome)}</span>
    <span class="pb-d" style="flex:${p.pDraw.toFixed(3)}">${compact ? '' : pct(p.pDraw)}</span>
    <span class="pb-a" style="flex:${p.pAway.toFixed(3)}">${compact ? '' : pct(p.pAway)}</span>
  </div>`;
}

let toastBox;
function toast(text, kind = '') {
  toastBox ||= document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = text;
  toastBox.appendChild(el);
  while (toastBox.children.length > 3) toastBox.firstChild.remove();
  setTimeout(() => el.classList.add('out'), 3800);
  setTimeout(() => el.remove(), 4400);
}

/* ---------- Data ---------- */

function index(matches) {
  matches.forEach((m) => {
    const old = state.byId.get(m.id);
    if (old && old.home.score !== null && m.home.score !== null) {
      const side = m.home.score > old.home.score ? 'home' : m.away.score > old.away.score ? 'away' : null;
      if (side) {
        state.flash.add(m.id);
        toast(`${t('toast.goal', { t: m[side].short })} · ${m.home.short} ${m.home.score}-${m.away.score} ${m.away.short}`, 'goal');
        matchPage?.onGoal?.(m, side);
      }
    }
    state.byId.set(m.id, m);
  });
}

function dayMatches(offset) {
  const key = dayKey(addDays(new Date(), offset));
  const all = new Map();
  Object.values(state.days).forEach((d) => d?.matches.forEach((m) => all.set(m.id, state.byId.get(m.id) || m)));
  return [...all.values()].filter((m) => m.day === key).sort((a, b) => a.league.order - b.league.order || a.kickoff - b.kickoff);
}

async function fetchDay(offset, opts) {
  const res = await loadDay(offset, opts);
  index(res.matches);
  state.days[offset] = res;
  // Show when the data was published, not when this tab fetched it
  state.updatedAt = res.updatedAt ? new Date(res.updatedAt) : null;
  if (res.source === 'pending') retryPending();
  return res;
}

const dataSource = () => state.days[0]?.source || state.days[1]?.source || 'espn';

// The data file can be missing for a minute while a deploy lands: keep
// trying quietly instead of showing an empty schedule
let retryTimer = null;
function retryPending() {
  if (retryTimer) return;
  retryTimer = setTimeout(async () => {
    retryTimer = null;
    await loadFixtures({ force: true });
    await Promise.all([-1, 0, 1].map((o) => fetchDay(o)));
    render({ soft: true });
  }, 15_000);
}

async function initialLoad() {
  await Promise.all([fetchDay(0), loadHighlights()]);
  render();
  await Promise.all([fetchDay(1), fetchDay(-1)]);
  render({ soft: true });
}

async function pollLive() {
  const today = state.days[0];
  if (!today) return;
  if (today.source !== 'espn') return;
  const now = Date.now();
  const hot = dayMatches(0).concat(dayMatches(-1)).some(
    (m) => isLive(m) || (isUpcoming(m) && m.kickoff - now < 10 * 60_000 && now - m.kickoff < 3 * 3600_000),
  );
  if (!hot) return;
  await loadFixtures({ force: true });
  await Promise.all([-1, 0, 1].map((o) => fetchDay(o)));
  render({ soft: true });
}

/* ---------- Header & ticker ---------- */

function renderChrome() {
  document.title = `${SITE.name[getLang()]} · ${t('hero.cta')}`;
  document.querySelectorAll('.brand-name').forEach((el) => (el.textContent = SITE.name[getLang()]));
  const live = dayMatches(0).filter(isLive).length;
  const badge = document.getElementById('liveCount');
  badge.textContent = live;
  badge.hidden = !live;
  document.querySelectorAll('.mainnav a').forEach((a) => {
    const r = a.dataset.route;
    const on = (r === 'home' && state.route.name === 'home' && state.filter !== 'live') ||
      (r === 'live' && state.route.name === 'home' && state.filter === 'live') ||
      (r === 'predictions' && state.route.name === 'predictions') ||
      (r === 'channels' && state.route.name === 'channels') ||
      (r === 'highlights' && state.route.name === 'highlights');
    a.toggleAttribute('aria-current', on);
  });
  document.getElementById('langSelect').value = getLang();
  renderTicker();
}

function renderTicker() {
  const track = document.getElementById('tickerTrack');
  const list = dayMatches(0);
  const ordered = [...list.filter(isLive), ...list.filter(isUpcoming), ...list.filter(isOver)].slice(0, 24);
  if (!ordered.length) {
    track.innerHTML = '';
    track.parentElement.hidden = true;
    return;
  }
  track.parentElement.hidden = false;
  const item = (m) => `<a class="tk ${isLive(m) ? 'tk-live' : ''}" href="${matchHref(m)}">
      ${isLive(m) ? '<i class="dot"></i>' : ''}<span>${esc(m.home.short)}</span>
      <b>${isUpcoming(m) ? formatTime(m.kickoff) : `${esc(m.home.score ?? '-')}:${esc(m.away.score ?? '-')}`}</b>
      <span>${esc(m.away.short)}</span>${isLive(m) && m.status.clock ? `<em>${esc(m.status.clock)}</em>` : ''}</a>`;
  const html = ordered.map(item).join('');
  track.innerHTML = `<div class="tk-run">${html}</div><div class="tk-run" aria-hidden="true">${html}</div>`;
  track.style.setProperty('--dur', `${Math.max(30, ordered.length * 5)}s`);
}

/* ---------- Home ---------- */

function featured() {
  const now = Date.now();
  const pool = [...dayMatches(0), ...dayMatches(1)];
  const live = pool.filter(isLive).sort((a, b) => a.league.order - b.league.order);
  if (live.length) return live[0];
  const next = pool.filter((m) => isUpcoming(m) && m.kickoff > now).sort((a, b) => (a.kickoff - b.kickoff) + (a.league.order - b.league.order) * 15 * 60_000);
  return next[0] || null;
}

function heroHtml() {
  return `<section class="hero">
    <canvas class="hero-pitch" aria-hidden="true"></canvas>
    <div class="hero-fade"></div>
    <div class="wrap hero-inner">
      <div class="hero-copy">
        <p class="kicker"><i class="dot"></i><span data-i18n="hero.kicker">${t('hero.kicker')}</span></p>
        <h1 data-i18n="hero.title">${t('hero.title')}</h1>
        <p class="hero-sub" data-i18n="hero.sub">${t('hero.sub')}</p>
        <div class="hero-cta">
          <a class="btn btn-primary" href="#/today">${icon('ball')}<span data-i18n="hero.cta">${t('hero.cta')}</span></a>
          <a class="btn btn-ghost" href="#/highlights">${icon('play')}<span data-i18n="nav.highlights">${t('nav.highlights')}</span></a>
        </div>
        <dl class="hero-stats"></dl>
      </div>
      <div class="hero-feature"></div>
    </div>
  </section>`;
}

function renderHeroDynamic() {
  if (!hero) return;
  const live = dayMatches(0).filter(isLive).length;
  hero.root.querySelector('.hero-stats').innerHTML = [
    [live, t('hero.stat.live'), live ? 'live' : ''],
    [dayMatches(0).length, t('hero.stat.today'), ''],
    [dayMatches(1).length, t('hero.stat.tomorrow'), ''],
  ].map(([n, label, cls]) => `<div class="hs ${cls}"><dt>${label}</dt><dd>${String(n).padStart(2, '0')}</dd></div>`).join('');

  const m = featured();
  const box = hero.root.querySelector('.hero-feature');
  if (!m) {
    box.innerHTML = `<div class="feat feat-empty"><p>${t('hero.noMatch')}</p></div>`;
    return;
  }
  const p = predict(m);
  box.innerHTML = `<a class="feat ${isLive(m) ? 'feat-live' : ''}" href="${matchHref(m)}">
    <div class="feat-top"><span class="feat-tag">${isLive(m) ? `<i class="dot"></i>${t('hero.liveNow')}` : t('hero.next')}</span><span class="feat-league">${lname(m.league)}</span></div>
    <div class="feat-teams">
      <div class="ft-team">${crest(m.home, 'lg')}<span>${esc(m.home.short)}</span></div>
      <div class="ft-mid">${isLive(m) ? `<div class="sc sc-live sc-xl"><b>${esc(m.home.score ?? 0)}</b><i>:</i><b>${esc(m.away.score ?? 0)}</b></div>${statusLabel(m)}` : `<div class="countdown" data-at="${m.kickoff.getTime()}"></div><span class="st">${formatDay(m.kickoff)} · ${formatTime(m.kickoff)}</span>`}</div>
      <div class="ft-team">${crest(m.away, 'lg')}<span>${esc(m.away.short)}</span></div>
    </div>
    ${predBar(p)}
    <div class="feat-foot"><span>${t('pred.score')} ${scorePair(p.score[0], p.score[1])}</span><span class="btn btn-sm ${isLive(m) ? 'btn-live' : 'btn-ghost'}">${isLive(m) ? icon('play') + t('watch.live') : t('watch.details')}</span></div>
  </a>`;
  tickCountdown();
}

function tickCountdown() {
  document.querySelectorAll('.countdown').forEach((el) => {
    let s = Math.max(0, Math.floor((Number(el.dataset.at) - Date.now()) / 1000));
    const d = Math.floor(s / 86400);
    s -= d * 86400;
    const parts = [[d, 'cd.d'], [Math.floor(s / 3600), 'cd.h'], [Math.floor((s % 3600) / 60), 'cd.m'], [s % 60, 'cd.s']].filter(([v], i) => i > 0 || v > 0);
    el.innerHTML = parts.map(([v, k]) => `<span><b>${String(v).padStart(2, '0')}</b><small>${t(k)}</small></span>`).join('');
  });
}

function mountHero() {
  const root = app.querySelector('.hero');
  const canvas = root.querySelector('.hero-pitch');
  const sim = new MatchSim({ possession: 0.55, formations: ['4-3-3', '4-2-3-1'], goalChance: 0.22, tempo: 0.9 });
  const view = new PitchView(canvas, sim, { mode: 'persp', colors: ['#f4b740', '#eef3ef'] });
  view.start();
  hero = { root, view };
}

function unmountHero() {
  hero?.view.destroy();
  hero = null;
}

function filteredMatches(offset) {
  const q = state.query.trim().toLowerCase();
  return dayMatches(offset).filter((m) => {
    if (state.filter === 'live' && !isLive(m)) return false;
    if (state.filter === 'upcoming' && !isUpcoming(m)) return false;
    if (state.filter === 'finished' && !isOver(m)) return false;
    if (state.league !== 'all' && m.league.slug !== state.league) return false;
    if (q) {
      const hay = `${m.home.name} ${m.away.name} ${m.league.name?.[getLang()] || ''} ${m.league.name?.en || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function matchRow(m, i) {
  const p = predict(m);
  let side;
  if (isLive(m)) side = `<span class="btn btn-sm btn-live">${icon('play')}${t('watch.live')}</span>`;
  else if (isOver(m)) {
    const g = grade(p, m.home.score, m.away.score);
    const hasVideo = !!highlightFor(m.id);
    side = `${g ? `<span class="grade grade-${g}" title="${t(g === 'miss' ? 'pred.wrong' : g === 'exact' ? 'pred.exact' : 'pred.correct')}">${g === 'miss' ? '✕' : '✓'} ${scorePair(p.score[0], p.score[1])}</span>` : ''}${hasVideo ? `<span class="btn btn-sm btn-primary">${icon('play')}${t('hl.watch')}</span>` : `<span class="btn btn-sm btn-ghost">${t('watch.summary')}</span>`}`;
  } else side = `${predBar(p, true)}<span class="btn btn-sm btn-ghost">${t('watch.details')}</span>`;
  const flash = state.flash.has(m.id) ? 'flash' : '';
  return `<a class="mrow ${isLive(m) ? 'is-live' : ''} ${flash}" href="${matchHref(m)}" style="--i:${Math.min(i, 12)}">
    <div class="mt mt-home"><span class="tn">${esc(m.home.short)}</span>${crest(m.home)}</div>
    <div class="mc">${centerBox(m)}</div>
    <div class="mt mt-away">${crest(m.away)}<span class="tn">${esc(m.away.short)}</span></div>
    <div class="ms">${side}</div>
  </a>`;
}

function listHtml(offset) {
  const all = dayMatches(offset);
  if (!state.days[offset] || state.days[offset].source === 'pending') return `<div class="empty"><span class="spin"></span>${t('empty.loading')}</div>`;
  const list = filteredMatches(offset);
  if (!all.length) return `<div class="empty">${t('empty.none')}</div>`;
  if (!list.length) return `<div class="empty">${t('empty.filtered')}</div>`;
  const groups = new Map();
  list.forEach((m) => {
    if (!groups.has(m.league.slug)) groups.set(m.league.slug, { league: m.league, items: [] });
    groups.get(m.league.slug).items.push(m);
  });
  let i = 0;
  return [...groups.values()].map(({ league, items }) => `<section class="lg">
      <header class="lg-head">${league.logo ? `<img src="${safeUrl(league.logo)}" alt="" loading="lazy" onerror="this.remove()">` : `<span class="lg-mark"></span>`}<h3>${lname(league)}</h3><span class="lg-count">${items.length}</span></header>
      <div class="lg-rows">${items.map((m) => matchRow(m, i++)).join('')}</div>
    </section>`).join('');
}

function dayTabsHtml(offset) {
  return [-1, 0, 1].map((o) => {
    const key = o === -1 ? 'yesterday' : o === 0 ? 'today' : 'tomorrow';
    const n = state.days[o] ? dayMatches(o).length : '·';
    return `<a class="dtab" href="#/${key}" ${o === offset ? 'aria-current="page"' : ''}><b>${t(`day.${key}`)}</b><small>${formatShortDay(addDays(new Date(), o))}</small><span class="dcount">${n}</span></a>`;
  }).join('');
}

function filterChipsHtml(offset) {
  const all = dayMatches(offset);
  const count = (f) => all.filter(f).length;
  return [
    ['all', t('filter.all'), all.length],
    ['live', t('filter.live'), count(isLive)],
    ['upcoming', t('filter.upcoming'), count(isUpcoming)],
    ['finished', t('filter.finished'), count(isOver)],
  ].map(([k, label, n]) => `<button type="button" class="chip ${k === 'live' ? 'chip-live' : ''}" data-filter="${k}" aria-pressed="${state.filter === k}">${label}<span>${n}</span></button>`).join('');
}

function leagueChipsHtml(offset) {
  const leagues = new Map();
  dayMatches(offset).forEach((m) => leagues.set(m.league.slug, m.league));
  if (leagues.size < 2) return '';
  return [`<button type="button" class="lchip" data-league="all" aria-pressed="${state.league === 'all'}">${t('filter.all')}</button>`]
    .concat([...leagues.values()].sort((a, b) => a.order - b.order).map((l) => `<button type="button" class="lchip" data-league="${esc(l.slug)}" aria-pressed="${state.league === l.slug}">${lname(l)}</button>`))
    .join('');
}

function sourceNoteHtml() {
  const src = dataSource();
  if (src === 'pending') {
    return `<div class="srcnote warn"><span class="spin"></span><span>${t('source.pending')}</span><button type="button" class="btn btn-sm btn-ghost" data-retry>${icon('retry')}${t('source.retry')}</button></div>`;
  }
  return `<div class="srcnote"><span>${t('source.espn')}${state.updatedAt ? ` · ${t('source.updated', { t: formatTime(state.updatedAt) })}` : ''} · ${t('time.local')}</span></div>`;
}

function renderHome({ soft } = {}) {
  const offset = state.route.day;
  if (!soft || !hero) {
    teardownMatch();
    unmountHero();
    app.innerHTML = `${heroHtml()}<div class="wrap home-body" id="matches">
      <nav class="daybar"></nav>
      <div class="toolbar"><div class="chips" role="group"></div>
        <label class="search">${icon('search')}<input id="search" type="search" autocomplete="off"></label></div>
      <div class="lchips"></div>
      <div class="srcbox"></div>
      <div class="list"></div>
      <section class="hl-strip-wrap"></section>
    </div>`;
    mountHero();
    bindHome();
    lastListKey = '';
  }
  const q = (sel) => app.querySelector(sel);
  q('.daybar').innerHTML = dayTabsHtml(offset);
  q('.toolbar .chips').innerHTML = filterChipsHtml(offset);
  const search = q('#search');
  search.placeholder = t('search.placeholder');
  if (document.activeElement !== search) search.value = state.query;
  const lc = leagueChipsHtml(offset);
  q('.lchips').innerHTML = lc;
  q('.lchips').hidden = !lc;
  q('.srcbox').innerHTML = sourceNoteHtml();
  // Rows animate in only when the selection changes, not on background refreshes
  const listKey = `${offset}|${state.filter}|${state.league}|${state.days[offset] ? 1 : 0}`;
  q('.list').classList.toggle('anim', listKey !== lastListKey);
  lastListKey = listKey;
  q('.list').innerHTML = listHtml(offset);
  q('.hl-strip-wrap').innerHTML = highlightStripHtml();
  renderHeroDynamic();
  state.flash.clear();
}

function bindHome() {
  const body = app.querySelector('.home-body');
  body.addEventListener('click', (e) => {
    const f = e.target.closest('[data-filter]');
    if (f) {
      state.filter = f.dataset.filter;
      return renderHome({ soft: true });
    }
    const l = e.target.closest('[data-league]');
    if (l) {
      state.league = l.dataset.league;
      return renderHome({ soft: true });
    }
    if (e.target.closest('[data-retry]')) {
      state.days = {};
      initialLoad();
    }
  });
  body.addEventListener('input', (e) => {
    if (e.target.id !== 'search') return;
    state.query = e.target.value;
    app.querySelector('.list').innerHTML = listHtml(state.route.day);
  });
}

/* ---------- Match page ---------- */

const STAT_KEYS = ['possessionPct', 'totalShots', 'shotsOnTarget', 'wonCorners', 'foulsCommitted', 'offsides', 'yellowCards', 'redCards', 'saves', 'accuratePasses', 'totalPasses'];

function boardHtml(m) {
  const when = `${formatDay(m.kickoff)} · ${formatTime(m.kickoff)}`;
  return `<div class="board ${isLive(m) ? 'is-live' : ''}" style="--hc:${hex(m.home.color)};--ac:${hex(m.away.color)}">
    <div class="board-league">${m.league.logo ? `<img src="${safeUrl(m.league.logo)}" alt="" onerror="this.remove()">` : ''}<span>${lname(m.league)}</span>${m.demo ? '<span class="tag-demo">DEMO</span>' : ''}</div>
    <div class="board-main">
      <div class="bt">${crest(m.home, 'xl')}<h2>${esc(m.home.name)}</h2>${formHtml(m.home.form)}</div>
      <div class="bc">${centerBox(m)}</div>
      <div class="bt">${crest(m.away, 'xl')}<h2>${esc(m.away.name)}</h2>${formHtml(m.away.form)}</div>
    </div>
    <div class="board-meta"><span>${t('match.kickoff')}: ${when}</span>${m.venue ? `<span>${t('match.venue')}: ${esc(m.venue)}${m.city ? `, ${esc(m.city)}` : ''}</span>` : ''}</div>
  </div>`;
}

function formHtml(form) {
  const f = (form || '').toUpperCase().replace(/[^WDL]/g, '').slice(-5);
  if (!f) return '';
  return `<div class="form">${[...f].map((c) => `<i class="f-${c}">${c}</i>`).join('')}</div>`;
}

function eventsHtml(list) {
  const items = (list || []).filter((e) => ['goal', 'own', 'red', 'yellow', 'sub'].includes(e.kind));
  if (!items.length) return `<p class="muted">${t('match.noEvents')}</p>`;
  const ico = { goal: icon('ball'), own: icon('ball', 'own'), red: icon('card', 'red'), yellow: icon('card', 'yellow'), sub: icon('swap') };
  return `<ol class="tl">${items.map((e) => `<li class="tl-${e.side || 'mid'} tl-k-${e.kind}"><span class="tl-min">${esc(e.minute)}</span><span class="tl-ico">${ico[e.kind]}</span><span class="tl-txt"><b>${esc(e.player || e.text || '')}</b>${e.kind === 'sub' && e.other ? `<small>↔ ${esc(e.other)}</small>` : ''}${e.penalty && e.kind === 'goal' ? '<small>(P)</small>' : ''}${e.kind === 'own' ? '<small>(OG)</small>' : ''}</span></li>`).join('')}</ol>`;
}

function statsHtml(stats, m) {
  if (!stats?.length) return `<p class="muted">${t('match.noStats')}</p>`;
  return `<div class="stats">${STAT_KEYS.map((k) => stats.find((s) => s.name === k)).filter(Boolean).map((s) => {
    const total = s.home + s.away || 1;
    const hp = (s.home / total) * 100;
    const fmt = (v) => (s.name === 'possessionPct' ? `${Math.round(v)}%` : Math.round(v));
    return `<div class="stat"><div class="stat-top"><b>${fmt(s.home)}</b><span>${t(`stat.${s.name}`)}</span><b>${fmt(s.away)}</b></div>
      <div class="stat-bar"><span class="sb-h ${s.home >= s.away ? 'lead' : ''}" style="width:${hp}%"></span><span class="sb-a ${s.away >= s.home ? 'lead' : ''}" style="width:${100 - hp}%"></span></div></div>`;
  }).join('')}</div>`;
}

function lineupsHtml(rosters, m) {
  if (!rosters) return `<p class="muted">${t('match.noLineups')}</p>`;
  const col = (r, team) => {
    if (!r) return '<div></div>';
    const starters = r.players.filter((p) => p.starter);
    const subs = r.players.filter((p) => !p.starter);
    const li = (p) => `<li><span class="num">${esc(p.number)}</span><span>${esc(p.name)}</span><small>${esc(p.pos)}</small></li>`;
    return `<div class="lu"><h4>${crest(team, 'sm')}${esc(team.short)}${r.formation ? `<span class="lu-f">${esc(r.formation)}</span>` : ''}</h4>
      <p class="lu-h">${t('match.starters')}</p><ol>${starters.map(li).join('')}</ol>
      ${subs.length ? `<p class="lu-h">${t('match.subs')}</p><ol class="subs">${subs.map(li).join('')}</ol>` : ''}</div>`;
  };
  return `<div class="lineups">${col(rosters.home, m.home)}${col(rosters.away, m.away)}</div>`;
}

function picks() {
  return store.get('picks', {});
}

function predictionHtml(m) {
  const p = predict(m);
  const pick = picks()[m.id];
  const locked = !isUpcoming(m);
  const g = isOver(m) ? grade(p, m.home.score, m.away.score) : null;
  const myG = isOver(m) && pick ? grade({ score: pick, outcome: pick[0] > pick[1] ? 'home' : pick[0] < pick[1] ? 'away' : 'draw' }, m.home.score, m.away.score) : null;
  const pts = myG === 'exact' ? 3 : myG === 'outcome' ? 1 : 0;
  return `<div class="pred">
    <div class="pred-labels"><span>${esc(t('pred.home', { t: m.home.short }))}</span><span>${t('pred.draw')}</span><span>${esc(t('pred.home', { t: m.away.short }))}</span></div>
    ${predBar(p)}
    <div class="pred-grid">
      <div><small>${t('pred.score')}</small><b class="big">${scorePair(p.score[0], p.score[1])}</b></div>
      <div><small>${t('pred.over25')}</small><b>${pct(p.over25)}</b></div>
      <div><small>${t('pred.btts')}</small><b>${pct(p.btts)}</b></div>
      <div><small>${t('pred.conf')}</small><b class="conf conf-${p.confidence}">${t(`pred.conf.${p.confidence}`)}</b></div>
    </div>
    <p class="muted small">xG ${p.xg[0].toFixed(2)} – ${p.xg[1].toFixed(2)} · ${t(`pred.basis.${p.basis}`)}</p>
    ${g ? `<p class="grade-line grade-${g}">${g === 'miss' ? '✕' : '✓'} ${t(g === 'miss' ? 'pred.wrong' : g === 'exact' ? 'pred.exact' : 'pred.correct')}</p>` : ''}
    <form class="pick" data-id="${esc(m.id)}">
      <span>${t('pred.yours')}</span>
      <input id="pick-h-${esc(m.id)}" type="number" min="0" max="20" inputmode="numeric" value="${pick ? pick[0] : ''}" ${locked ? 'disabled' : ''} aria-label="${esc(m.home.short)}">
      <i>-</i>
      <input id="pick-a-${esc(m.id)}" type="number" min="0" max="20" inputmode="numeric" value="${pick ? pick[1] : ''}" ${locked ? 'disabled' : ''} aria-label="${esc(m.away.short)}">
      ${locked ? `<small>${myG ? t('pred.points', { n: pts }) : t('pred.locked')}</small>` : `<button class="btn btn-sm btn-primary" type="submit">${t('pred.save')}</button>`}
    </form>
  </div>`;
}

/* ---------- Channels ---------- */

function currentRegion() {
  const saved = store.get('region');
  return REGIONS.some((r) => r.id === saved) ? saved : DEFAULT_REGION[getLang()] || 'mena';
}

const regionName = (id) => REGIONS.find((r) => r.id === id)?.name[getLang()] || id;
const leagueNameBySlug = (slug) => {
  const l = LEAGUES.find((x) => x.slug === slug);
  return l ? l.name[getLang()] || l.name.en : slug;
};
const listSep = () => (getLang() === 'ar' ? '، ' : ', ');

function chanBadge(id, big = false) {
  const c = CHANNELS[id];
  return `<span class="chan${big ? ' chan-lg' : ''}" style="--cc:${hex(c.color, '#333333')}">${icon('tv')}<b dir="ltr">${esc(c.name)}</b></span>`;
}

function officialLinks(id) {
  return `<div class="chan-links">${CHANNELS[id].links
    .map(([label, url]) => `<a class="btn btn-sm btn-ghost" href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer"><bdi dir="ltr">${esc(label)}</bdi>${icon('ext', 'ext')}</a>`)
    .join('')}</div>`;
}

function regionPicker(region) {
  return `<div class="rchips" role="group" aria-label="${t('ch.region')}">${REGIONS.map(
    (r) => `<button type="button" class="chip" data-region="${r.id}" aria-pressed="${r.id === region}">${esc(r.name[getLang()])}</button>`,
  ).join('')}</div>`;
}

function broadcastersHtml(m) {
  const region = currentRegion();
  const ids = channelsFor(m.league.slug, region);
  const official = ids.length
    ? `<div class="chrows">${ids.map((id) => `<div class="chrow">${chanBadge(id)}${CHANNELS[id].free ? `<span class="tag-free">${t('ch.free')}</span>` : ''}${officialLinks(id)}</div>`).join('')}</div>`
    : `<p class="muted">${t('ch.noneMatch')}</p>`;
  const espn = m.broadcasts?.length
    ? `<h4 class="sub-h">${t('ch.espn')}</h4><ul class="bcast">${m.broadcasts.map((b) => `<li>${icon('tv')}<span>${esc(b)}</span></li>`).join('')}</ul>`
    : '';
  return `<div class="bc-wrap">${regionPicker(region)}${official}${espn}<a class="link-more" href="#/channels">${t('ch.more')}</a></div>`;
}

function renderChannels() {
  teardownMatch();
  unmountHero();
  const region = currentRegion();
  const today = dayKey(new Date());
  const upcoming = [...dayMatches(0), ...dayMatches(1)].filter((m) => isLive(m) || isUpcoming(m));
  const byChannel = new Map();
  upcoming.forEach((m) =>
    channelsFor(m.league.slug, region).forEach((id) => {
      if (!byChannel.has(id)) byChannel.set(id, []);
      byChannel.get(id).push(m);
    }),
  );

  const onAir = [...byChannel.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([id, list]) => `<article class="card onair">
      <header>${chanBadge(id)}<span class="onair-n">${list.length}</span></header>
      <ol class="onair-list">${list.slice(0, 8).map((m) => `<li><a href="${matchHref(m)}">
        <span class="oa-time">${isLive(m) ? `<em class="st-live">${esc(m.status.clock || t('status.live'))}</em>` : formatTime(m.kickoff)}<small>${m.day === today ? t('day.today') : t('day.tomorrow')}</small></span>
        <span class="oa-teams"><b>${esc(m.home.short)}</b><i>–</i><b>${esc(m.away.short)}</b></span>
        <small class="oa-lg">${lname(m.league)}</small></a></li>`).join('')}</ol>
      ${officialLinks(id)}
    </article>`)
    .join('');

  const cards = Object.keys(CHANNELS).map((id) => {
    const c = CHANNELS[id];
    const cov = coverage(id);
    const regions = c.global ? t('ch.global') : cov.regions.map(regionName).join(listSep());
    const covers = c.global ? t('ch.fifaplusCovers') : cov.leagues.map(leagueNameBySlug).join(' · ');
    return `<article class="card chan-card">
      <div class="chan-top">${chanBadge(id, true)}${c.free ? `<span class="tag-free">${t('ch.free')}</span>` : ''}</div>
      <dl><div><dt>${t('ch.regions')}</dt><dd>${esc(regions)}</dd></div><div><dt>${t('ch.covers')}</dt><dd>${esc(covers)}</dd></div></dl>
      ${officialLinks(id)}
    </article>`;
  }).join('');

  app.innerHTML = `<div class="wrap chans">
    <header class="chans-head"><h1>${t('ch.title')}</h1><p class="muted">${t('ch.sub')}</p></header>
    ${regionPicker(region)}
    <section><h2 class="sec-h">${t('ch.onAir')} · ${esc(regionName(region))}</h2>
      ${onAir ? `<div class="onair-grid">${onAir}</div>` : `<div class="empty">${state.days[0] ? t('ch.none') : `<span class="spin"></span>${t('empty.loading')}`}</div>`}
    </section>
    <section><h2 class="sec-h">${t('ch.all')}</h2><div class="chan-grid">${cards}</div></section>
    <p class="notice">${icon('info')}<span>${t('ch.note')}</span></p>
  </div>`;
}

function bindPickForms(root) {
  root.addEventListener('submit', (e) => {
    const form = e.target.closest('form.pick');
    if (!form) return;
    e.preventDefault();
    const [h, a] = [...form.querySelectorAll('input')].map((i) => parseInt(i.value, 10));
    if (Number.isNaN(h) || Number.isNaN(a)) return;
    const all = picks();
    all[form.dataset.id] = [h, a];
    store.set('picks', all);
    toast(t('pred.saved'));
  });
}

function teardownMatch() {
  if (!matchPage) return;
  clearInterval(matchPage.poll);
  matchPage.player?.destroy();
  matchPage.pitch?.destroy();
  matchPage = null;
}

async function renderMatch(slug, id) {
  unmountHero();
  if (matchPage && matchPage.id === id) {
    matchPage.refresh?.();
    return;
  }
  teardownMatch();
  const page = { id, slug, match: state.byId.get(id) || null, summary: null, tab: 'stats', theater: false };
  matchPage = page;
  app.innerHTML = `<div class="wrap mp"><a class="back" href="#/today">${icon('back')}<span>${t('match.back')}</span></a><div class="mp-board"><div class="empty"><span class="spin"></span>${t('empty.loading')}</div></div><div class="mp-body" hidden></div></div>`;
  if (page.match) buildMatchBody(page);
  if (page.match && (page.match.demo || page.match.source !== 'espn')) return;
  // Details are published for live and finished matches, and from shortly
  // before kick-off; don't ask for files that can't exist yet
  const hasDetails = (m) => isLive(m) || isOver(m) || (isUpcoming(m) && minutesUntil(m) <= 90);
  if (page.match && !hasDetails(page.match)) return;

  try {
    const summary = await loadSummary(slug, id);
    if (matchPage !== page) return;
    page.summary = summary;
    if (summary.match) {
      const prev = page.match;
      const merged = { ...summary.match, broadcasts: summary.match.broadcasts.length ? summary.match.broadcasts : prev?.broadcasts || [] };
      index([merged]);
      page.match = merged;
    }
  } catch {
    /* the summary only enriches the page */
  }
  if (matchPage !== page) return;
  if (!page.match) {
    // Opened from a link before the match list loaded: wait for it once
    await state.ready;
    if (matchPage !== page) return;
    page.match = state.byId.get(id) || null;
  }
  if (!page.match) {
    app.querySelector('.mp-board').innerHTML = `<div class="empty">${t('match.notFound')}</div>`;
    return;
  }
  if (!page.player) buildMatchBody(page);
  else applySummary(page);
}

function applySummary(page) {
  const s = page.summary;
  if (!s) return;
  const poss = s.stats.find((x) => x.name === 'possessionPct');
  if (poss) page.sim.possession = poss.home / (poss.home + poss.away || 1);
  if (s.rosters && !page.formationsSet) {
    page.formationsSet = true;
    page.sim.setFormations(s.rosters.home?.formation, s.rosters.away?.formation);
    page.sim.kickoff(page.sim.owner);
  }
  ensurePoll(page);
  refreshMatchView(page);
}

function ensurePoll(page) {
  const m = page.match;
  if (page.poll || !(isLive(m) || (isUpcoming(m) && minutesUntil(m) < 15))) return;
  page.poll = setInterval(() => pollMatch(page), REFRESH.matchLive);
}

function buildMatchBody(page) {
  const m = page.match;
  app.querySelector('.mp-board').innerHTML = boardHtml(m);
  const body = app.querySelector('.mp-body');
  body.hidden = false;
  body.innerHTML = `
    <div class="mp-grid">
      <div class="mp-main">
        <div class="mp-player"></div>
        <div class="mp-streams"></div>
      </div>
      <aside class="mp-side">
        <section class="card trk">
          <header class="card-h"><h3>${t('match.tracker')}</h3><span class="trk-phase"></span></header>
          <div class="trk-stage"><canvas class="trk-canvas" aria-label="${t('match.tracker')}"></canvas><div class="trk-goal" hidden></div></div>
          <div class="trk-poss"></div>
          <div class="trk-foot"><button type="button" class="btn btn-sm btn-ghost trk-replay" hidden>${icon('retry')}${t('tracker.replay')}</button><p class="muted small">${t('tracker.note')}</p></div>
        </section>
        <section class="card">
          <header class="card-h"><h3>${t('match.events')}</h3></header>
          <div class="mp-events"></div>
        </section>
      </aside>
    </div>
    <nav class="tabs" role="tablist">
      ${['stats', 'lineups', 'prediction', 'broadcasters'].map((k) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${page.tab === k}">${t(`match.${k}`)}</button>`).join('')}
    </nav>
    <div class="tabpanel card"></div>`;

  // Player
  const player = new StreamPlayer(body.querySelector('.mp-player'));
  page.player = player;
  player.on('theater', () => {
    page.theater = !page.theater;
    body.querySelector('.mp-grid').classList.toggle('theater', page.theater);
  });
  player.on('source', () => renderStreams(page));
  player.on('tracks', () => renderStreams(page));
  Promise.all([sourcesFor(m), loadHighlights()]).then(([list]) => {
    if (matchPage !== page) return;
    // A finished match opens on its official highlights when we have them
    // A finished match opens on its official highlights, Arabic first; if
    // one can't play here the player moves on to the next
    const hls = isOver(m) ? highlightsFor(m.id) : [];
    const hlSources = hls.map((h) => ({
      type: 'youtube', videoId: h.videoId, label: `${t('hl.label')}${h.lang === 'ar' ? ` · ${t('hl.arabic')}` : ''}`,
      lang: h.lang || 'multi', id: `hl#${h.videoId}`, highlight: true,
    }));
    page.sources = [...hlSources, ...list];
    player.load(page.sources, { lang: store.get('commentaryLang', null) || getLang(), start: hlSources.length ? 0 : undefined });
    renderStreams(page);
  });

  // Tracker
  const stats = page.summary?.stats || [];
  const poss = stats.find((s) => s.name === 'possessionPct');
  const possession = poss ? poss.home / (poss.home + poss.away || 1) : 0.5;
  const sim = new MatchSim({
    possession,
    formations: [page.summary?.rosters?.home?.formation, page.summary?.rosters?.away?.formation],
    goalChance: 0,
    tempo: isUpcoming(m) ? 0.6 : 1,
  });
  const colors = kitColors(m.home, m.away);
  const pitch = new PitchView(body.querySelector('.trk-canvas'), sim, { mode: 'top', mirror: document.documentElement.dir === 'rtl', colors });
  pitch.start();
  page.sim = sim;
  page.pitch = pitch;
  page.colors = colors;
  sim.on('goal', ({ team, label }) => showGoal(page, team, label));
  body.querySelector('.trk-replay').onclick = () => replayGoals(page);

  body.querySelector('.tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    page.tab = b.dataset.tab;
    renderTabs(page);
  });
  bindPickForms(body);
  bindStreams(page);

  page.refresh = () => refreshMatchView(page);
  page.onGoal = (fresh, side) => {
    if (fresh.id === page.id) sim.queueGoal(side === 'home' ? 0 : 1, `${fresh.status.clock || ''}`);
  };
  if (page.summary) applySummary(page);
  else refreshMatchView(page);
  ensurePoll(page);
}

async function pollMatch(page) {
  if (page.match.demo || page.match.source !== 'espn') return;
  try {
    const s = await loadSummary(page.slug, page.id);
    if (matchPage !== page || !s.match) return;
    const old = page.match;
    page.summary = s;
    const fresh = { ...s.match, broadcasts: s.match.broadcasts.length ? s.match.broadcasts : old.broadcasts };
    // index() fires goal toasts and queues the tracker goal through onGoal
    index([fresh]);
    page.match = fresh;
    page.sim.tempo = isUpcoming(fresh) ? 0.6 : 1;
    applySummary(page);
    if (isOver(fresh)) clearInterval(page.poll);
  } catch {
    /* keep the last good state */
  }
}

function refreshMatchView(page) {
  const m = state.byId.get(page.id) || page.match;
  page.match = m;
  const board = app.querySelector('.mp-board');
  if (!board) return;
  board.innerHTML = boardHtml(m);
  const events = page.summary?.keyEvents?.length ? page.summary.keyEvents : m.events;
  app.querySelector('.mp-events').innerHTML = eventsHtml(events);
  const phase = app.querySelector('.trk-phase');
  phase.innerHTML = isLive(m) ? `<span class="st st-live"><i></i>${esc(m.status.clock || t('status.live'))}</span>` : isOver(m) ? `<span class="st st-ft">${t('tracker.fulltime')}</span>` : `<span class="st">${t('tracker.warmup')}</span>`;
  const goals = (events || []).filter((e) => e.kind === 'goal' || e.kind === 'own');
  app.querySelector('.trk-replay').hidden = !goals.length;
  const poss = page.sim.possession;
  app.querySelector('.trk-poss').innerHTML = `<div class="poss" style="--hc:${hex(page.colors[0])};--ac:${hex(page.colors[1])}"><b>${Math.round(poss * 100)}%</b><div class="poss-bar"><span style="width:${poss * 100}%"></span></div><b>${Math.round((1 - poss) * 100)}%</b></div><small class="muted">${t('tracker.possession')}</small>`;
  renderTabs(page);
}

function renderTabs(page) {
  const m = page.match;
  app.querySelectorAll('.tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === page.tab)));
  const panel = app.querySelector('.tabpanel');
  if (!panel) return;
  const html = {
    stats: () => statsHtml(page.summary?.stats, m),
    lineups: () => lineupsHtml(page.summary?.rosters, m),
    prediction: () => predictionHtml(m),
    broadcasters: () => broadcastersHtml(m),
  }[page.tab];
  panel.innerHTML = html();
}

function showGoal(page, team, label) {
  const el = app.querySelector('.trk-goal');
  if (!el) return;
  const side = team === 0 ? page.match.home : page.match.away;
  el.innerHTML = `<b>${t('tracker.goal')}</b><span>${esc(side.short)}${label ? ` · ${esc(label)}` : ''}</span>`;
  el.hidden = false;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
  clearTimeout(page.goalTimer);
  page.goalTimer = setTimeout(() => (el.hidden = true), 2600);
}

function replayGoals(page) {
  const events = page.summary?.keyEvents?.length ? page.summary.keyEvents : page.match.events;
  (events || []).filter((e) => e.kind === 'goal' || e.kind === 'own').forEach((e) => {
    // An own goal counts for the other side
    const scorerSide = e.kind === 'own' ? (e.side === 'home' ? 1 : 0) : e.side === 'home' ? 0 : 1;
    page.sim.queueGoal(scorerSide, `${e.minute} ${e.player}`.trim());
  });
}

function streamLangs(page) {
  const langs = new Set((page.sources || []).map((s) => s.lang).filter((l) => l && l !== 'multi'));
  page.player?.audioOptions().forEach((a) => a.lang && langs.add(a.lang.slice(0, 2)));
  return [...langs];
}

function renderStreams(page) {
  const box = app.querySelector('.mp-streams');
  if (!box || !page.player) return;
  const p = page.player;
  const sources = page.sources || [];
  const cur = sources[p.index];
  const audio = p.audioOptions();
  const activeAudio = audio.find((a) => a.active)?.lang?.slice(0, 2);
  const activeLang = cur && cur.lang !== 'multi' ? cur.lang : activeAudio;
  const langs = streamLangs(page);
  const langChips = langs.map((l) => `<button type="button" class="chip" data-lang="${esc(l)}" aria-pressed="${l === activeLang}">${esc(languageName(l))}</button>`).join('');
  const pills = sources.map((s, i) => `<button type="button" class="srv ${i === p.index ? 'on' : ''} ${p.failed.has(i) ? 'bad' : ''}" data-src="${i}">
      <i class="srv-dot"></i><span>${esc(s.label)}</span><small>${esc(s.mine ? t('player.myLink') : languageName(s.lang))}</small></button>`).join('');
  const demo = cur?.demo;
  box.innerHTML = `
    ${langs.length ? `<div class="srow"><span class="slabel">${icon('globe')}${t('player.audio')}</span><div class="chips">${langChips}</div></div>` : ''}
    <div class="srow"><span class="slabel">${icon('tv')}${t('player.servers')}</span><div class="srvs">${pills}</div></div>
    ${audio.length > 1 ? `<p class="muted small">${t('player.tracks', { n: new Set(audio.map((a) => a.lang)).size })}</p>` : ''}
    ${demo ? `<p class="notice">${icon('info')}<span>${t('player.demoNotice')}</span></p>` : ''}
    ${isOver(page.match) && !highlightFor(page.id) ? `<p class="muted small">${icon('play')} ${t('hl.soon')}</p>` : ''}
    <details class="addlink">
      <summary>${icon('link')}${t('player.addLink')}</summary>
      <form class="addlink-form">
        <input id="addlink-url" type="url" required placeholder="https://…/index.m3u8" aria-label="URL">
        <select id="addlink-lang" aria-label="${t('player.addLinkLang')}">${COMMENTARY_LANGS.map((l) => `<option value="${l}" ${l === getLang() ? 'selected' : ''}>${esc(languageName(l))}</option>`).join('')}</select>
        <button class="btn btn-sm btn-primary" type="submit">${t('player.addLinkSave')}</button>
        <small class="muted">${t('player.addLinkHint')}</small>
      </form>
    </details>`;
}

function bindStreams(page) {
  const box = app.querySelector('.mp-streams');
  box.addEventListener('click', (e) => {
    const s = e.target.closest('[data-src]');
    if (s) {
      const i = Number(s.dataset.src);
      page.player.failed.delete(i);
      page.player.select(i);
      return;
    }
    const l = e.target.closest('[data-lang]');
    if (l) {
      const lang = l.dataset.lang;
      store.set('commentaryLang', lang);
      page.player.prefLang = lang;
      const sources = page.sources || [];
      const cur = sources[page.player.index];
      const audioIdx = page.player.audioOptions().findIndex((a) => a.lang?.slice(0, 2) === lang);
      const srcIdx = sources.findIndex((x) => x.lang === lang);
      if (cur?.lang === 'multi' && audioIdx >= 0) page.player.setAudio(audioIdx);
      else if (srcIdx >= 0) page.player.select(srcIdx);
      else if (audioIdx >= 0) page.player.setAudio(audioIdx);
      renderStreams(page);
    }
  });
  box.addEventListener('submit', async (e) => {
    if (!e.target.matches('.addlink-form')) return;
    e.preventDefault();
    const url = box.querySelector('#addlink-url').value.trim();
    const lang = box.querySelector('#addlink-lang').value;
    if (!/^https:\/\//i.test(url)) {
      toast(t('player.addLinkBad'), 'warn');
      return;
    }
    addUserLink(page.match, { url, lang, label: `${t('player.myLink')} · ${languageName(lang)}` });
    page.sources = await sourcesFor(page.match);
    page.player.sources = page.sources;
    page.player.failed.clear();
    page.player.select(0);
  });
}

/* ---------- Predictions page ---------- */

function renderPredictions() {
  teardownMatch();
  unmountHero();
  const upcoming = [...dayMatches(0), ...dayMatches(1)].filter((m) => isUpcoming(m) || isLive(m));
  const finished = [...dayMatches(-1), ...dayMatches(0)].filter(isOver);
  const graded = finished.map((m) => grade(predict(m), m.home.score, m.away.score)).filter(Boolean);
  const hits = graded.filter((g) => g !== 'miss').length;
  const myPicks = picks();
  let myPts = 0;
  finished.forEach((m) => {
    const p = myPicks[m.id];
    if (!p) return;
    const g = grade({ score: p, outcome: p[0] > p[1] ? 'home' : p[0] < p[1] ? 'away' : 'draw' }, m.home.score, m.away.score);
    myPts += g === 'exact' ? 3 : g === 'outcome' ? 1 : 0;
  });

  const card = (m) => `<article class="pcard card">
      <a class="pc-head" href="${matchHref(m)}"><span>${lname(m.league)}</span>${statusLabel(m)}</a>
      <a class="pc-teams" href="${matchHref(m)}">
        <span class="pc-t">${crest(m.home)}<b>${esc(m.home.short)}</b></span>
        <span class="pc-mid">${isLive(m) ? `<span class="sc sc-live"><b>${esc(m.home.score ?? 0)}</b><i>:</i><b>${esc(m.away.score ?? 0)}</b></span>` : `<span class="sc sc-time"><b>${formatTime(m.kickoff)}</b></span>`}</span>
        <span class="pc-t">${crest(m.away)}<b>${esc(m.away.short)}</b></span>
      </a>
      ${predictionHtml(m)}
    </article>`;

  app.innerHTML = `<div class="wrap preds">
    <header class="preds-head">
      <div><h1>${t('pred.title')}</h1><p class="muted">${t('pred.sub')}</p></div>
      <dl class="preds-score">
        <div><dt>${t('pred.myPoints')}</dt><dd>${myPts}</dd></div>
        <div><dt>${t('pred.accuracy')}</dt><dd>${graded.length ? `${Math.round((hits / graded.length) * 100)}%` : '—'}</dd><small>${hits}/${graded.length}</small></div>
      </dl>
    </header>
    <p class="muted small">${t('pred.rules')}</p>
    ${state.days[0] ? (upcoming.length ? `<div class="pgrid">${upcoming.map(card).join('')}</div>` : `<div class="empty">${t('empty.none')}</div>`) : `<div class="empty"><span class="spin"></span>${t('empty.loading')}</div>`}
  </div>`;
  bindPickForms(app.querySelector('.preds'));
}

/* ---------- Highlights ---------- */

function timeAgo(iso) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  const rtf = new Intl.RelativeTimeFormat(getLang() === 'ar' ? 'ar' : getLang(), { numeric: 'auto' });
  if (mins < 60) return rtf.format(-Math.max(1, mins), 'minute');
  if (mins < 48 * 60) return rtf.format(-Math.round(mins / 60), 'hour');
  return rtf.format(-Math.round(mins / 1440), 'day');
}

function highlightCard(v) {
  const m = v.matchId ? state.byId.get(v.matchId) : null;
  return `<article class="hcard">
    <button type="button" class="hthumb" data-video="${esc(v.videoId)}" data-title="${esc(v.title)}" aria-label="${esc(v.title)}">
      <img src="${thumbUrl(v.videoId)}" alt="" loading="lazy" decoding="async" onerror="this.style.visibility='hidden'">
      <span class="hplay">${icon('play')}</span>
      ${v.league ? `<span class="hleague">${esc(leagueNameBySlug(v.league))}</span>` : ''}
      ${v.lang === 'ar' ? `<span class="hlang">${t('hl.arabic')}</span>` : ''}
    </button>
    <div class="hmeta">
      <h3 dir="auto">${esc(v.title)}</h3>
      <p><span>${esc(v.channel)}</span><span>${esc(timeAgo(v.published))}</span></p>
      ${m ? `<a class="link-more" href="${matchHref(m)}">${t('hl.matchPage')}</a>` : ''}
    </div>
  </article>`;
}

function highlightStripHtml() {
  const list = latestHighlights().slice(0, 12);
  if (!list.length) return '';
  return `<header class="hl-strip-head"><h2 class="sec-h">${t('hl.latest')}</h2><a class="link-more" href="#/highlights">${t('hl.all')}</a></header>
    <div class="hl-strip">${list.map(highlightCard).join('')}</div>`;
}

function renderHighlights() {
  teardownMatch();
  unmountHero();
  const everything = latestHighlights();
  const arabicCount = everything.filter((v) => v.lang === 'ar').length;
  // Arabic first: show only Arabic videos unless the viewer picks all languages
  if (!state.hlLang && everything.length) state.hlLang = arabicCount >= 6 ? 'ar' : 'all';
  const all = state.hlLang === 'ar' ? everything.filter((v) => v.lang === 'ar') : everything;
  const leagues = [...new Set(all.map((v) => v.league).filter(Boolean))];
  const pick = state.hlLeague && leagues.includes(state.hlLeague) ? state.hlLeague : 'all';
  const list = pick === 'all' ? all : all.filter((v) => v.league === pick);
  const chips = leagues.length > 1
    ? `<div class="lchips">${[`<button type="button" class="lchip" data-hl-league="all" aria-pressed="${pick === 'all'}">${t('filter.all')}</button>`]
      .concat(leagues.map((l) => `<button type="button" class="lchip" data-hl-league="${esc(l)}" aria-pressed="${pick === l}">${esc(leagueNameBySlug(l))}</button>`))
      .join('')}</div>`
    : '';
  const langChips = arabicCount
    ? `<div class="chips" role="group">
        <button type="button" class="chip" data-hl-lang="ar" aria-pressed="${state.hlLang === 'ar'}">${t('hl.arabic')}<span>${arabicCount}</span></button>
        <button type="button" class="chip" data-hl-lang="all" aria-pressed="${state.hlLang === 'all'}">${t('hl.allLangs')}<span>${everything.length}</span></button>
      </div>`
    : '';
  app.innerHTML = `<div class="wrap hls">
    <header class="chans-head"><h1>${t('hl.title')}</h1><p class="muted">${t('hl.sub')}</p></header>
    ${langChips}
    ${chips}
    ${list.length ? `<div class="hl-grid">${list.map(highlightCard).join('')}</div>` : `<div class="empty">${icon('play')}<span>${t('hl.empty')}</span></div>`}
  </div>`;
}

let dialogPlayer = null;

function openVideo(videoId, title) {
  if (!/^[\w-]{11}$/.test(videoId)) return;
  let dlg = document.getElementById('hlDialog');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.id = 'hlDialog';
    dlg.className = 'hl-dialog';
    dlg.innerHTML = `<div class="hl-modal"><header><h3 dir="auto"></h3><button type="button" class="iconbtn" data-close aria-label="${t('hl.close')}">✕</button></header><div class="hl-frame"></div><p class="hl-error" hidden></p></div>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
    });
    dlg.addEventListener('close', () => {
      dialogPlayer?.destroy();
      dialogPlayer = null;
    });
  }
  const err = dlg.querySelector('.hl-error');
  err.hidden = true;
  dlg.querySelector('h3').textContent = title;
  dialogPlayer?.destroy();
  dialogPlayer = mountYouTube(dlg.querySelector('.hl-frame'), videoId, {
    onError: (code) => {
      // Never send the viewer to YouTube. 100/101/150 mean the video can't
      // play here at all, so hide it from now on; anything else may be a
      // passing network problem.
      dialogPlayer?.destroy();
      const permanent = [100, 101, 150].includes(code);
      if (permanent) {
        markUnplayable(videoId);
        document.querySelectorAll(`[data-video="${videoId}"]`).forEach((b) => b.closest('.hcard')?.remove());
      }
      err.textContent = t(permanent ? 'hl.unavailable' : 'hl.failed');
      err.hidden = false;
    },
  });
  if (dlg.showModal) dlg.showModal();
  else dlg.setAttribute('open', '');
}

/* ---------- Router ---------- */

function parseRoute() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const parts = h.split('/').filter(Boolean);
  if (parts[0] === 'match' && parts[2]) return { name: 'match', slug: parts[1], id: parts[2] };
  if (parts[0] === 'predictions') return { name: 'predictions' };
  if (parts[0] === 'channels') return { name: 'channels' };
  if (parts[0] === 'highlights') return { name: 'highlights' };
  if (parts[0] === 'live') return { name: 'home', day: 0, live: true };
  return { name: 'home', day: DAY_ROUTES[parts[0]] ?? 0 };
}

function render({ soft = false } = {}) {
  const r = state.route;
  if (r.name === 'match') renderMatch(r.slug, r.id);
  else if (r.name === 'predictions') {
    if (!soft || !app.querySelector('.preds') || !app.querySelector('.preds').contains(document.activeElement)) renderPredictions();
  } else if (r.name === 'channels') renderChannels();
  else if (r.name === 'highlights') renderHighlights();
  else renderHome({ soft });
  renderChrome();
}

function onRoute() {
  const prev = state.route;
  const r = parseRoute();
  state.route = r;
  if (r.name === 'home') {
    if (r.live) state.filter = 'live';
    else if (prev.name === 'home' && prev.live) state.filter = 'all';
    if (prev.day !== r.day) state.league = 'all';
  }
  const sameHome = prev.name === 'home' && r.name === 'home';
  render({ soft: sameHome });
  if (!sameHome) window.scrollTo({ top: 0, behavior: 'instant' });
  else if (r.name === 'home' && location.hash) document.getElementById('matches')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- Boot ---------- */

function initTheme() {
  const btn = document.getElementById('themeBtn');
  const root = document.documentElement;
  const effective = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const paint = () => (btn.innerHTML = icon(effective() === 'dark' ? 'sun' : 'moon'));
  btn.onclick = () => {
    const next = effective() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    store.set('theme', next);
    paint();
  };
  paint();
}

function boot() {
  applyDocumentLang();
  initTheme();
  const sel = document.getElementById('langSelect');
  sel.value = getLang();
  sel.onchange = () => setLang(sel.value);
  onLangChange(() => {
    if (state.route.name === 'match' && matchPage) {
      buildMatchLang();
    } else {
      render();
    }
  });
  state.route = parseRoute();
  if (state.route.live) state.filter = 'live';
  window.addEventListener('hashchange', onRoute);
  app.addEventListener('click', (e) => {
    const vid = e.target.closest('[data-video]');
    if (vid) return openVideo(vid.dataset.video, vid.dataset.title || '');
    const hlLang = e.target.closest('[data-hl-lang]');
    if (hlLang) {
      state.hlLang = hlLang.dataset.hlLang;
      state.hlLeague = 'all';
      return renderHighlights();
    }
    const hl = e.target.closest('[data-hl-league]');
    if (hl) {
      state.hlLeague = hl.dataset.hlLeague;
      return renderHighlights();
    }
    const b = e.target.closest('[data-region]');
    if (!b) return;
    store.set('region', b.dataset.region);
    if (state.route.name === 'channels') renderChannels();
    else if (matchPage) renderTabs(matchPage);
  });
  render();
  state.ready = initialLoad().catch(() => render());

  setInterval(() => {
    pollLive().catch(() => {});
  }, REFRESH.live);
  setInterval(() => {
    Promise.all([loadFixtures({ force: true }), loadHighlights({ force: true })])
      .then(() => Promise.all([-1, 0, 1].map((o) => fetchDay(o))))
      .then(() => render({ soft: true }))
      .catch(() => {});
  }, REFRESH.idle);
  setInterval(tickCountdown, 1000);
}

// Language switch on the match page: rebuild everything except the player
function buildMatchLang() {
  const page = matchPage;
  app.querySelector('.back span').textContent = t('match.back');
  app.querySelectorAll('.tabs [data-tab]').forEach((b) => (b.textContent = t(`match.${b.dataset.tab}`)));
  app.querySelectorAll('.mp-side .card-h h3').forEach((h, i) => (h.textContent = t(i === 0 ? 'match.tracker' : 'match.events')));
  app.querySelector('.trk-foot .muted').textContent = t('tracker.note');
  page.pitch.mirror = document.documentElement.dir === 'rtl';
  refreshMatchView(page);
  renderStreams(page);
  renderChrome();
}

boot();
