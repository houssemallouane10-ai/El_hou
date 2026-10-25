// Official broadcasters and who holds which rights, by region, for the
// 2026-27 season (from the leagues' and broadcasters' announcements).
// Rights change between seasons: update RIGHTS when they do.

export const REGIONS = [
  { id: 'mena', name: { ar: 'الشرق الأوسط وشمال أفريقيا', fr: 'Moyen-Orient et Afrique du Nord', en: 'Middle East & North Africa' } },
  { id: 'fr', name: { ar: 'فرنسا', fr: 'France', en: 'France' } },
  { id: 'es', name: { ar: 'إسبانيا', fr: 'Espagne', en: 'Spain' } },
  { id: 'uk', name: { ar: 'بريطانيا', fr: 'Royaume-Uni', en: 'United Kingdom' } },
  { id: 'balkans', name: { ar: 'البلقان', fr: 'Balkans', en: 'Balkans' } },
  { id: 'us', name: { ar: 'الولايات المتحدة', fr: 'États-Unis', en: 'United States' } },
  { id: 'mx', name: { ar: 'المكسيك وأمريكا الوسطى', fr: 'Mexique et Amérique centrale', en: 'Mexico & Central America' } },
];

export const DEFAULT_REGION = { ar: 'mena', fr: 'fr', en: 'uk' };

export const CHANNELS = {
  bein: { name: 'beIN SPORTS', color: '#5b2c86', links: [['beIN SPORTS', 'https://www.beinsports.com'], ['TOD', 'https://www.tod.tv']] },
  thmanyah: { name: 'Thmanyah', color: '#1d6b57', free: true, links: [['Thmanyah', 'https://thmanyah.com']] },
  arena: { name: 'Arena Sport', color: '#d71920', links: [['Arena Sport', 'https://www.tvarenasport.com']] },
  fox: { name: 'FOX Sports', color: '#0b3d91', links: [['FOX Sports', 'https://www.foxsports.com'], ['FOX One', 'https://www.fox.com']] },
  sky: { name: 'Sky Sports', color: '#d50b25', links: [['Sky Sports', 'https://www.skysports.com']] },
  tnt: { name: 'TNT Sports', color: '#303030', links: [['TNT Sports', 'https://www.tntsports.co.uk']] },
  prime: { name: 'Prime Video', color: '#1399d6', links: [['Prime Video', 'https://www.primevideo.com']] },
  dazn: { name: 'DAZN', color: '#161616', links: [['DAZN', 'https://www.dazn.com']] },
  movistar: { name: 'Movistar Plus+', color: '#0b8fd8', links: [['Movistar Plus+', 'https://www.movistarplus.es']] },
  canal: { name: 'CANAL+', color: '#1a1a1a', links: [['CANAL+', 'https://www.canalplus.com']] },
  ligue1plus: { name: 'Ligue 1+', color: '#0d1f4c', links: [['Ligue 1', 'https://www.ligue1.com']] },
  peacock: { name: 'NBC · Peacock', color: '#262626', links: [['Peacock', 'https://www.peacocktv.com']] },
  paramount: { name: 'Paramount+ · CBS', color: '#0064ff', links: [['Paramount+', 'https://www.paramountplus.com']] },
  espn: { name: 'ESPN', color: '#c40000', links: [['ESPN', 'https://www.espn.com']] },
  apple: { name: 'Apple TV', color: '#1c1c1e', links: [['Apple TV', 'https://tv.apple.com']] },
  fifaplus: { name: 'FIFA+', color: '#2d5b9a', free: true, global: true, links: [['FIFA+', 'https://www.plus.fifa.com']] },
};

// region -> ESPN league slug -> channel ids
export const RIGHTS = {
  mena: {
    'eng.1': ['bein'], 'esp.1': ['bein'], 'fra.1': ['bein'],
    'uefa.champions': ['bein'], 'uefa.europa': ['bein'], 'uefa.europa.conf': ['bein'],
    'ksa.1': ['thmanyah'],
  },
  fr: { 'eng.1': ['canal'], 'fra.1': ['ligue1plus'], 'uefa.champions': ['canal'] },
  es: {
    'esp.1': ['movistar', 'dazn'], 'eng.1': ['dazn'],
    'uefa.champions': ['movistar'], 'uefa.europa': ['movistar'], 'uefa.europa.conf': ['movistar'],
  },
  uk: {
    'eng.1': ['sky', 'tnt'], 'ita.1': ['tnt'],
    'uefa.champions': ['tnt', 'prime'], 'uefa.europa': ['tnt'], 'uefa.europa.conf': ['tnt'],
  },
  balkans: { 'eng.1': ['arena'], 'uefa.champions': ['arena'], 'uefa.europa': ['arena'] },
  us: { 'eng.1': ['peacock'], 'uefa.champions': ['paramount'], 'esp.1': ['espn'], 'usa.1': ['apple'] },
  mx: { 'ger.1': ['fox'] },
};

export const channelsFor = (leagueSlug, region) => RIGHTS[region]?.[leagueSlug] || [];

/** Regions and league slugs a channel holds, derived from RIGHTS. */
export function coverage(channelId) {
  const regions = new Set();
  const leagues = new Set();
  Object.entries(RIGHTS).forEach(([region, map]) =>
    Object.entries(map).forEach(([slug, ids]) => {
      if (!ids.includes(channelId)) return;
      regions.add(region);
      leagues.add(slug);
    }),
  );
  return { regions: [...regions], leagues: [...leagues] };
}
