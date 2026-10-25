// Resolves which stream sources a match gets, from streams.json plus any
// links the viewer added on this device.

import { store } from './store.js';

let configPromise = null;

export function loadStreamConfig() {
  configPromise ??= fetch('streams.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  return configPromise;
}

export const slug = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const matchKey = (m) => `${slug(m.home.name)}-vs-${slug(m.away.name)}`;

function expand(entries, cfg) {
  const out = [];
  (entries || []).forEach((entry) => {
    if (typeof entry === 'string') {
      const ch = cfg.channels?.[entry];
      if (!ch) return;
      (ch.sources || []).forEach((s, i) =>
        out.push({ ...s, channel: ch.name || entry, demo: !!ch.demo, id: `${entry}#${i}` }),
      );
    } else if (entry?.url) {
      out.push({ ...entry, id: entry.id || entry.url });
    }
  });
  return out;
}

const userKey = (m) => `links:${m.id}`;

export function userLinks(match) {
  return store.get(userKey(match), []);
}

export function addUserLink(match, link) {
  const list = userLinks(match).filter((l) => l.url !== link.url);
  list.unshift(link);
  store.set(userKey(match), list.slice(0, 8));
}

export async function sourcesFor(match) {
  const cfg = await loadStreamConfig();
  const candidates = [
    cfg.matches?.[match.id],
    cfg.matches?.[matchKey(match)],
    cfg.leagues?.[match.league.slug],
  ].find((v) => Array.isArray(v) && v.length);

  const mine = userLinks(match).map((l, i) => ({ ...l, id: `mine#${i}`, mine: true }));
  const configured = expand(candidates || cfg.default || [], cfg);
  return [...mine, ...configured].map((s) => ({
    type: s.type || (/\.mp4(\?|$)/i.test(s.url) ? 'mp4' : /youtube\.com|youtu\.be|player\.|embed/i.test(s.url) && !/\.m3u8/i.test(s.url) ? 'iframe' : 'hls'),
    lang: s.lang || 'multi',
    label: s.label || 'Server',
    ...s,
  }));
}
