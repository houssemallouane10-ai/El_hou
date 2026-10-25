import { parseSettings } from './contracts.js';

// The package name the Play Store guide uses; owners can change it before the first release.
export const DEFAULT_ANDROID_PACKAGE = 'dz.khedmati.app';

// Settings the owner manages from the admin console. A saved value wins, even when empty; until
// a field is saved, the server's environment (SUPPORT_*, ANDROID_*) provides it.
export const createPlatformService = ({ db, clock, config }) => {
  const statements = {
    all: db.prepare('SELECT key, value FROM settings'),
    save: db.prepare(`
      INSERT INTO settings (key, value, updated_at, updated_by) VALUES (@key, @value, @now, @userId)
      ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by
    `),
  };

  const settings = () => {
    const saved = Object.fromEntries(statements.all.all().map((row) => [row.key, row.value]));
    const pick = (key, fallback) => (key in saved ? saved[key] : fallback);
    return {
      supportWhatsapp: pick('supportWhatsapp', config.supportWhatsapp),
      supportEmail: pick('supportEmail', config.supportEmail),
      androidPackage: pick('androidPackage', config.androidApp.packageName) || DEFAULT_ANDROID_PACKAGE,
      androidFingerprints: 'androidFingerprints' in saved ? JSON.parse(saved.androidFingerprints) : config.androidApp.fingerprints,
    };
  };

  return {
    settings,

    // Contact shown on "forgot password", the privacy policy and the account deletion page.
    support() {
      const { supportWhatsapp, supportEmail } = settings();
      return { whatsapp: supportWhatsapp || null, email: supportEmail || null };
    },

    // The app allowed to open this site full screen, or null until a fingerprint is known.
    androidApp() {
      const { androidPackage, androidFingerprints } = settings();
      return androidFingerprints.length > 0 ? { packageName: androidPackage, fingerprints: androidFingerprints } : null;
    },

    update(userId, input) {
      const changes = parseSettings(input);
      const now = clock.now().toISOString();
      db.transaction(() => {
        for (const [key, value] of Object.entries(changes)) {
          const stored = key === 'androidFingerprints' ? JSON.stringify(value) : value ?? '';
          statements.save.run({ key, value: stored, now, userId });
        }
      })();
      return settings();
    },
  };
};
