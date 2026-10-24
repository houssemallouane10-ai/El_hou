import { api, isAbort } from '../../shared/api.js';
import { appBar, emptyState, errorState, jobStateBadge, loadMore, skeletonCards } from '../../shared/components.js';
import { daysUntil, timeAgo } from '../../shared/format.js';
import { $, html, on, render } from '../../shared/html.js';
import { t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';
import { placeLabel } from '../../shared/places.js';
import { confirmDialog, toast, toastError, withBusy } from '../../shared/ui.js';

const STATES = ['all', 'active', 'closed', 'expired', 'hidden'];

const ownedJobCard = (job) => html`
  <article class="card owned-job" data-job="${job.id}">
    <div class="owned-job-top">
      <div>
        <h3 class="job-card-title"><a href="/jobs/${job.id}">${job.title}</a></h3>
        <p class="muted text-sm">${placeLabel(job)} · ${t('jobs.postedAgo', { time: timeAgo(job.publishedAt) })}</p>
      </div>
      ${jobStateBadge(job.state)}
    </div>
    <div class="owned-job-stats">
      <span>${icon('eye')}${t('jobs.views', { count: job.views })}</span>
      <span>${icon('users')}${t('jobs.applicants', { count: job.applications.total })}</span>
      ${job.applications.unseen ? html`<span class="badge badge-info">${t('myJobs.newApplicants', { count: job.applications.unseen })}</span>` : null}
      ${job.state === 'active' ? html`<span class="muted">${t('jobs.expiresIn', { count: Math.max(daysUntil(job.expiresAt), 0) })}</span>` : null}
    </div>
    <div class="owned-job-actions">
      <a class="btn btn-sm btn-primary" href="/jobs/${job.id}/applicants">${icon('inbox')}${t('jobs.viewApplicants')}</a>
      ${job.state === 'hidden' ? null : html`<a class="btn btn-sm btn-secondary" href="/jobs/${job.id}/edit">${icon('pencil')}${t('common.edit')}</a>`}
      ${job.state === 'active' ? html`<button class="btn btn-sm btn-secondary" type="button" data-status="close">${icon('circle-pause')}${t('jobs.close')}</button>` : null}
      ${job.state === 'expired' || job.state === 'closed' ? html`<button class="btn btn-sm btn-secondary" type="button" data-status="renew">${icon('refresh-cw')}${t('jobs.renew')}</button>` : null}
      <button class="btn btn-sm btn-ghost btn-danger-text" type="button" data-action="delete" aria-label="${t('common.delete')}">${icon('trash-2')}</button>
    </div>
  </article>
`;

export default {
  mount(root, { query, replaceQuery, setTitle, signal, ready }) {
    let state = STATES.includes(query.get('state')) ? query.get('state') : 'all';
    let page = 1;
    let items = [];
    setTitle(t('myJobs.title'));

    render(root, html`
      ${appBar({ title: t('myJobs.title'), back: true, backTo: '/me', actions: html`<a class="btn btn-sm btn-primary" href="/jobs/new">${icon('plus')}${t('nav.post')}</a>` })}
      <div class="page">
        <nav class="tabs" data-tabs></nav>
        <div class="card-list" data-list>${skeletonCards(3)}</div>
        <div data-more></div>
      </div>
    `);

    const renderTabs = () => render($(root, '[data-tabs]'), STATES.map((item) => html`
      <button class="tab-link ${state === item ? 'is-active' : ''}" type="button" data-state="${item}">${t(`myJobs.tabs.${item}`)}</button>
    `));

    const load = async ({ append = false } = {}) => {
      if (!append) {
        page = 1;
        render($(root, '[data-list]'), skeletonCards(3));
      }
      try {
        const data = await api.get('/api/me/jobs', { state: state === 'all' ? '' : state, page }, { signal });
        items = append ? [...items, ...data.items] : data.items;
        render($(root, '[data-list]'), items.length ? items.map(ownedJobCard) : emptyState({
          icon: 'briefcase',
          title: t('myJobs.emptyTitle'),
          text: state === 'all' ? t('myJobs.emptyText') : null,
          action: state === 'all' ? html`<a class="btn btn-primary" href="/jobs/new">${icon('plus')}${t('home.postJob')}</a>` : null,
        }));
        render($(root, '[data-more]'), loadMore(data.hasMore));
        ready();
      } catch (error) {
        if (!isAbort(error)) render($(root, '[data-list]'), errorState(error));
      }
    };

    on(root, 'click', '[data-state]', (event, button) => {
      state = button.dataset.state;
      replaceQuery({ state: state === 'all' ? '' : state });
      renderTabs();
      load();
    });

    on(root, 'click', '[data-action="more"]', () => {
      page += 1;
      load({ append: true });
    });

    on(root, 'click', '[data-action="retry"]', () => load());

    on(root, 'click', '[data-status]', (event, button) => {
      const id = Number(button.closest('[data-job]').dataset.job);
      withBusy(button, async () => {
        try {
          await api.post(`/api/jobs/${id}/status`, { action: button.dataset.status });
          toast(t(`jobs.statusChanged.${button.dataset.status}`), { type: 'success' });
          load();
        } catch (error) {
          toastError(error);
        }
      });
    });

    on(root, 'click', '[data-action="delete"]', async (event, button) => {
      const id = Number(button.closest('[data-job]').dataset.job);
      const confirmed = await confirmDialog({ title: t('jobs.deleteTitle'), message: t('jobs.deleteMessage'), confirmLabel: t('common.delete'), danger: true });
      if (!confirmed) return;
      try {
        await api.del(`/api/jobs/${id}`);
        toast(t('jobs.deleted'), { type: 'success' });
        load();
      } catch (error) {
        toastError(error);
      }
    });

    renderTabs();
    load();
  },
};
