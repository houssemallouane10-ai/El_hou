// Official highlight videos, matched to finished matches by the scheduled
// GitHub Action (scripts/highlights.mjs) and published as data/highlights.json.

const VIDEO_ID = /^[\w-]{11}$/;
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
export function highlightFor(matchId) {
  const h = data.matches[matchId];
  if (!h) return null;
  if (h.ar && VIDEO_ID.test(h.ar.videoId)) return { ...h, ...h.ar, lang: 'ar' };
  return VIDEO_ID.test(h.videoId) ? h : null;
}

/** Latest videos, Arabic ones first. */
export const latestHighlights = () => [
  ...data.latest.filter((v) => v.lang === 'ar'),
  ...data.latest.filter((v) => v.lang !== 'ar'),
];

export const embedUrl = (videoId, autoplay = false) =>
  `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1${autoplay ? '&autoplay=1' : ''}`;

export const thumbUrl = (videoId) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
