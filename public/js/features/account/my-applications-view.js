import { APPLICATION_STATUSES } from '/shared/catalog.js';
import { api, isAbort } from '../../shared/api.js';
import { appBar, applicationBadge, emptyState, errorState, jobStateBadge, loadMore, skeletonCards } from '../../shared/components.js';
import { locationLabel, salaryText, timeAgo } from '../../shared/format.js';
import { $, html, on, render } from '../../shared/html.js';
import { t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';
import { confirmDialog, toast, toastError } from '../../shared/ui.js';

const WITHDRAWABLE = new Set(['pending', 'shortlisted']);

const applicationCard = (item) => html`
  <article class="card application" data-application="${item.id}">
    <div class="owned-job-top">
      <div>
        ${item.job
          ? html`<h3 class="job-card-title"><a href="/jobs/${item.job.id}">${item.job.title}</a></h3>
            <p class="muted text-sm">${item.job.poster.companyName || item.job.poster.name} · ${locationLabel(item.job.location)}</p>`
          : html`<h3 class="job-card-title muted">${t('myApplications.unavailable')}</h3>`}
      </div>
      ${applicationBadge(item.status)}
    </div>
    <div class="owned-job-stats">
      <span>${icon('clock')}${t('myApplications.appliedAgo', { time: timeAgo(item.createdAt) })}</span>
      ${item.job ? html`<span>${icon('banknote')}${salaryText(item.job.salary)}</span>` : null}
      ${item.job && item.job.state !== 'active' ? jobStateBadge(item.job.state) : null}
    </div>
    ${item.status === 'accepted' ? html`<div class="notice notice-success">${icon('sparkles')}<span>${t('myApplications.acceptedHint')}</span></div>` : null}
    ${item.message ? html`<blockquote class="quote">${item.message}</blockquote>` : null}
    ${WITHDRAWABLE.has(item.status) ? html`
      <div class="owned-job-actions">
        <button class="btn btn-sm btn-ghost btn-danger-text" type="button" data-action="withdraw">${icon('circle-x')}${t('myApplications.withdraw')}</button>
      </div>
    ` : null}
  </article>
`;

export default {
  mount(root, { query, replaceQuery, setTitle, signal, ready }) {
    let status = query.get('status') ?? '';
    let page = 1;
    let items = [];
    setTitle(t('myApplications.title'));

    render(root, html`
      ${appBar({ title: t('myApplications.title'), back: true, backTo: '/me' })}
      <div class="page">
        <nav class="tabs" data-tabs></nav>
        <div class="card-list" data-list>${skeletonCards(3)}</div>
        <div data-more></div>
      </div>
    `);

    const renderTabs = () => render($(root, '[data-tabs]'), html`
      <button class="tab-link ${status ? '' : 'is-active'}" type="button" data-status="">${t('common.all')}</button>
      ${APPLICATION_STATUSES.map((item) => html`
        <button class="tab-link ${status === item.id ? 'is-active' : ''}" type="button" data-status="${item.id}">${t(`applications.status.${item.id}`)}</button>
      `)}
    `);

    const load = async ({ append = false } = {}) => {
      if (!append) {
        page = 1;
        render($(root, '[data-list]'), skeletonCards(3));
      }
      try {
        const data = await api.get('/api/me/applications', { status, page }, { signal });
        items = append ? [...items, ...data.items] : data.items;
        render($(root, '[data-list]'), items.length ? items.map(applicationCard) : emptyState({
          icon: 'send',
          title: t('myApplications.emptyTitle'),
          text: status ? null : t('myApplications.emptyText'),
          action: status ? null : html`<a class="btn btn-primary" href="/jobs">${icon('search')}${t('myApplications.browse')}</a>`,
        }));
        render($(root, '[data-more]'), loadMore(data.hasMore));
        ready();
      } catch (error) {
        if (!isAbort(error)) render($(root, '[data-list]'), errorState(error));
      }
    };

    on(root, 'click', '[data-status]', (event, button) => {
      status = button.dataset.status;
      replaceQuery({ status });
      renderTabs();
      load();
    });

    on(root, 'click', '[data-action="more"]', () => {
      page += 1;
      load({ append: true });
    });

    on(root, 'click', '[data-action="retry"]', () => load());

    on(root, 'click', '[data-action="withdraw"]', async (event, button) => {
      const id = Number(button.closest('[data-application]').dataset.application);
      const confirmed = await confirmDialog({ title: t('myApplications.withdraw'), message: t('myApplications.withdrawConfirm'), confirmLabel: t('myApplications.withdraw'), danger: true });
      if (!confirmed) return;
      try {
        await api.del(`/api/applications/${id}`);
        toast(t('myApplications.withdrawn'), { type: 'success' });
        load();
      } catch (error) {
        toastError(error);
      }
    });

    renderTabs();
    load();
  },
};
