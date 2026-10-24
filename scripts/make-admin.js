// Grants admin rights to an existing account: npm run make-admin -- 0661234567
import { loadConfig } from '../server/config.js';
import { createServices } from '../server/services.js';
import { systemClock } from '../server/shared/clock.js';
import { openDatabase } from '../server/shared/db/database.js';
import { isMobilePhone, normalizePhone } from '../shared/phone.js';

const phone = normalizePhone(process.argv[2]);
if (!isMobilePhone(phone)) {
  console.error('Usage: npm run make-admin -- 06XXXXXXXX');
  process.exit(1);
}

const config = loadConfig();
const db = openDatabase(config.databaseFile);
try {
  const user = createServices({ db, clock: systemClock, config }).accounts.grantAdminByPhone(phone);
  console.log(`✔ ${user.name} (${user.phone}) is now an admin.`);
} catch (error) {
  console.error(error.code === 'USER_NOT_FOUND' ? `No account uses ${phone}. Register it in the app first.` : error);
  process.exitCode = 1;
} finally {
  db.close();
}
