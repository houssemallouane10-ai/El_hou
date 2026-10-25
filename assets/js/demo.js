// Offline fallback: a deterministic schedule of demo fixtures, shown only when
// no data source can be reached. Every match is flagged demo: true.

const DEMO_LEAGUES = [
  {
    slug: 'eng.1', name: { ar: 'الدوري الإنجليزي', fr: 'Premier League', en: 'Premier League' },
    teams: [['Arsenal', 'EF0107'], ['Liverpool', 'C8102E'], ['Manchester City', '6CABDD'], ['Chelsea', '034694'], ['Tottenham', '132257'], ['Newcastle', '241F20'], ['Aston Villa', '670E36'], ['Manchester United', 'DA291C']],
  },
  {
    slug: 'esp.1', name: { ar: 'الدوري الإسباني', fr: 'LaLiga', en: 'LaLiga' },
    teams: [['Real Madrid', 'FEBE10'], ['Barcelona', 'A50044'], ['Atlético Madrid', 'CB3524'], ['Real Sociedad', '0067B1'], ['Villarreal', 'FFE667'], ['Real Betis', '00954C']],
  },
  {
    slug: 'ksa.1', name: { ar: 'دوري روشن السعودي', fr: 'Saudi Pro League', en: 'Saudi Pro League' },
    teams: [['Al Hilal', '005CA9'], ['Al Nassr', 'FCD116'], ['Al Ittihad', 'F2C200'], ['Al Ahli', '006633'], ['Al Ettifaq', '00563F'], ['Al Shabab', 'E2001A']],
  },
  {
    slug: 'caf.champions', name: { ar: 'دوري أبطال أفريقيا', fr: 'Ligue des champions CAF', en: 'CAF Champions League' },
    teams: [['Al Ahly', 'C8102E'], ['MC Alger', 'D52B1E'], ['Wydad AC', 'D71920'], ['Espérance de Tunis', 'C8102E'], ['Mamelodi Sundowns', 'FFD700'], ['CR Belouizdad', 'C8102E']],
  },
  {
    slug: 'ita.1', name: { ar: 'الدوري الإيطالي', fr: 'Serie A', en: 'Serie A' },
    teams: [['Inter', '0068A8'], ['Milan', 'FB090B'], ['Juventus', '1B1B1B'], ['Napoli', '12A0D7'], ['Roma', '8E1F2F'], ['Atalanta', '1E71B8']],
  },
];

const SLOTS = [[13, 30], [16, 0], [18, 30], [21, 0]];

function rng(seed) {
  let s = 0;
  for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

function team(r, [name, color], score) {
  const w = 2 + Math.floor(r() * 7);
  const d = Math.floor(r() * 4);
  const l = Math.floor(r() * 5);
  const form = Array.from({ length: 5 }, () => pick(r, ['W', 'W', 'D', 'L'])).join('');
  return {
    id: `demo-${name}`, name, short: name, abbr: name.replace(/^(Al |AC |CR |MC )/, '').slice(0, 3).toUpperCase(),
    logo: '', color: `#${color}`, alt: '', score, pens: null, form, record: { w, d, l }, winner: false,
  };
}

export function demoDay(date) {
  const day = new Date(date);
  const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
  const r = rng(key);
  const now = Date.now();
  const matches = [];

  DEMO_LEAGUES.forEach((lg, li) => {
    const teams = [...lg.teams].sort(() => r() - 0.5);
    const count = 1 + Math.floor(r() * 3);
    for (let i = 0; i < count && i * 2 + 1 < teams.length; i++) {
      const [h, m] = pick(r, SLOTS);
      const kickoff = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
      const elapsed = (now - kickoff.getTime()) / 60_000;
      let state = 'pre';
      let clock = '';
      let hs = null;
      let as = null;
      const finalH = Math.floor(r() * 4);
      const finalA = Math.floor(r() * 3);
      if (elapsed > 110) {
        state = 'post';
        hs = finalH;
        as = finalA;
      } else if (elapsed >= 0) {
        const minute = elapsed > 45 && elapsed < 60 ? 45 : Math.min(90, elapsed > 60 ? elapsed - 15 : elapsed);
        state = elapsed > 45 && elapsed < 60 ? 'ht' : 'live';
        clock = state === 'live' ? `${Math.max(1, Math.floor(minute))}'` : '';
        const frac = minute / 90;
        hs = Math.floor(finalH * frac);
        as = Math.floor(finalA * frac);
      }
      const home = team(r, teams[i * 2], hs);
      const away = team(r, teams[i * 2 + 1], as);
      matches.push({
        id: `demo-${key}-${li}-${i}`,
        league: { slug: lg.slug, name: lg.name, abbr: '', logo: '', order: li },
        kickoff,
        day: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`,
        status: { state, clock, detail: '', period: 0 },
        home,
        away,
        venue: '',
        city: '',
        broadcasts: [],
        events: [],
        source: 'demo',
        demo: true,
      });
    }
  });
  return matches;
}
