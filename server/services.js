import { createAccountsService } from './domains/accounts/index.js';
import { createApplicationsService } from './domains/applications/index.js';
import { createBookmarksService } from './domains/bookmarks/index.js';
import { createJobsService } from './domains/jobs/index.js';
import { createMessagingService } from './domains/messaging/index.js';
import { createModerationService } from './domains/moderation/index.js';
import { createNotificationsService } from './domains/notifications/index.js';

// Composition root for the domain services. Dependencies point one way:
// accounts, notifications <- jobs <- applications, bookmarks, messaging <- moderation.
export const createServices = ({ db, clock, config }) => {
  const accounts = createAccountsService({ db, clock, config });
  const notifications = createNotificationsService({ db, clock });
  const jobs = createJobsService({ db, clock, accounts, notifications });
  const applications = createApplicationsService({ db, clock, jobs, accounts, notifications });
  const bookmarks = createBookmarksService({ db, clock, jobs, accounts });
  const messaging = createMessagingService({ db, clock, accounts, jobs });
  const moderation = createModerationService({ db, clock, accounts, jobs, applications, messaging, notifications });
  return { accounts, notifications, jobs, applications, bookmarks, messaging, moderation };
};

// Fills search text for rows migrated without it, a batch at a time until none are left.
const indexAll = (indexBatch) => {
  let total = 0;
  for (let indexed = indexBatch(); indexed > 0; indexed = indexBatch()) total += indexed;
  return total;
};

// Housekeeping that keeps tables bounded and indexes complete; safe to run at any time and on
// every instance.
export const runMaintenance = (services) => ({
  expiredSessions: services.accounts.purgeExpiredSessions(),
  oldNotifications: services.notifications.pruneOld(),
  indexedUsers: indexAll(services.accounts.indexMissingSearchText),
  indexedJobs: indexAll(services.jobs.indexMissingSearchText),
});
