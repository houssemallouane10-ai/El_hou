import { DEFAULT_JOB_DURATION_DAYS } from '../../../shared/catalog.js';
import { addDays } from '../../shared/clock.js';
import { notFound, rateLimited } from '../../shared/errors.js';
import { pageOf } from '../../shared/paging.js';
import { readWilayaFilter, resolvePlace } from '../../shared/places.js';
import { OWNER_FILTERS, parseJobInput, parseJobQuery, parseStatusChange, toJobCard, toJobDetail, toOwnerJob } from './contracts.js';
import { JOB_STATE, jobState, planStatusChange, resolveSalary } from './model.js';
import { createJobsRepository } from './repository.js';

const MAX_NEW_JOBS_PER_DAY = 10;
const SIMILAR_LIMIT = 4;

// Counts at most one view per viewer per job every few hours. In-process and bounded: a restart
// or eviction can count a repeat view, which is acceptable for a popularity signal.
const createViewCounter = ({ windowMs = 6 * 60 * 60 * 1000, maxEntries = 50_000 } = {}) => {
  const seen = new Map();
  return {
    shouldCount(jobId, viewerKey) {
      const key = JSON.stringify([jobId, viewerKey]);
      const now = Date.now();
      const last = seen.get(key);
      if (last !== undefined && now - last < windowMs) return false;
      seen.delete(key);
      if (seen.size >= maxEntries) {
        const evictions = Math.ceil(maxEntries / 10);
        let removed = 0;
        for (const oldest of seen.keys()) {
          seen.delete(oldest);
          if (++removed >= evictions) break;
        }
      }
      seen.set(key, now);
      return true;
    },
  };
};

export const createJobsService = ({ db, clock, accounts, notifications }) => {
  const repository = createJobsRepository(db);
  const views = createViewCounter();
  const nowIso = () => clock.now().toISOString();

  const isPublic = (row, now) => jobState(row, now) === JOB_STATE.ACTIVE && !row.poster_banned;

  const findOwned = (userId, jobId, { isAdmin = false } = {}) => {
    const row = repository.findById(jobId);
    if (!row || (row.user_id !== userId && !isAdmin)) throw notFound('JOB_NOT_FOUND');
    return row;
  };

  // Subscribers follow categories in one wilaya or the whole country.
  const notifyAlertSubscribers = (row) => {
    const subscribers = accounts.alertSubscriberIds({ category: row.category, wilayaCode: row.wilaya_code, excludeUserId: row.user_id });
    notifications.notifyMany(subscribers, 'job.alert', {
      jobId: row.id,
      title: row.title,
      category: row.category,
      wilayaCode: row.wilaya_code,
      communeId: row.commune_id,
    });
  };

  // An offer always names its commune; the wilaya follows from it.
  const placeOf = ({ wilayaCode = null, communeId = null }) => resolvePlace({ wilayaCode, communeId }, { requireCommune: true });

  return {
    list(query, paging) {
      const now = nowIso();
      const filters = parseJobQuery(query);
      const since = filters.postedWithin ? addDays(clock.now(), -filters.postedWithin).toISOString() : null;
      const { rows, total } = repository.listPublic({ ...filters, since }, paging, now);
      return pageOf(rows.map((row) => toJobCard(row, now)), total, paging);
    },

    // Closed and expired offers stay readable so shared links keep working; hidden offers and
    // offers from banned accounts are only visible to their owner and to admins.
    get(id, { viewer = null, viewerKey = null } = {}) {
      const row = repository.findById(id);
      const now = nowIso();
      const isOwner = Boolean(viewer) && row?.user_id === viewer.id;
      if (!row || ((row.is_hidden || row.poster_banned) && !isOwner && !viewer?.isAdmin)) throw notFound('JOB_NOT_FOUND');
      if (!isOwner && viewerKey && isPublic(row, now) && views.shouldCount(row.id, viewerKey)) {
        repository.addView(row.id);
        row.views += 1;
      }
      return toJobDetail(row, now, { viewerId: viewer?.id ?? null });
    },

    similar(id) {
      const row = repository.findById(id);
      if (!row) return [];
      const now = nowIso();
      return repository.similar(row, now, SIMILAR_LIMIT).map((similar) => toJobCard(similar, now));
    },

    create(userId, input) {
      const data = parseJobInput(input);
      const salary = resolveSalary(data);
      const place = placeOf(data);
      const now = clock.now();
      if (repository.countCreatedSince(userId, addDays(now, -1).toISOString()) >= MAX_NEW_JOBS_PER_DAY) throw rateLimited();
      const row = db.transaction(() => {
        const inserted = repository.insert({
          ...data,
          ...salary,
          ...place,
          userId,
          isUrgent: data.isUrgent ?? false,
          now: now.toISOString(),
          expiresAt: addDays(now, data.durationDays ?? DEFAULT_JOB_DURATION_DAYS).toISOString(),
        });
        notifyAlertSubscribers(inserted);
        return inserted;
      })();
      return toJobDetail(row, now.toISOString(), { viewerId: userId });
    },

    update(userId, id, input) {
      const current = findOwned(userId, id);
      const changes = parseJobInput(input, { partial: true });
      const salary = resolveSalary({
        salaryPeriod: changes.salaryPeriod ?? current.salary_period,
        salaryMin: changes.salaryMin !== undefined ? changes.salaryMin : current.salary_min,
        salaryMax: changes.salaryMax !== undefined ? changes.salaryMax : current.salary_max,
      });
      const placeChanged = changes.communeId !== undefined || changes.wilayaCode !== undefined;
      const place = placeChanged ? placeOf({ wilayaCode: changes.wilayaCode, communeId: changes.communeId ?? current.commune_id }) : {};
      const row = db.transaction(() => repository.update(id, { ...changes, ...salary, ...place }, nowIso()))();
      return toJobDetail(row, nowIso(), { viewerId: userId });
    },

    changeStatus(userId, id, input) {
      const current = findOwned(userId, id);
      const { action, durationDays } = parseStatusChange(input);
      const now = clock.now();
      const plan = planStatusChange(current, action, { now, durationDays: durationDays ?? DEFAULT_JOB_DURATION_DAYS });
      repository.setStatus(id, plan, now.toISOString());
      return toJobDetail(repository.findById(id), now.toISOString(), { viewerId: userId });
    },

    remove(userId, id, { isAdmin = false } = {}) {
      findOwned(userId, id, { isAdmin });
      repository.remove(id);
    },

    listOwned(userId, query, paging) {
      const state = OWNER_FILTERS.has(query.state) ? query.state : 'all';
      const now = nowIso();
      const { rows, total } = repository.listByOwner(userId, state, paging, now);
      return pageOf(rows.map((row) => toOwnerJob(row, now)), total, paging);
    },

    // Public cards for the given ids, in the given order, skipping offers nobody else may see.
    publicCardsByIds(ids) {
      const now = nowIso();
      const rows = new Map(repository.findManyByIds([...new Set(ids)]).map((row) => [row.id, row]));
      return ids.map((id) => rows.get(id)).filter((row) => row && !row.is_hidden && !row.poster_banned).map((row) => toJobCard(row, now));
    },

    // The facts other domains need about one offer, without exposing the row.
    describe(id) {
      const row = repository.findById(id);
      if (!row) return null;
      return {
        id: row.id,
        ownerId: row.user_id,
        title: row.title,
        state: jobState(row, nowIso()),
        isVisible: !row.is_hidden && !row.poster_banned,
      };
    },

    ownedDescription(userId, id, { isAdmin = false } = {}) {
      const row = findOwned(userId, id, { isAdmin });
      return { id: row.id, ownerId: row.user_id, title: row.title, state: jobState(row, nowIso()) };
    },

    hasActiveJobs: (userId) => repository.hasActive(userId, nowIso()),

    // Live offers per category, in one wilaya or (null) the whole country.
    categoryCounts: (wilayaCode = null) => repository.categoryCounts(nowIso(), wilayaCode),

    // Live offers per wilaya code, for the region picker and the admin dashboard.
    countsByWilaya: () => Object.fromEntries(repository.countsByWilaya(nowIso()).map((row) => [row.wilayaCode, row.total])),

    indexMissingSearchText: () => repository.indexMissingSearchText(),

    stats() {
      const row = repository.stats(nowIso(), addDays(clock.now(), -7).toISOString());
      return { total: row.total ?? 0, active: row.active ?? 0, newJobs: row.newJobs ?? 0, hidden: row.hidden ?? 0, views: row.views ?? 0 };
    },

    sitemapEntries: (limit = 5000) => repository.sitemapEntries(nowIso(), limit),

    // Summary for link previews; only offers anyone may open are described.
    shareSummary(id) {
      const row = repository.findById(id);
      if (!row || row.is_hidden || row.poster_banned) return null;
      return toJobDetail(row, nowIso());
    },

    adminList(query, paging) {
      const now = nowIso();
      const { rows, total } = repository.listForAdmin({ q: query.q, state: query.state, wilayaCode: readWilayaFilter(query.wilaya) }, paging, now);
      return pageOf(rows.map((row) => ({ ...toOwnerJob(row, now), isHidden: Boolean(row.is_hidden) })), total, paging);
    },

    adminSetHidden(id, isHidden) {
      const row = repository.findById(id);
      if (!row) throw notFound('JOB_NOT_FOUND');
      if (Boolean(row.is_hidden) === isHidden) return { changed: false, job: describeRow(row, nowIso()) };
      repository.setHidden(id, isHidden, nowIso());
      return { changed: true, job: describeRow(repository.findById(id), nowIso()) };
    },

    adminSetFeatured(id, isFeatured) {
      if (!repository.findById(id)) throw notFound('JOB_NOT_FOUND');
      repository.setFeatured(id, isFeatured, nowIso());
      return describeRow(repository.findById(id), nowIso());
    },
  };
};

const describeRow = (row, now) => ({
  id: row.id,
  ownerId: row.user_id,
  title: row.title,
  state: jobState(row, now),
  isFeatured: Boolean(row.is_featured),
  isHidden: Boolean(row.is_hidden),
});
