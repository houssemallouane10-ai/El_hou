import { store } from '../../app/store.js';
import { api, isAbort } from '../../shared/api.js';
import {
  appBar,
  avatar,
  contactActions,
  emptyState,
  errorState,
  jobCard,
  saveButton,
  sectionHead,
  verifiedMark,
} from '../../shared/components.js';
import { categoryIcon, categoryLabel, formatDate, locationLabel, timeAgo } from '../../shared/format.js';
import { $, html, on, render } from '../../shared/html.js';
import { t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';
import { shareLink } from '../../shared/ui.js';
import { startConversation } from '../messages/start-conversation.js';
import { openReportSheet } from '../moderation/report-sheet.js';

const ACTIVE_WINDOW_MS = 10 * 60 * 1000;

const lastSeenText = (iso) => {
  if (!iso) return null;
  return Date.now() - Date.parse(iso) < ACTIVE_WINDOW_MS ? t('profile.activeNow') : t('profile.lastSeen', { time: timeAgo(iso) });
};

const profileMarkup = (user, jobs, isSelf) => html`
  <section class="card profile-head">
    ${avatar(user, 'xl')}
    <h1 class="profile-name">${user.name}${verifiedMark(user)}</h1>
    ${user.companyName ? html`<p class="profile-company">${icon('building-2')}${user.companyName}</p>` : null}
    ${user.headline ? html`<p class="profile-headline">${user.headline}</p>` : null}
    <div class="tags tags-center">
      ${user.isListed ? html`<span class="badge ${user.isAvailable ? 'badge-success' : 'badge-muted'}">${user.isAvailable ? t('workers.available') : t('workers.unavailable')}</span>` : null}
      <span class="tag">${icon('map-pin')}${locationLabel(user.location)}</span>
      ${lastSeenText(user.lastSeenAt) ? html`<span class="tag">${icon('clock')}${lastSeenText(user.lastSeenAt)}</span>` : null}
    </div>
    ${isSelf ? html`
      <div class="profile-actions">
        <a class="btn btn-primary" href="/me/edit">${icon('pencil')}${t('profile.edit')}</a>
      </div>
    ` : html`
      <div class="profile-actions">
        ${user.contact ? contactActions({ phone: user.contact.phone, whatsapp: user.contact.whatsapp, whatsappText: t('profile.whatsappMessage', { name: user.name }) }) : null}
        <button class="btn btn-secondary" type="button" data-action="message">${icon('message-circle')}${t('common.message')}</button>
      </div>
    `}
  </section>

  ${user.bio ? html`
    <section class="card card-pad">
      <h2 class="card-title">${t('profile.about')}</h2>
      <p class="prose">${user.bio}</p>
    </section>
  ` : null}

  ${user.category || user.experienceYears || user.expectedPay ? html`
    <section class="card card-pad">
      <h2 class="card-title">${t('profile.work')}</h2>
      <dl class="facts">
        ${user.category ? html`<div><dt>${icon(categoryIcon(user.category))}${t('profile.field')}</dt><dd>${categoryLabel(user.category)}</dd></div>` : null}
        ${user.experienceYears ? html`<div><dt>${icon('award')}${t('profile.experience')}</dt><dd>${t('workers.experience', { count: user.experienceYears })}</dd></div>` : null}
        ${user.expectedPay ? html`<div><dt>${icon('banknote')}${t('profile.expectedPay')}</dt><dd>${user.expectedPay}</dd></div>` : null}
        <div><dt>${icon('calendar')}${t('profile.memberSince')}</dt><dd>${formatDate(user.createdAt, { month: 'long', year: 'numeric' })}</dd></div>
      </dl>
    </section>
  ` : null}

  ${user.skills?.length ? html`
    <section class="card card-pad">
      <h2 class="card-title">${t('profile.skills')}</h2>
      <div class="chips">${user.skills.map((skill) => html`<span class="chip">${skill}</span>`)}</div>
    </section>
  ` : null}

  ${jobs.length ? html`
    <section class="section">
      ${sectionHead(t('profile.activeJobs'))}
      <div class="card-list">${jobs.map((job) => jobCard(job, { saved: store.isSaved('job', job.id) }))}</div>
    </section>
  ` : null}

  ${!user.bio && !user.skills?.length && !jobs.length && !user.headline ? emptyState({ icon: 'user', title: t('profile.emptyTitle') }) : null}
`;

export default {
  mount(root, { params, navigate, signal, setTitle, ready }) {
    const userId = params.id;
    const isSelf = store.user?.id === userId;

    const renderShell = (user, jobs) => {
      render(root, html`
        ${appBar({
          title: user ? user.name : '',
          back: true,
          backTo: '/workers',
          actions: user ? html`
            <button class="icon-btn" type="button" data-action="share" aria-label="${t('common.share')}">${icon('share-2')}</button>
            ${user.isListed && !isSelf ? saveButton('worker', user.id, store.isSaved('worker', user.id)) : null}
            ${isSelf ? null : html`<button class="icon-btn" type="button" data-action="report" aria-label="${t('common.report')}">${icon('flag')}</button>`}
          ` : null,
        })}
        <div class="page page-narrow">
          ${user ? profileMarkup(user, jobs, isSelf) : html`<div class="card profile-head"><div class="skeleton skeleton-circle xl"></div><div class="skeleton skeleton-line w-40"></div><div class="skeleton skeleton-line w-70"></div></div>`}
        </div>
      `);
    };

    const load = async () => {
      try {
        const [{ user }, jobs] = await Promise.all([
          api.get(`/api/users/${userId}`, null, { signal }),
          api.get('/api/jobs', { poster: userId, limit: 10 }, { signal }).catch(() => ({ items: [] })),
        ]);
        setTitle(user.name);
        renderShell(user, jobs.items);
        ready();
      } catch (error) {
        if (isAbort(error)) return;
        render(root, html`${appBar({ back: true, backTo: '/workers' })}<div class="page">${errorState(error)}</div>`);
      }
    };

    on(root, 'click', '[data-action="message"]', () => startConversation({ userId, navigate }));
    on(root, 'click', '[data-action="report"]', () => openReportSheet({ targetType: 'user', targetId: userId, navigate }));
    on(root, 'click', '[data-action="share"]', () => shareLink({ title: $(root, '.profile-name')?.textContent ?? '', url: `${location.origin}/u/${userId}` }));
    on(root, 'click', '[data-action="retry"]', load);

    renderShell(null, []);
    load();
  },
};
