// Signs the APK built by .github/workflows/android.yml and writes
// barmaj/download/Barmaj.apk.
//
// The signing key lives in barmaj/android/barmaj.keystore.enc, encrypted with
// AES-256 (openssl, PBKDF2). Only the passphrase is secret; keep it safe, it is
// needed for every future update of the app.
//
//   git fetch origin android-build
//   git show origin/android-build:barmaj-unsigned.apk > /tmp/barmaj-unsigned.apk
//   BARMAJ_SIGNING_KEY='…' node barmaj/tools/sign-apk.mjs /tmp/barmaj-unsigned.apk
//
// Needs Java and openssl. uber-apk-signer (zipalign + apksigner) is downloaded
// on first use into tools/.cache.
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SIGNER = 'https://github.com/patrickfav/uber-apk-signer/releases/download/v1.3.0/uber-apk-signer-1.3.0.jar';
const ALIAS = 'barmaj';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..');
const input = process.argv[2];
const pass = process.env.BARMAJ_SIGNING_KEY;
if (!input || !pass) {
  console.error('usage: BARMAJ_SIGNING_KEY=… node sign-apk.mjs <unsigned.apk>');
  process.exit(1);
}

const jar = join(here, '.cache', 'uber-apk-signer.jar');
try {
  await stat(jar);
} catch {
  await mkdir(dirname(jar), { recursive: true });
  const res = await fetch(SIGNER);
  if (!res.ok) throw new Error(`could not download uber-apk-signer: HTTP ${res.status}`);
  await writeFile(jar, Buffer.from(await res.arrayBuffer()));
}

const work = await mkdtemp(join(tmpdir(), 'barmaj-sign-'));
try {
  const keystore = join(work, 'barmaj.keystore');
  execFileSync('openssl', ['enc', '-d', '-aes-256-cbc', '-pbkdf2', '-iter', '600000', '-in', join(app, 'android', 'barmaj.keystore.enc'), '-out', keystore, '-pass', 'env:BARMAJ_SIGNING_KEY']);
  const apk = join(work, 'Barmaj.apk');
  await copyFile(input, apk);
  execFileSync('java', ['-jar', jar, '--apks', apk, '--ks', keystore, '--ksAlias', ALIAS, '--ksPass', pass, '--ksKeyPass', pass, '--out', join(work, 'signed'), '--allowResign'], { stdio: 'inherit' });
  const signed = (await readdir(join(work, 'signed'))).find((f) => f.endsWith('.apk'));
  await mkdir(join(app, 'download'), { recursive: true });
  await copyFile(join(work, 'signed', signed), join(app, 'download', 'Barmaj.apk'));
  const cert = execFileSync('keytool', ['-list', '-v', '-keystore', keystore, '-alias', ALIAS, '-storepass', pass], { encoding: 'utf8' });
  console.log(`\nwrote barmaj/download/Barmaj.apk\nSHA-256 ${cert.match(/SHA256:\s*([0-9A-F:]+)/)[1]}`);
} finally {
  await rm(work, { recursive: true, force: true });
}
