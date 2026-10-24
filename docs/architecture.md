# Architecture notes

خدمتي is a modular monolith: one Node.js process serves the JSON API, the app shell and the
static PWA. One SQLite database (WAL mode) is the system of record.

## Domains and ownership

| Domain | Owns (authoritative writes) | Public entry | Depends on |
| --- | --- | --- | --- |
| `accounts` | `users`, `sessions` — registration, login, profiles, worker directory, admin flags | `server/domains/accounts/index.js` | — |
| `notifications` | `notifications` — in-app notices and job-alert fan-out | `server/domains/notifications/index.js` | — |
| `jobs` | `jobs` — offers and their lifecycle (active → closed / expired, renew, moderation hide) | `server/domains/jobs/index.js` | accounts, notifications |
| `applications` | `applications` — apply, withdraw, employer decisions | `server/domains/applications/index.js` | jobs, accounts, notifications |
| `bookmarks` | `saved_jobs`, `saved_workers` | `server/domains/bookmarks/index.js` | jobs, accounts |
| `messaging` | `conversations`, `messages` — one conversation per pair of people | `server/domains/messaging/index.js` | accounts, jobs |
| `moderation` | `reports` — reports and the admin console | `server/domains/moderation/index.js` | accounts, jobs, applications, messaging, notifications |

Rules:

- Each table has exactly one writing domain. Other domains call its service.
- Repositories may join another domain's table **read-only** for display and visibility
  (poster names on job cards, applicant details for the employer, banned-account filtering).
- Routes are thin: parse ids, call one service, shape the HTTP response. Business failures are
  `DomainError`s (`server/shared/errors.js`); `server/shared/http/errors.js` maps them to statuses.
- Composition happens in `server/services.js` (services) and `server/api/router.js` (routes,
  rate limits, session cookie, composite endpoints `/api/session`, `/api/me/summary`, `/api/meta`).

Shared, browser-safe contracts live in `shared/` (catalog of categories, communes and job types,
field limits, Algerian phone rules) and are imported by both the server and the browser.

## Key decisions

| Decision | Why | Revisit when |
| --- | --- | --- |
| SQLite + better-sqlite3 | Zero-ops, fast, one file to back up; plenty for a city-scale board | Several app instances are needed (move to Postgres) |
| No front-end build step (native ES modules) | Nothing to compile on deploy; easy to edit | Bundle size or module count becomes a measured problem |
| Derived job state (`jobState`) | Expiry needs no cron job and can never go stale | — |
| Notifications store type + data, not text | The browser renders them in Arabic or French | — |
| In-process rate limits and view de-duplication | Single instance; no extra infrastructure | Scaling out (use a shared store) |
| Server-rendered meta in the shell | WhatsApp/Facebook previews for shared job links | — |
| Service worker version = hash of assets | Every deploy that changes a file prompts an update | — |

## Verified workflows

Checked on 2026-10-24 against the current tree.

| Workflow | Evidence | Status |
| --- | --- | --- |
| Register, login, logout, session renewal, password change, account deletion | `test/accounts.test.js` | verified |
| Publish, search (Arabic folding, French labels), filter, view counting, edit, close, reopen, expire, renew, delete | `test/jobs.test.js` | verified |
| Apply, duplicate/own/closed guards, employer review, decisions and notifications, withdraw | `test/applications.test.js` | verified |
| Conversations, unread counts, read receipts, privacy, banned recipients | `test/messaging.test.js` | verified |
| Reports, hide/feature offers, ban/unban, verify, temporary passwords, admin-only access | `test/moderation.test.js` | verified |
| Security headers, cross-site write rejection, JSON-only bodies, login rate limit, bookmarks, shell, sitemap, service worker | `test/platform.test.js` | verified |
| Browser flows (apply, save, message, accept, publish with Arabic-Indic digits, validation, admin, FR/dark, desktop) | Playwright run against a seeded database | verified |
| Offline: precache, cached listings and offer pages, offline message for unvisited data | Playwright with service worker enabled | verified |
| Docker image build | Not run: no Docker daemon in the build environment; `npm ci --omit=dev` from the lockfile verified | unverified |

## Known limits

- Phone numbers are not verified by SMS; moderators reset forgotten passwords.
- Notifications reach users while the app is open (polling every 30 s); there is no push yet.
- Rate limits and view de-duplication are per process.
