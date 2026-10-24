import {
  CATEGORY_IDS,
  JOB_DURATIONS_DAYS,
  JOB_TYPE_IDS,
  LOCATION_IDS,
  SALARY_PERIOD_IDS,
} from '../../../shared/catalog.js';
import { LIMITS } from '../../../shared/limits.js';
import { createValidator, parseId } from '../../shared/validation.js';
import { JOB_ACTIONS, jobState } from './model.js';

const DURATION_IDS = new Set(JOB_DURATIONS_DAYS);
const SORTS = new Set(['recent', 'urgent', 'popular']);
const POSTED_WITHIN_DAYS = new Set([1, 3, 7, 30]);
export const OWNER_FILTERS = new Set(['all', 'active', 'closed', 'expired', 'hidden']);

export const parseJobInput = (input, { partial = false } = {}) => createValidator(input, { partial })
  .text('title', { required: true, ...LIMITS.jobTitle })
  .oneOf('category', CATEGORY_IDS, { required: true })
  .oneOf('jobType', JOB_TYPE_IDS, { required: true })
  .oneOf('location', LOCATION_IDS, { required: true })
  .text('address', LIMITS.address)
  .text('description', { required: true, ...LIMITS.jobDescription, multiline: true })
  .text('requirements', { ...LIMITS.jobRequirements, multiline: true })
  .oneOf('salaryPeriod', SALARY_PERIOD_IDS, { required: true })
  .integer('salaryMin', LIMITS.salary)
  .integer('salaryMax', LIMITS.salary)
  .integer('positions', { required: true, ...LIMITS.positions })
  .phone('contactPhone', { required: true })
  .phone('contactWhatsapp', { mobileOnly: true })
  .boolean('isUrgent')
  .oneOf('durationDays', DURATION_IDS)
  .result();

export const parseStatusChange = (input) => createValidator(input)
  .oneOf('action', JOB_ACTIONS, { required: true })
  .oneOf('durationDays', DURATION_IDS)
  .result();

export const parseJobQuery = (query) => {
  const postedWithin = Number(query.postedWithin);
  return {
    q: typeof query.q === 'string' ? query.q.slice(0, LIMITS.searchQuery.max) : '',
    category: CATEGORY_IDS.has(query.category) ? query.category : null,
    jobType: JOB_TYPE_IDS.has(query.jobType) ? query.jobType : null,
    location: LOCATION_IDS.has(query.location) ? query.location : null,
    urgentOnly: query.urgent === '1' || query.urgent === 'true',
    withSalary: query.withSalary === '1' || query.withSalary === 'true',
    postedWithin: POSTED_WITHIN_DAYS.has(postedWithin) ? postedWithin : null,
    posterId: parseId(query.poster),
    sort: SORTS.has(query.sort) ? query.sort : 'recent',
  };
};

const posterOf = (row) => ({
  id: row.user_id,
  name: row.poster_name,
  companyName: row.poster_company,
  isVerified: Boolean(row.poster_verified),
  memberSince: row.poster_created_at,
});

export const toJobCard = (row, nowIso) => ({
  id: row.id,
  title: row.title,
  category: row.category,
  jobType: row.job_type,
  location: row.location,
  salary: { min: row.salary_min, max: row.salary_max, period: row.salary_period },
  positions: row.positions,
  isUrgent: Boolean(row.is_urgent),
  isFeatured: Boolean(row.is_featured),
  state: jobState(row, nowIso),
  publishedAt: row.published_at,
  expiresAt: row.expires_at,
  poster: posterOf(row),
});

export const toJobDetail = (row, nowIso, { viewerId = null } = {}) => ({
  ...toJobCard(row, nowIso),
  address: row.address,
  description: row.description,
  requirements: row.requirements,
  contact: { phone: row.contact_phone, whatsapp: row.contact_whatsapp },
  views: row.views,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  isOwner: viewerId === row.user_id,
});

export const toOwnerJob = (row, nowIso) => ({
  ...toJobCard(row, nowIso),
  views: row.views,
  createdAt: row.created_at,
});
