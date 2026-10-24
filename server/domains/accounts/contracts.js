import { CATEGORY_IDS, LOCATION_IDS, ROLE_IDS } from '../../../shared/catalog.js';
import { LIMITS } from '../../../shared/limits.js';
import { parseJsonArray } from '../../shared/db/database.js';
import { createValidator } from '../../shared/validation.js';

export const parseRegistration = (input) => createValidator(input)
  .text('name', { required: true, ...LIMITS.name })
  .phone('phone', { required: true, mobileOnly: true })
  .secret('password', LIMITS.password)
  .oneOf('role', ROLE_IDS, { required: true })
  .result();

export const parseLogin = (input) => createValidator(input)
  .phone('phone', { required: true, mobileOnly: true })
  .secret('password', { max: LIMITS.password.max })
  .result();

export const parsePasswordChange = (input) => createValidator(input)
  .secret('currentPassword', { max: LIMITS.password.max })
  .secret('newPassword', LIMITS.password)
  .result();

export const parsePasswordConfirmation = (input) => createValidator(input)
  .secret('password', { max: LIMITS.password.max })
  .result();

export const parseProfileUpdate = (input) => createValidator(input, { partial: true })
  .text('name', { required: true, ...LIMITS.name })
  .oneOf('role', ROLE_IDS, { required: true })
  .text('companyName', LIMITS.companyName)
  .text('headline', LIMITS.headline)
  .text('bio', { ...LIMITS.bio, multiline: true })
  .oneOf('category', CATEGORY_IDS)
  .integer('experienceYears', LIMITS.experienceYears)
  .list('skills', LIMITS.skills)
  .oneOf('location', LOCATION_IDS, { required: true })
  .phone('whatsapp', { mobileOnly: true })
  .text('expectedPay', LIMITS.expectedPay)
  .boolean('isListed')
  .boolean('isAvailable')
  .result();

export const parseAlertSettings = (input) => createValidator(input)
  .list('categories', { maxItems: LIMITS.alertCategories.maxItems, allowed: CATEGORY_IDS })
  .result();

export const parseDirectoryQuery = (query) => ({
  q: typeof query.q === 'string' ? query.q.slice(0, LIMITS.searchQuery.max) : '',
  category: CATEGORY_IDS.has(query.category) ? query.category : null,
  location: LOCATION_IDS.has(query.location) ? query.location : null,
  availableOnly: query.available === '1' || query.available === 'true',
});

export const toSelfView = (user) => ({
  id: user.id,
  name: user.name,
  phone: user.phone,
  role: user.role,
  isAdmin: Boolean(user.is_admin),
  isVerified: Boolean(user.is_verified),
  companyName: user.company_name,
  headline: user.headline,
  bio: user.bio,
  category: user.category,
  experienceYears: user.experience_years,
  skills: parseJsonArray(user.skills),
  location: user.location,
  whatsapp: user.whatsapp,
  expectedPay: user.expected_pay,
  isListed: Boolean(user.is_listed),
  isAvailable: Boolean(user.is_available),
  alertCategories: parseJsonArray(user.alert_categories),
  createdAt: user.created_at,
});

export const toCardView = (user) => ({
  id: user.id,
  name: user.name,
  role: user.role,
  isVerified: Boolean(user.is_verified),
  companyName: user.company_name,
  headline: user.headline,
  category: user.category,
  experienceYears: user.experience_years,
  location: user.location,
  expectedPay: user.expected_pay,
  isAvailable: Boolean(user.is_available),
  skills: parseJsonArray(user.skills).slice(0, 4),
  lastSeenAt: user.last_seen_at,
});

export const toProfileView = (user, { includeContact }) => ({
  ...toCardView(user),
  bio: user.bio,
  skills: parseJsonArray(user.skills),
  isListed: Boolean(user.is_listed),
  createdAt: user.created_at,
  contact: includeContact ? { phone: user.phone, whatsapp: user.whatsapp || user.phone } : null,
});

export const toAdminView = (user) => ({
  ...toCardView(user),
  phone: user.phone,
  isAdmin: Boolean(user.is_admin),
  isBanned: Boolean(user.is_banned),
  isListed: Boolean(user.is_listed),
  createdAt: user.created_at,
});
