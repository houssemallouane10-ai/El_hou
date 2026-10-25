// Match prediction: team rating from season points-per-game and recent form,
// turned into expected goals, then a Poisson score matrix with a small
// Dixon-Coles correction for low scores.

const MAX_GOALS = 8;
const HOME_ADV = 0.12;
const LEAGUE_AVG_PPG = 1.37;

function formPpg(form) {
  const last = (form || '').toUpperCase().replace(/[^WDL]/g, '').slice(-5);
  if (last.length < 3) return null;
  const pts = [...last].reduce((s, c) => s + (c === 'W' ? 3 : c === 'D' ? 1 : 0), 0);
  return pts / last.length;
}

function rating(team) {
  const r = team.record;
  const games = r ? r.w + r.d + r.l : 0;
  const seasonPpg = games >= 2 ? (3 * r.w + r.d) / games : null;
  const recent = formPpg(team.form);
  if (seasonPpg !== null && recent !== null) return { value: 0.65 * seasonPpg + 0.35 * recent, basis: 'record', games };
  if (seasonPpg !== null) return { value: seasonPpg, basis: 'record', games };
  if (recent !== null) return { value: recent, basis: 'form', games: 5 };
  return { value: LEAGUE_AVG_PPG, basis: 'none', games: 0 };
}

const factorials = [1];
for (let i = 1; i <= MAX_GOALS; i++) factorials[i] = factorials[i - 1] * i;
const poisson = (k, lambda) => (Math.exp(-lambda) * lambda ** k) / factorials[k];

function dixonColes(h, a, lh, la, rho = -0.06) {
  if (h === 0 && a === 0) return 1 - lh * la * rho;
  if (h === 0 && a === 1) return 1 + lh * rho;
  if (h === 1 && a === 0) return 1 + la * rho;
  if (h === 1 && a === 1) return 1 - rho;
  return 1;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function predict(match) {
  const rh = rating(match.home);
  const ra = rating(match.away);
  const diff = rh.value - ra.value;
  const lambdaHome = clamp(1.32 * Math.exp(0.42 * diff + HOME_ADV), 0.25, 4.2);
  const lambdaAway = clamp(1.12 * Math.exp(-0.42 * diff), 0.2, 4);

  let pHome = 0;
  let pDraw = 0;
  let pAway = 0;
  let over25 = 0;
  let btts = 0;
  let best = { p: -1, h: 0, a: 0 };
  let total = 0;

  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = poisson(h, lambdaHome) * poisson(a, lambdaAway) * dixonColes(h, a, lambdaHome, lambdaAway);
      total += p;
      if (h > a) pHome += p;
      else if (h === a) pDraw += p;
      else pAway += p;
      if (h + a > 2) over25 += p;
      if (h > 0 && a > 0) btts += p;
      if (p > best.p) best = { p, h, a };
    }
  }

  pHome /= total;
  pDraw /= total;
  pAway /= total;
  const outcome = pHome >= pDraw && pHome >= pAway ? 'home' : pAway >= pDraw ? 'away' : 'draw';

  // The most likely single score often contradicts the most likely outcome
  // (1-1 tops many matrices); pick the likeliest score inside that outcome.
  let score = best;
  if (scoreOutcome(best.h, best.a) !== outcome) {
    score = { p: -1, h: 0, a: 0 };
    for (let h = 0; h <= 5; h++) {
      for (let a = 0; a <= 5; a++) {
        if (scoreOutcome(h, a) !== outcome) continue;
        const p = poisson(h, lambdaHome) * poisson(a, lambdaAway) * dixonColes(h, a, lambdaHome, lambdaAway);
        if (p > score.p) score = { p, h, a };
      }
    }
  }

  const top = Math.max(pHome, pDraw, pAway);
  const dataGames = Math.min(rh.games, ra.games);
  let confidence = top > 0.58 ? 'high' : top > 0.45 ? 'mid' : 'low';
  if (rh.basis === 'none' || ra.basis === 'none' || dataGames < 3) confidence = 'low';
  const basis = rh.basis === 'none' || ra.basis === 'none' ? 'none' : rh.basis === 'record' && ra.basis === 'record' ? 'record' : 'form';

  return {
    pHome, pDraw, pAway,
    outcome,
    score: [score.h, score.a],
    xg: [lambdaHome, lambdaAway],
    over25: over25 / total,
    btts: btts / total,
    confidence,
    basis,
  };
}

export const scoreOutcome = (h, a) => (h > a ? 'home' : h < a ? 'away' : 'draw');

/** Grades a prediction against a final score: exact | outcome | miss */
export function grade(pred, home, away) {
  if (home === null || away === null) return null;
  if (pred.score[0] === home && pred.score[1] === away) return 'exact';
  return pred.outcome === scoreOutcome(home, away) ? 'outcome' : 'miss';
}
