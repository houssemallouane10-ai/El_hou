import path from 'node:path';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createServices, runMaintenance } from './services.js';
import { systemClock } from './shared/clock.js';
import { createBackups } from './shared/db/backups.js';
import { openDatabase } from './shared/db/database.js';
import { startupWarnings } from './startup-checks.js';

const MAINTENANCE_INTERVAL_MS = 60 * 60 * 1000;

const config = loadConfig();
const db = openDatabase(config.databaseFile);
const services = createServices({ db, clock: systemClock, config });
const app = createApp({ config, services });

const backups = config.databaseFile === ':memory:' || config.backupDays === 0
  ? null
  : createBackups({ db, dir: path.join(path.dirname(config.databaseFile), 'backups'), clock: systemClock, keep: config.backupDays });

// The pending backup is awaited on shutdown so the database is never closed in the middle of it.
let pendingBackup = null;
const maintain = () => {
  runMaintenance(services);
  if (!backups || pendingBackup) return;
  pendingBackup = backups.runDaily()
    .catch((error) => console.error('Backup failed:', error))
    .finally(() => {
      pendingBackup = null;
    });
};
maintain();
const maintenance = setInterval(maintain, MAINTENANCE_INTERVAL_MS);
maintenance.unref();

const server = app.listen(config.port, config.host, () => {
  console.log(`خدمتي يعمل على http://localhost:${config.port} (${config.env})`);
  for (const warning of startupWarnings({ config, services })) console.warn(`⚠ ${warning}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  clearInterval(maintenance);
  server.close(async () => {
    await pendingBackup;
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
