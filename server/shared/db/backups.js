import fs from 'node:fs';
import path from 'node:path';

const FILE_PATTERN = /^khedmati-\d{4}-\d{2}-\d{2}\.db$/;

// One consistent copy of the database per day in `dir` (SQLite's online backup, safe while the
// app runs), keeping the newest `keep` copies. Restore by stopping the app and copying a file over
// the database (removing its -wal and -shm files).
export const createBackups = ({ db, dir, clock, keep }) => {
  const fileFor = (day) => path.join(dir, `khedmati-${day}.db`);

  const prune = () => {
    const copies = fs.readdirSync(dir).filter((name) => FILE_PATTERN.test(name)).sort();
    for (const name of copies.slice(0, Math.max(0, copies.length - keep))) fs.rmSync(path.join(dir, name));
  };

  return {
    // Writes today's copy unless it exists. Resolves to the new file, or null when nothing was due.
    async runDaily() {
      const target = fileFor(clock.now().toISOString().slice(0, 10));
      if (fs.existsSync(target)) return null;
      fs.mkdirSync(dir, { recursive: true });
      const partial = `${target}.partial`;
      await db.backup(partial);
      fs.renameSync(partial, target);
      prune();
      return target;
    },
  };
};
