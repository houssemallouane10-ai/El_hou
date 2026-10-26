// Site-wide settings. Edit the brand and the league list here.

export const SITE = {
  name: { ar: 'مدرّج', fr: 'Mudarraj', en: 'Mudarraj' },
  short: 'MDRJ',
};

export const API = {
  espn: 'https://site.api.espn.com/apis/site/v2/sports/soccer',
};

// Polling intervals (ms). The published data is refreshed every ~5 minutes,
// so polling faster than once a minute only re-reads the same file.
export const REFRESH = {
  live: 60_000,
  idle: 5 * 60_000,
  matchLive: 60_000,
};

// ESPN league slugs, in display order. Unknown slugs are skipped silently.
export const LEAGUES = [
  { slug: 'uefa.champions', name: { ar: 'دوري أبطال أوروبا', fr: 'Ligue des champions', en: 'Champions League' } },
  { slug: 'eng.1', name: { ar: 'الدوري الإنجليزي', fr: 'Premier League', en: 'Premier League' } },
  { slug: 'esp.1', name: { ar: 'الدوري الإسباني', fr: 'LaLiga', en: 'LaLiga' } },
  { slug: 'ita.1', name: { ar: 'الدوري الإيطالي', fr: 'Serie A', en: 'Serie A' } },
  { slug: 'ger.1', name: { ar: 'الدوري الألماني', fr: 'Bundesliga', en: 'Bundesliga' } },
  { slug: 'fra.1', name: { ar: 'الدوري الفرنسي', fr: 'Ligue 1', en: 'Ligue 1' } },
  { slug: 'ksa.1', name: { ar: 'دوري روشن السعودي', fr: 'Saudi Pro League', en: 'Saudi Pro League' } },
  { slug: 'uefa.europa', name: { ar: 'الدوري الأوروبي', fr: 'Ligue Europa', en: 'Europa League' } },
  { slug: 'uefa.europa.conf', name: { ar: 'دوري المؤتمر الأوروبي', fr: 'Ligue Conférence', en: 'Conference League' } },
  { slug: 'caf.champions', name: { ar: 'دوري أبطال أفريقيا', fr: 'Ligue des champions CAF', en: 'CAF Champions League' } },
  { slug: 'caf.confed', name: { ar: 'كأس الكونفدرالية', fr: 'Coupe de la Confédération', en: 'CAF Confederation Cup' } },
  { slug: 'egy.1', name: { ar: 'الدوري المصري', fr: 'Championnat d\'Égypte', en: 'Egyptian Premier League' } },
  { slug: 'por.1', name: { ar: 'الدوري البرتغالي', fr: 'Liga Portugal', en: 'Liga Portugal' } },
  { slug: 'ned.1', name: { ar: 'الدوري الهولندي', fr: 'Eredivisie', en: 'Eredivisie' } },
  { slug: 'tur.1', name: { ar: 'الدوري التركي', fr: 'Süper Lig', en: 'Süper Lig' } },
  { slug: 'eng.league_cup', name: { ar: 'كأس الرابطة الإنجليزية', fr: 'Coupe de la Ligue anglaise', en: 'Carabao Cup' } },
  { slug: 'usa.1', name: { ar: 'الدوري الأمريكي', fr: 'MLS', en: 'MLS' } },
  { slug: 'fifa.friendly', name: { ar: 'مباريات ودية دولية', fr: 'Matchs amicaux', en: 'International friendlies' } },
];

// Commentary languages offered in the stream picker
export const COMMENTARY_LANGS = ['ar', 'fr', 'en', 'es', 'de', 'it', 'pt', 'tr', 'multi'];

export const UI_LANGS = ['ar', 'fr', 'en'];
