// Sets a temporary password for an account and signs it out everywhere, for when the owner is
// locked out and nobody can reset it from the admin console: npm run reset-password -- 0661234567
import { loadConfig } from '../server/config.js';
import { createServices } from '../server/services.js';
import { systemClock } from '../server/shared/clock.js';
import { openDatabase } from '../server/shared/db/database.js';
import { isMobilePhone, normalizePhone } from '../shared/phone.js';

const phone = normalizePhone(process.argv[2]);
if (!isMobilePhone(phone)) {
  console.error('Usage: npm run reset-password -- 06XXXXXXXX');
  process.exit(1);
}

const config = loadConfig();
const db = openDatabase(config.databaseFile);
try {
  const { user, temporaryPassword } = await createServices({ db, clock: systemClock, config }).accounts.resetPasswordByPhone(phone);
  console.log(`✔ Temporary password for ${user.name} (${user.phone}): ${temporaryPassword}`);
  console.log('  Sign in with it, then change it from Settings.');
} catch (error) {
  console.error(error.code === 'USER_NOT_FOUND' ? `No account uses ${phone}.` : error);
  process.exitCode = 1;
} finally {
  db.close();
}
