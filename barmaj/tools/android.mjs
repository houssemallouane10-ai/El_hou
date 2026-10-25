// Generates barmaj/android: an Android app (Trusted Web Activity) that opens
// Barmaj full screen in Chrome. Built by .github/workflows/android.yml.
//   cd barmaj/tools && npm ci && node android.mjs
// Icons are downloaded while generating; ICON_BASE points them at a local
// server when the site is not reachable (e.g. http://127.0.0.1:8000/barmaj/).
import bubblewrap from '@bubblewrap/core';
import Color from 'color';
import { readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { TwaManifest, TwaGenerator, ConsoleLog } = bubblewrap;

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..');
const out = join(app, 'android');

export const SITE = 'https://houssemallouane10-ai.github.io/El_hou/barmaj/';
export const PACKAGE_ID = 'io.github.houssemallouane10ai.barmaj';
const VERSION = { code: 1, name: '1.0.0' };
const iconBase = process.env.ICON_BASE || SITE;
const local = (url) => url && url.replace(SITE, iconBase);

const webManifest = JSON.parse(await readFile(join(app, 'manifest.webmanifest'), 'utf8'));
const twa = TwaManifest.fromWebManifestJson(new URL('manifest.webmanifest', SITE), webManifest);

Object.assign(twa, {
  packageId: PACKAGE_ID,
  name: 'برمج · Barmaj',
  launcherName: 'برمج',
  display: 'standalone',
  orientation: 'default',
  iconUrl: `${SITE}icons/icon-512.png`,
  maskableIconUrl: `${SITE}icons/maskable-512.png`,
  monochromeIconUrl: undefined,
  appVersionCode: VERSION.code,
  appVersionName: VERSION.name,
  fallbackType: 'customtabs',
  enableNotifications: false,
  enableSiteSettingsShortcut: false,
  splashScreenFadeOutDuration: 300,
  signingKey: { path: './barmaj.keystore', alias: 'barmaj' },
  generatorApp: 'barmaj/tools/android.mjs',
});
for (const key of ['themeColor', 'themeColorDark', 'navigationColor', 'navigationColorDark', 'navigationDividerColor', 'navigationDividerColorDark', 'backgroundColor']) {
  twa[key] = Color(key.startsWith('theme') ? '#0d0819' : '#07040f');
}

const error = twa.validate();
if (error) throw new Error(error);

// Download icons from ICON_BASE, but keep the real URLs in twa-manifest.json
const real = {
  iconUrl: twa.iconUrl,
  maskableIconUrl: twa.maskableIconUrl,
  webManifestUrl: twa.webManifestUrl,
  shortcuts: twa.shortcuts.map((s) => s.chosenIconUrl),
};
twa.webManifestUrl = new URL(local(twa.webManifestUrl.href));
twa.iconUrl = local(twa.iconUrl);
twa.maskableIconUrl = local(twa.maskableIconUrl);
twa.shortcuts.forEach((s) => { s.chosenIconUrl = local(s.chosenIconUrl); });

await rm(out, { recursive: true, force: true });
await new TwaGenerator().createTwaProject(out, twa, new ConsoleLog('android'));

twa.iconUrl = real.iconUrl;
twa.maskableIconUrl = real.maskableIconUrl;
twa.webManifestUrl = real.webManifestUrl;
twa.shortcuts.forEach((s, i) => { s.chosenIconUrl = real.shortcuts[i]; });
await twa.saveToFile(join(out, 'twa-manifest.json'));
console.log(`android project written to ${out} (${PACKAGE_ID} ${VERSION.name})`);
