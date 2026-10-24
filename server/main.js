import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createServices, runMaintenance } from './services.js';
import { systemClock } from './shared/clock.js';
import { openDatabase } from './shared/db/database.js';

const MAINTENANCE_INTERVAL_MS = 60 * 60 * 1000;

const config = loadConfig();
const db = openDatabase(config.databaseFile);
const services = createServices({ db, clock: systemClock, config });
const app = createApp({ config, services });

runMaintenance(services);
const maintenance = setInterval(() => runMaintenance(services), MAINTENANCE_INTERVAL_MS);
maintenance.unref();

const server = app.listen(config.port, config.host, () => {
  console.log(`خدمتي يعمل على http://localhost:${config.port} (${config.env})`);
  if (config.adminPhones.length === 0) console.log('Tip: set ADMIN_PHONES=06XXXXXXXX to make your account an admin.');
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  clearInterval(maintenance);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
