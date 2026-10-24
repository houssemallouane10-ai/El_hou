// Names an existing account as an owner (all rights, appoints moderators), or removes it with
// --revoke. For recovery from the server; the usual way is the owner code in the app.
//   npm run make-owner -- 0661234567 [--revoke]
import { loadConfig } from '../server/config.js';
import { createServices } from '../server/services.js';
import { systemClock } from '../server/shared/clock.js';
import { openDatabase } from '../server/shared/db/database.js';
import { isMobilePhone, normalizePhone } from '../shared/phone.js';

const phone = normalizePhone(process.argv[2]);
const revoke = process.argv.includes('--revoke');
if (!isMobilePhone(phone)) {
  console.error('Usage: npm run make-owner -- 06XXXXXXXX [--revoke]');
  process.exit(1);
}

const config = loadConfig();
const db = openDatabase(config.databaseFile);
try {
  const user = createServices({ db, clock: systemClock, config }).accounts.setOwnerByPhone(phone, !revoke);
  console.log(revoke ? `✔ ${user.name} (${user.phone}) is no longer an owner.` : `✔ ${user.name} (${user.phone}) is now an owner.`);
} catch (error) {
  console.error(error.code === 'USER_NOT_FOUND' ? `No account uses ${phone}. Register it in the app first.` : error);
  process.exitCode = 1;
} finally {
  db.close();
}
