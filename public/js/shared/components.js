import { whatsappLink } from '/shared/phone.js';
import { html } from './html.js';
import { t } from './i18n.js';
import { icon } from './icons.js';
import {
  categoryIcon,
  categoryLabel,
  initials,
  jobTypeLabel,
  salaryText,
  timeAgo,
} from './format.js';
import { placeLabel } from './places.js';
import { errorMessage } from './ui.js';

// ---------- People ----------

export const displayName = (person) => person?.companyName || person?.name || '';

export const avatar = (person, size = 'md') => html`
  <span class="avatar avatar-${size} c${Math.abs(Number(person?.id) || 0) % 8}" aria-hidden="true">${initials(displayName(person)) || '؟'}</span>
`;

export const verifiedMark = (person) => (person?.isVerified
  ? html`<span class="verified" title="${t('common.verified')}">${icon('badge-check')}<span class="sr-only">${t('common.verified')}</span></span>`
  : null);

// ---------- Page chrome ----------

const brandMark = () => html`
  <a class="brand" href="/" aria-label="${t('common.appName')}">
    <img class="brand-logo" src="/icons/logo.svg" alt="" width="36" height="36">
    <span class="brand-text">
      <span class="brand-name">${t('common.appName')}</span>
      <span class="brand-city">${t('common.country')}</span>
    </span>
  </a>
`;

// The browsing region: a wilaya or the whole country. Opens the region picker.
export const regionButton = (wilayaCode, { compact = false } = {}) => html`
  <button class="region-btn ${compact ? 'region-btn-compact' : ''}" type="button" data-action="region" aria-haspopup="dialog"
    aria-label="${t('places.regionLabel', { region: wilayaCode ? placeLabel({ wilayaCode }) : t('places.allWilayas') })}">
    ${icon('map-pin')}<span class="region-btn-text">${wilayaCode ? placeLabel({ wilayaCode }) : t('places.allWilayas')}</span>${icon('chevron-down')}
  </button>
`;

export const inboxActions = (user) => (user
  ? html`
    <a class="icon-btn" href="/messages" aria-label="${t('nav.messages')}">${icon('message-circle')}<span class="count" data-badge="messages" hidden></span></a>
    <a class="icon-btn" href="/notifications" aria-label="${t('nav.notifications')}">${icon('bell')}<span class="count" data-badge="notifications" hidden></span></a>
  `
  : html`<a class="btn btn-sm btn-secondary" href="/login">${t('auth.login')}</a>`);

export const appBar = ({ title = '', subtitle = null, back = false, backTo = '/', actions = null, brand = false }) => html`
  <header class="appbar">
    <div class="appbar-inner">
      ${back ? html`<button class="icon-btn" type="button" data-action="back" data-fallback="${backTo}" aria-label="${t('common.back')}">${icon('arrow-left', 'flip-rtl')}</button>` : null}
      ${brand
        ? brandMark()
        : html`<div class="appbar-titles"><h1 class="appbar-title">${title}</h1>${subtitle ? html`<p class="appbar-sub">${subtitle}</p>` : null}</div>`}
      <div class="appbar-actions">${actions}</div>
    </div>
  </header>
`;

export const sectionHead = (title, link = null) => html`
  <div class="section-head">
    <h2 class="section-title">${title}</h2>
    ${link ? html`<a class="section-link" href="${link.href}">${link.label}${icon('chevron-right', 'flip-rtl')}</a>` : null}
  </div>
`;

// ---------- Status ----------

const JOB_STATE_BADGES = {
  active: 'badge-success',
  closed: 'badge-muted',
  expired: 'badge-warning',
  hidden: 'badge-danger',
};

export const jobStateBadge = (state) => html`<span class="badge ${JOB_STATE_BADGES[state] ?? 'badge-muted'}">${t(`jobs.state.${state}`)}</span>`;

const APPLICATION_BADGES = {
  pending: 'badge-info',
  shortlisted: 'badge-featured',
  accepted: 'badge-success',
  rejected: 'badge-muted',
};

export const applicationBadge = (status) => html`<span class="badge ${APPLICATION_BADGES[status] ?? 'badge-muted'}">${t(`applications.status.${status}`)}</span>`;

// ---------- Cards ----------

export const saveButton = (kind, id, saved) => html`
  <button class="icon-btn save-btn ${saved ? 'is-saved' : ''}" type="button" data-save="${kind}" data-id="${id}"
    aria-pressed="${saved ? 'true' : 'false'}" aria-label="${saved ? t('common.unsave') : t('common.save')}">
    ${icon(saved ? 'bookmark-check' : 'bookmark')}
  </button>
`;

export const jobCard = (job, { saved = false, showSave = true } = {}) => html`
  <article class="card job-card ${job.isFeatured ? 'is-featured' : ''}">
    <div class="job-card-top">
      <span class="cat-icon" aria-hidden="true">${icon(categoryIcon(job.category))}</span>
      <div class="job-card-titles">
        <h3 class="job-card-title"><a class="stretched" href="/jobs/${job.id}">${job.title}</a></h3>
        <p class="job-card-poster">${displayName(job.poster)}${verifiedMark(job.poster)}</p>
      </div>
      ${showSave ? saveButton('job', job.id, saved) : null}
    </div>
    <div class="tags">
      ${job.isUrgent ? html`<span class="badge badge-urgent">${icon('zap')}${t('jobs.urgent')}</span>` : null}
      ${job.isFeatured ? html`<span class="badge badge-featured">${icon('star')}${t('jobs.featured')}</span>` : null}
      ${job.state && job.state !== 'active' ? jobStateBadge(job.state) : null}
      <span class="tag">${icon('map-pin')}${placeLabel(job)}</span>
      <span class="tag">${icon('clock')}${jobTypeLabel(job.jobType)}</span>
    </div>
    <div class="job-card-foot">
      <span class="salary">${icon('banknote')}${salaryText(job.salary)}</span>
      <time class="muted text-sm" datetime="${job.publishedAt}">${timeAgo(job.publishedAt)}</time>
    </div>
  </article>
`;

export const workerCard = (worker, { saved = false, showSave = true } = {}) => html`
  <article class="card worker-card">
    <div class="worker-card-top">
      ${avatar(worker, 'lg')}
      <div class="worker-card-titles">
        <h3 class="worker-card-name"><a class="stretched" href="/u/${worker.id}">${worker.name}</a>${verifiedMark(worker)}</h3>
        <p class="worker-card-headline">${worker.headline || categoryLabel(worker.category)}</p>
      </div>
      ${showSave ? saveButton('worker', worker.id, saved) : null}
    </div>
    <div class="tags">
      <span class="badge ${worker.isAvailable ? 'badge-success' : 'badge-muted'}">${worker.isAvailable ? t('workers.available') : t('workers.unavailable')}</span>
      ${worker.category ? html`<span class="tag">${icon(categoryIcon(worker.category))}${categoryLabel(worker.category)}</span>` : null}
      <span class="tag">${icon('map-pin')}${placeLabel(worker)}</span>
      ${worker.experienceYears ? html`<span class="tag">${icon('award')}${t('workers.experience', { count: worker.experienceYears })}</span>` : null}
    </div>
    ${worker.skills?.length ? html`<div class="chips">${worker.skills.map((skill) => html`<span class="chip chip-sm">${skill}</span>`)}</div>` : null}
  </article>
`;

// ---------- Contact ----------

export const contactActions = ({ phone = null, whatsapp = null, whatsappText = '' }) => html`
  ${whatsapp ? html`<a class="btn btn-whatsapp" href="${whatsappLink(whatsapp, whatsappText)}" target="_blank" rel="noopener" data-external>${icon('whatsapp')}<span>${t('common.whatsapp')}</span></a>` : null}
  ${phone ? html`<a class="btn btn-secondary" href="tel:${phone}" data-external>${icon('phone')}<span>${t('common.call')}</span></a>` : null}
`;

// ---------- Placeholders ----------

export const emptyState = ({ icon: name = 'inbox', title, text = null, action = null }) => html`
  <div class="empty">
    <span class="empty-icon" aria-hidden="true">${icon(name)}</span>
    <h3 class="empty-title">${title}</h3>
    ${text ? html`<p class="empty-text">${text}</p>` : null}
    ${action}
  </div>
`;

export const errorState = (error) => emptyState({
  icon: error?.code === 'OFFLINE' || error?.code === 'NETWORK' ? 'wifi-off' : 'triangle-alert',
  title: errorMessage(error),
  action: html`<button class="btn btn-secondary" type="button" data-action="retry">${icon('refresh-cw')}${t('common.retry')}</button>`,
});

export const skeletonCards = (count = 4) => html`
  <div class="card-list" aria-busy="true" aria-label="${t('common.loading')}">
    ${Array.from({ length: count }, () => html`
      <div class="card skeleton-card">
        <div class="skeleton skeleton-circle"></div>
        <div class="skeleton-lines">
          <div class="skeleton skeleton-line w-70"></div>
          <div class="skeleton skeleton-line w-40"></div>
          <div class="skeleton skeleton-line w-90"></div>
        </div>
      </div>
    `)}
  </div>
`;

export const loadMore = (hasMore) => (hasMore
  ? html`<div class="load-more"><button class="btn btn-secondary" type="button" data-action="more">${t('common.loadMore')}</button></div>`
  : null);
