// Official highlight videos, matched to finished matches by the scheduled
// GitHub Action (scripts/highlights.mjs) and published as data/highlights.json.

import { store } from './store.js';

const VIDEO_ID = /^[\w-]{11}$/;

// Videos that failed to play in this browser (e.g. blocked in the viewer's
// country) are hidden from then on
const blocked = new Set(store.get('hlBlocked', []));
const playable = (id) => VIDEO_ID.test(id || '') && !blocked.has(id);

export function markUnplayable(videoId) {
  blocked.add(videoId);
  store.set('hlBlocked', [...blocked].slice(-300));
}
const MAX_AGE = 10 * 60_000;

let data = { matches: {}, latest: [], updatedAt: null };
let pending = null;
let loadedAt = 0;

export function loadHighlights({ force = false } = {}) {
  if (!force && pending && Date.now() - loadedAt < MAX_AGE) return pending;
  loadedAt = Date.now();
  pending = fetch('data/highlights.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d) {
        data = {
          matches: d.matches || {},
          latest: (d.latest || []).filter((v) => VIDEO_ID.test(v.videoId)),
          updatedAt: d.updatedAt || null,
        };
      }
      return data;
    })
    .catch(() => data);
  return pending;
}

/** The match's highlights, in Arabic when an Arabic version exists. */
export const highlightFor = (matchId) => highlightsFor(matchId)[0] || null;

/** Every playable highlight for a match: Arabic first, then the original. */
export function highlightsFor(matchId) {
  const h = data.matches[matchId];
  if (!h) return [];
  const list = [];
  if (h.ar && playable(h.ar.videoId)) list.push({ ...h, ...h.ar, lang: 'ar' });
  if (playable(h.videoId) && h.videoId !== h.ar?.videoId) list.push({ ...h, lang: '' });
  return list;
}

/** Latest videos, Arabic ones first. */
export const latestHighlights = () => {
  const list = data.latest.filter((v) => playable(v.videoId));
  return [...list.filter((v) => v.lang === 'ar'), ...list.filter((v) => v.lang !== 'ar')];
};

export const thumbUrl = (videoId) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
