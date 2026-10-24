import { LIMITS } from '/shared/limits.js';
import { refreshSummary, store } from '../../app/store.js';
import { api, isAbort } from '../../shared/api.js';
import {
  appBar,
  applicationBadge,
  avatar,
  contactActions,
  displayName,
  errorState,
  jobCard,
  jobStateBadge,
  saveButton,
  sectionHead,
  verifiedMark,
} from '../../shared/components.js';
import {
  categoryIcon,
  categoryLabel,
  daysUntil,
  formatDate,
  formatNumber,
  jobTypeLabel,
  locationLabel,
  salaryText,
  timeAgo,
} from '../../shared/format.js';
import { field, handleFormError, readForm, textarea } from '../../shared/forms.js';
import { $, html, on, render } from '../../shared/html.js';
import { t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';
import { confirmDialog, openLayer, shareLink, toast, toastError, withBusy } from '../../shared/ui.js';
import { startConversation } from '../messages/start-conversation.js';
import { openReportSheet } from '../moderation/report-sheet.js';

const infoItem = (iconName, title, value) => html`
  <div class="info-item">
    <span class="info-icon">${icon(iconName)}</span>
    <span class="info-text"><span class="info-label">${title}</span><span class="info-value">${value}</span></span>
  </div>
`;

const stateNotice = (job) => {
  if (job.state === 'active') return null;
  const tone = job.state === 'hidden' ? 'danger' : 'warning';
  return html`<div class="notice notice-${tone}">${icon('info')}<span>${t(`jobs.notice.${job.state}`)}</span></div>`;
};

const ownerPanel = (job) => html`
  <section class="card owner-panel">
    <div class="owner-stats">
      <div><strong>${formatNumber(job.views)}</strong><span>${t('jobs.viewsLabel')}</span></div>
      <div><strong>${formatNumber(job.applicationsCount)}</strong><span>${t('jobs.applicantsLabel')}</span></div>
      <div>${jobStateBadge(job.state)}<span>${job.state === 'active' ? t('jobs.expiresIn', { count: Math.max(daysUntil(job.expiresAt), 0) }) : t('jobs.stateLabel')}</span></div>
    </div>
    <div class="owner-actions">
      <a class="btn btn-primary" href="/jobs/${job.id}/applicants">${icon('inbox')}${t('jobs.viewApplicants')}</a>
      <a class="btn btn-secondary" href="/jobs/${job.id}/edit">${icon('pencil')}${t('common.edit')}</a>
      ${job.state === 'active' ? html`<button class="btn btn-secondary" type="button" data-status="close">${icon('circle-pause')}${t('jobs.close')}</button>` : null}
      ${job.state === 'closed' && daysUntil(job.expiresAt) > 0 ? html`<button class="btn btn-secondary" type="button" data-status="reopen">${icon('rotate-ccw')}${t('jobs.reopen')}</button>` : null}
      ${job.state === 'expired' || job.state === 'closed' ? html`<button class="btn btn-secondary" type="button" data-status="renew">${icon('refresh-cw')}${t('jobs.renew')}</button>` : null}
      <button class="btn btn-ghost btn-danger-text" type="button" data-action="delete">${icon('trash-2')}${t('common.delete')}</button>
    </div>
  </section>
`;

const actionBar = (job, myApplication) => {
  if (job.isOwner) return null;
  const whatsappText = t('jobs.whatsappMessage', { title: job.title });
  if (job.state !== 'active') {
    return html`<div class="action-bar"><div class="action-bar-inner"><span class="muted">${t('jobs.notAccepting')}</span></div></div>`;
  }
  return html`
    <div class="action-bar">
      <div class="action-bar-inner">
        ${contactActions({ phone: job.contact.phone, whatsapp: job.contact.whatsapp, whatsappText })}
        ${myApplication
          ? html`<a class="btn btn-tonal grow" href="/me/applications">${icon('circle-check')}${t('jobs.applied')} · ${applicationBadge(myApplication.status)}</a>`
          : html`<button class="btn btn-primary grow" type="button" data-action="apply">${icon('send', 'flip-rtl')}${t('jobs.apply')}</button>`}
      </div>
    </div>
  `;
};

const detailMarkup = (job, myApplication, similar) => html`
  <article class="detail">
    <header class="detail-head">
      <span class="cat-icon cat-icon-lg">${icon(categoryIcon(job.category))}</span>
      <div class="detail-head-text">
        <div class="tags">
          ${job.isUrgent ? html`<span class="badge badge-urgent">${icon('zap')}${t('jobs.urgent')}</span>` : null}
          ${job.isFeatured ? html`<span class="badge badge-featured">${icon('star')}${t('jobs.featured')}</span>` : null}
          ${job.state !== 'active' ? jobStateBadge(job.state) : null}
        </div>
        <h1 class="detail-title">${job.title}</h1>
        <p class="muted">${categoryLabel(job.category)} · <time datetime="${job.publishedAt}">${t('jobs.postedAgo', { time: timeAgo(job.publishedAt) })}</time></p>
      </div>
    </header>

    ${stateNotice(job)}

    <div class="info-grid">
      ${infoItem('banknote', t('jobs.salary'), salaryText(job.salary))}
      ${infoItem('clock', t('jobs.jobType'), jobTypeLabel(job.jobType))}
      ${infoItem('map-pin', t('jobs.place'), job.address ? `${locationLabel(job.location)} — ${job.address}` : locationLabel(job.location))}
      ${infoItem('users', t('jobs.positionsLabel'), t('jobs.positions', { count: job.positions }))}
      ${infoItem('calendar', t('jobs.deadline'), formatDate(job.expiresAt))}
      ${infoItem('eye', t('jobs.interest'), `${t('jobs.views', { count: job.views })} · ${t('jobs.applicants', { count: job.applicationsCount })}`)}
    </div>

    ${job.isOwner ? ownerPanel(job) : null}

    <section class="card card-pad">
      <h2 class="card-title">${t('jobs.description')}</h2>
      <p class="prose">${job.description}</p>
    </section>

    ${job.requirements ? html`
      <section class="card card-pad">
        <h2 class="card-title">${t('jobs.requirements')}</h2>
        <p class="prose">${job.requirements}</p>
      </section>
    ` : null}

    <section class="card card-pad poster">
      <a class="poster-link" href="/u/${job.poster.id}">
        ${avatar(job.poster, 'lg')}
        <span class="poster-text">
          <span class="poster-name">${displayName(job.poster)}${verifiedMark(job.poster)}</span>
          <span class="muted text-sm">${t('common.memberSince', { date: formatDate(job.poster.memberSince, { month: 'long', year: 'numeric' }) })}</span>
        </span>
        ${icon('chevron-right', 'flip-rtl muted')}
      </a>
      ${job.isOwner ? null : html`<button class="btn btn-secondary btn-block" type="button" data-action="message">${icon('message-circle')}${t('jobs.messagePoster')}</button>`}
    </section>

    <div class="notice notice-warning">${icon('shield')}<span>${t('jobs.safetyNote')} <a href="/safety">${t('common.learnMore')}</a></span></div>

    ${myApplication && !job.isOwner ? html`
      <div class="notice notice-info">${icon('circle-check')}<span>${t('jobs.appliedOn', { date: formatDate(myApplication.createdAt) })} ${applicationBadge(myApplication.status)}</span></div>
    ` : null}

    ${similar.length ? html`
      <section class="section">
        ${sectionHead(t('jobs.similar'), { href: `/jobs?category=${job.category}`, label: t('common.seeAll') })}
        <div class="card-list">${similar.map((item) => jobCard(item, { saved: store.isSaved('job', item.id) }))}</div>
      </section>
    ` : null}
  </article>
  ${actionBar(job, myApplication)}
`;

export default {
  mount(root, { params, navigate, signal, setTitle, ready }) {
    const jobId = params.id;
    let job = null;
    let myApplication = null;
    let similar = [];

    const renderPage = () => {
      render(root, html`
        ${appBar({
          title: job ? t('jobs.detailTitle') : '',
          back: true,
          backTo: '/jobs',
          actions: job ? html`
            <button class="icon-btn" type="button" data-action="share" aria-label="${t('common.share')}">${icon('share-2')}</button>
            ${saveButton('job', job.id, store.isSaved('job', job.id))}
            ${job.isOwner ? null : html`<button class="icon-btn" type="button" data-action="report" aria-label="${t('common.report')}">${icon('flag')}</button>`}
          ` : null,
        })}
        <div class="page page-detail ${job && !job.isOwner ? 'has-action-bar' : ''}">
          ${job ? detailMarkup(job, myApplication, similar) : html`<div class="detail-skeleton">
            <div class="skeleton skeleton-line w-40"></div><div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-block"></div><div class="skeleton skeleton-block"></div>
          </div>`}
        </div>
      `);
    };

    const load = async () => {
      try {
        const data = await api.get(`/api/jobs/${jobId}`, null, { signal });
        job = data.job;
        myApplication = data.myApplication;
        similar = data.similar ?? [];
        setTitle(job.title);
        renderPage();
        ready();
      } catch (error) {
        if (isAbort(error)) return;
        render(root, html`
          ${appBar({ back: true, backTo: '/jobs' })}
          <div class="page">${errorState(error)}</div>
        `);
      }
    };

    const changeStatus = async (action, button) => {
      await withBusy(button, async () => {
        try {
          const data = await api.post(`/api/jobs/${jobId}/status`, { action });
          job = { ...job, ...data.job };
          toast(t(`jobs.statusChanged.${action}`), { type: 'success' });
          renderPage();
        } catch (error) {
          toastError(error);
        }
      });
    };

    const openApplySheet = () => {
      if (!store.user) {
        navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
        return;
      }
      openLayer({
        title: t('jobs.applyTitle'),
        body: html`
          <form class="form" id="apply-form" novalidate>
            <div class="apply-job">
              <strong>${job.title}</strong>
              <span class="muted text-sm">${displayName(job.poster)} · ${locationLabel(job.location)}</span>
            </div>
            ${field({
              name: 'message',
              label: t('jobs.applyMessage'),
              optional: true,
              counterMax: LIMITS.applicationMessage.max,
              hint: t('jobs.applyMessageHint'),
              control: textarea({ name: 'message', rows: 4, maxlength: LIMITS.applicationMessage.max, placeholder: t('jobs.applyMessagePlaceholder') }),
            })}
            <p class="notice notice-info">${icon('info')}<span>${t('jobs.applyPrivacy')}</span></p>
          </form>
        `,
        footer: html`<button class="btn btn-primary btn-block" type="submit" form="apply-form">${icon('send', 'flip-rtl')}${t('jobs.sendApplication')}</button>`,
        onMount: (panel, layer) => {
          const form = $(panel, '#apply-form');
          form.addEventListener('submit', (event) => {
            event.preventDefault();
            withBusy($(panel, 'button[type="submit"]'), async () => {
              try {
                const data = await api.post(`/api/jobs/${jobId}/applications`, readForm(form));
                myApplication = data.application;
                job = { ...job, applicationsCount: job.applicationsCount + 1 };
                layer.close();
                renderPage();
                toast(t('jobs.applicationSent'), { type: 'success', duration: 5000 });
                if (!store.user.headline) {
                  toast(t('jobs.completeProfileTip'), { actionLabel: t('jobs.completeProfile'), onAction: () => navigate('/me/edit'), duration: 8000 });
                }
              } catch (error) {
                if (error.code === 'ALREADY_APPLIED' || error.code === 'JOB_NOT_ACTIVE') {
                  layer.close();
                  toastError(error);
                  load();
                } else handleFormError(form, error);
              }
            });
          });
        },
      });
    };

    on(root, 'click', '[data-action="apply"]', openApplySheet);
    on(root, 'click', '[data-action="share"]', () => shareLink({
      title: job.title,
      text: `${job.title} — ${salaryText(job.salary)}`,
      url: `${location.origin}/jobs/${job.id}`,
    }));
    on(root, 'click', '[data-action="report"]', () => openReportSheet({ targetType: 'job', targetId: jobId, navigate }));
    on(root, 'click', '[data-action="message"]', () => startConversation({ userId: job.poster.id, jobId, navigate }));
    on(root, 'click', '[data-status]', (event, button) => changeStatus(button.dataset.status, button));
    on(root, 'click', '[data-action="retry"]', load);
    on(root, 'click', '[data-action="delete"]', async () => {
      const confirmed = await confirmDialog({
        title: t('jobs.deleteTitle'),
        message: t('jobs.deleteMessage'),
        confirmLabel: t('common.delete'),
        danger: true,
      });
      if (!confirmed) return;
      try {
        await api.del(`/api/jobs/${jobId}`);
        toast(t('jobs.deleted'), { type: 'success' });
        refreshSummary();
        navigate('/me/jobs', { replace: true });
      } catch (error) {
        toastError(error);
      }
    });

    renderPage();
    load();
  },
};
