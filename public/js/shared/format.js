import { CATEGORIES, JOB_TYPES, SALARY_PERIODS, findById } from '/shared/catalog.js';
import { getLocale, label, t } from './i18n.js';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const formatNumber = (value) => new Intl.NumberFormat(getLocale()).format(value);

export const salaryText = (salary) => {
  if (!salary || salary.period === 'negotiable' || (salary.min == null && salary.max == null)) return t('salary.negotiable');
  const { min, max } = salary;
  const amount = min != null && max != null && min !== max
    ? `${formatNumber(min)} – ${formatNumber(max)}`
    : formatNumber(min ?? max);
  return `${amount} ${t('common.currency')} ${label(findById(SALARY_PERIODS, salary.period))}`.trim();
};

export const timeAgo = (iso) => {
  const seconds = Math.round((Date.parse(iso) - Date.now()) / 1000);
  const absolute = Math.abs(seconds);
  if (absolute < 45) return t('time.justNow');
  const format = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });
  if (absolute < HOUR) return format.format(Math.round(seconds / MINUTE), 'minute');
  if (absolute < DAY) return format.format(Math.round(seconds / HOUR), 'hour');
  if (absolute < 30 * DAY) return format.format(Math.round(seconds / DAY), 'day');
  if (absolute < 365 * DAY) return format.format(Math.round(seconds / (30 * DAY)), 'month');
  return format.format(Math.round(seconds / (365 * DAY)), 'year');
};

export const formatDate = (iso, options = { day: 'numeric', month: 'long', year: 'numeric' }) => new Intl.DateTimeFormat(getLocale(), options).format(new Date(iso));

export const formatTime = (iso) => new Intl.DateTimeFormat(getLocale(), { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export const daysUntil = (iso) => Math.ceil((Date.parse(iso) - Date.now()) / (DAY * 1000));

export const categoryLabel = (id) => label(findById(CATEGORIES, id));
export const categoryIcon = (id) => findById(CATEGORIES, id)?.icon ?? 'layout-grid';
export const jobTypeLabel = (id) => label(findById(JOB_TYPES, id));

export const initials = (name) => String(name ?? '')
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part.charAt(0))
  .join('')
  .toUpperCase();
