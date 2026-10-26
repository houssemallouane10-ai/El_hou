// Opens the live site in Chrome and reports what a visitor sees:
// console errors, failed requests, matches shown and the data source.
// Usage: SITE_URL=https://user.github.io/repo/ node scripts/check-site.mjs

import { chromium } from 'playwright';

const SITE = process.env.SITE_URL;
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard';

async function corsCheck() {
  const res = await fetch(ESPN, { headers: { Origin: new URL(SITE).origin } });
  console.log(`ESPN ${res.status} access-control-allow-origin: ${res.headers.get('access-control-allow-origin')}`);
}

async function visit(browser, path, viewport) {
  const page = await browser.newPage({ viewport, locale: 'ar' });
  const problems = [];
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && problems.push(`console ${m.type()}: ${m.text().slice(0, 200)}`));
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`failed: ${r.url().slice(0, 120)} ${r.failure()?.errorText}`));
  page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()}: ${r.url().slice(0, 120)}`));
  await page.goto(SITE + path, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForTimeout(12_000);
  const state = await page.evaluate(() => ({
    title: document.title,
    rows: document.querySelectorAll('.mrow').length,
    highlights: document.querySelectorAll('.hcard').length,
    source: document.querySelector('.srcnote')?.innerText.replace(/\s+/g, ' ').slice(0, 160) || '',
    empty: document.querySelector('.empty')?.innerText.slice(0, 120) || '',
    video: (() => {
      const v = document.querySelector('.player video');
      return v ? { time: v.currentTime.toFixed(1), size: `${v.videoWidth}x${v.videoHeight}`, error: document.querySelector('.pl-msg:not([hidden])')?.innerText || '' } : null;
    })(),
  }));
  console.log(`\n== ${path || '/'} (${viewport.width}px)`);
  console.log(JSON.stringify(state));
  [...new Set(problems)].slice(0, 25).forEach((p) => console.log(`  ${p}`));
  return page;
}

async function dataCheck() {
  const get = async (path) => (await fetch(`${SITE}${path}?t=${Date.now()}`)).json();
  const fx = await get('data/fixtures.json');
  const hl = await get('data/highlights.json');
  const embeds = Object.values(await get('data/yt-embed.json').catch(() => ({})));
  const matched = Object.values(hl.matches || {});
  console.log(`fixtures: ${fx.matches?.length || 0} matches, updated ${fx.updatedAt}`);
  console.log(`highlights: ${matched.length} matches (${matched.filter((h) => h.ar).length} in Arabic), ${hl.latest?.length || 0} latest`);
  console.log(`embedding: ${embeds.filter((v) => v === true).length} videos can play on the site, ${embeds.filter((v) => v === false).length} blocked by their owners`);
  console.log(`last highlights run: ${JSON.stringify(await get('data/hl-status.json').catch(() => null))}`);
}

const browser = await chromium.launch({ channel: 'chrome' });
await dataCheck().catch((e) => console.log(`data check failed: ${e.message}`));
await corsCheck().catch((e) => console.log(`ESPN check failed: ${e.message}`));
const home = await visit(browser, '', { width: 1280, height: 900 });
const firstMatch = await home.getAttribute('.mrow', 'href').catch(() => null);
await visit(browser, '#/highlights', { width: 1280, height: 900 });
await visit(browser, '#/channels', { width: 390, height: 844 });
if (firstMatch) await visit(browser, firstMatch, { width: 1280, height: 900 });

// The other apps published from this repo
for (const path of ['barmaj/', 'nadouch.html']) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && problems.push(`console error: ${m.text().slice(0, 200)}`));
  page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()}: ${r.url().slice(0, 120)}`));
  const res = await page.goto(SITE + path, { waitUntil: 'load', timeout: 60_000 }).catch((e) => ({ status: () => e.message }));
  await page.waitForTimeout(5_000);
  const info = await page.evaluate(() => ({ title: document.title, text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 140) })).catch(() => ({}));
  console.log(`\n== ${path} status ${res.status()}`);
  console.log(JSON.stringify(info));
  [...new Set(problems)].slice(0, 15).forEach((p) => console.log(`  ${p}`));
}
await browser.close();
