import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Large or rarely used files that should not be downloaded up front for offline use.
const NOT_PRECACHED = [/^\/sw\.js$/, /^\/index\.html$/, /^\/icons\/og-image\.png$/, /^\/icons\/icon-512\.png$/, /^\/icons\/icon-maskable-512\.png$/, /^\/icons\/logo-maskable\.svg$/, /\.txt$/];

const listFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? listFiles(full) : [full];
});

const toUrl = (prefix, root, file) => `${prefix}${path.relative(root, file).split(path.sep).join('/')}`;

// Serves public/sw.js with its precache list and a content-derived version, so every deploy that
// changes any asset installs a fresh worker and the app offers the update.
export const createServiceWorker = ({ publicDir, sharedDir }) => {
  const build = () => {
    const assets = [
      ...listFiles(publicDir).map((file) => ({ file, url: toUrl('/', publicDir, file) })),
      ...listFiles(sharedDir).map((file) => ({ file, url: toUrl('/shared/', sharedDir, file) })),
    ]
      .filter(({ url }) => !NOT_PRECACHED.some((pattern) => pattern.test(url)))
      .sort((a, b) => a.url.localeCompare(b.url));

    const template = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8');
    const hash = crypto.createHash('sha256');
    hash.update(template);
    hash.update(fs.readFileSync(path.join(publicDir, 'index.html')));
    for (const { url, file } of assets) hash.update(url).update(fs.readFileSync(file));
    const version = hash.digest('hex').slice(0, 12);

    return template
      .replace("'__VERSION__'", JSON.stringify(version))
      .replace("'__PRECACHE__'", JSON.stringify(['/', ...assets.map(({ url }) => url)]));
  };

  let source = null;
  return {
    source({ rebuild = false } = {}) {
      if (!source || rebuild) source = build();
      return source;
    },
  };
};
