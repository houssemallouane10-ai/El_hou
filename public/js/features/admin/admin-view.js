import { REPORT_REASONS, ROLES, findById } from '/shared/catalog.js';
import { formatPhone } from '/shared/phone.js';
import { api, isAbort } from '../../shared/api.js';
import { appBar, avatar, emptyState, errorState, jobStateBadge, loadMore, skeletonCards, verifiedMark } from '../../shared/components.js';
import { formatNumber, timeAgo } from '../../shared/format.js';
import { $, html, on, render } from '../../shared/html.js';
import { label, t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';
import { confirmDialog, copyText, openLayer, toast, toastError, withBusy } from '../../shared/ui.js';

const TABS = ['overview', 'reports', 'users', 'jobs'];
const REPORT_FILTERS = ['open', 'resolved', 'dismissed'];
const USER_FILTERS = ['all', 'banned', 'verified', 'unverified_employers', 'admins'];
const JOB_FILTERS = ['all', 'active', 'closed', 'expired', 'hidden', 'featured'];

const kpi = (iconName, value, text, tone = '') => html`
  <div class="kpi ${tone}">
    <span class="kpi-icon">${icon(iconName)}</span>
    <span class="kpi-value">${formatNumber(value ?? 0)}</span>
    <span class="kpi-label">${text}</span>
  </div>
`;

const overviewMarkup = (data) => html`
  <div class="kpis">
    ${kpi('users', data.users.users, t('admin.kpi.users'))}
    ${kpi('trending-up', data.users.newUsers, t('admin.kpi.newUsers'))}
    ${kpi('user-check', data.users.listedWorkers, t('admin.kpi.listedWorkers'))}
    ${kpi('building-2', data.users.employers, t('admin.kpi.employers'))}
    ${kpi('briefcase', data.jobs.active, t('admin.kpi.activeJobs'))}
    ${kpi('plus', data.jobs.newJobs, t('admin.kpi.newJobs'))}
    ${kpi('send', data.applications.total, t('admin.kpi.applications'))}
    ${kpi('message-circle', data.messages.total, t('admin.kpi.messages'))}
    ${kpi('flag', data.reports.open, t('admin.kpi.openReports'), data.reports.open ? 'is-alert' : '')}
    ${kpi('user-x', data.users.banned, t('admin.kpi.banned'))}
    ${kpi('eye', data.jobs.views, t('admin.kpi.views'))}
    ${kpi('eye-off', data.jobs.hidden, t('admin.kpi.hiddenJobs'))}
  </div>
`;

const filterChips = (name, options, value, prefix) => html`
  <div class="chips-scroll">
    ${options.map((option) => html`<button class="chip ${value === option ? 'is-active' : ''}" type="button" data-filter="${name}" data-value="${option}">${t(`${prefix}.${option}`)}</button>`)}
  </div>
`;

const reportItem = (report) => html`
  <article class="card card-pad admin-item" data-report="${report.id}">
    <div class="admin-item-top">
      <span class="badge badge-danger">${label(findById(REPORT_REASONS, report.reason))}</span>
      <span class="muted text-xs">${timeAgo(report.createdAt)}</span>
    </div>
    <p class="admin-item-title">
      ${report.target.deleted
        ? html`<span class="muted">${t('admin.targetDeleted')}</span>`
        : html`${icon(report.target.type === 'job' ? 'briefcase' : 'user')}<a href="${report.target.type === 'job' ? `/jobs/${report.target.id}` : `/u/${report.target.id}`}">${report.target.title}</a>`}
    </p>
    ${report.details ? html`<blockquote class="quote">${report.details}</blockquote>` : null}
    <p class="muted text-sm">${t('admin.reportedBy', { name: report.reporter?.name ?? '—' })}</p>
    ${report.status === 'open' ? html`
      <div class="owned-job-actions">
        ${!report.target.deleted && report.target.type === 'job' ? html`<button class="btn btn-sm btn-danger" type="button" data-hide-job="${report.target.id}">${icon('eye-off')}${t('admin.hideJob')}</button>` : null}
        ${!report.target.deleted ? html`<button class="btn btn-sm btn-danger" type="button" data-ban-user="${report.target.ownerId}">${icon('user-x')}${t('admin.banUser')}</button>` : null}
        <button class="btn btn-sm btn-secondary" type="button" data-resolve="resolved">${icon('check')}${t('admin.resolve')}</button>
        <button class="btn btn-sm btn-ghost" type="button" data-resolve="dismissed">${t('admin.dismiss')}</button>
      </div>
    ` : html`<span class="badge badge-muted">${t(`admin.reportFilters.${report.status}`)}</span>`}
  </article>
`;

const userItem = (user) => html`
  <article class="card card-pad admin-item" data-user="${user.id}">
    <div class="admin-person">
      ${avatar(user, 'md')}
      <div>
        <p class="admin-item-title"><a href="/u/${user.id}">${user.name}</a>${verifiedMark(user)}</p>
        <p class="muted text-sm"><span dir="ltr">${formatPhone(user.phone)}</span> · ${label(findById(ROLES, user.role))} · ${timeAgo(user.createdAt)}</p>
      </div>
    </div>
    <div class="tags">
      ${user.isAdmin ? html`<span class="badge badge-featured">${t('admin.flags.admin')}</span>` : null}
      ${user.isBanned ? html`<span class="badge badge-danger">${t('admin.flags.banned')}</span>` : null}
      ${user.isListed ? html`<span class="badge badge-info">${t('admin.flags.listed')}</span>` : null}
    </div>
    ${user.isAdmin ? null : html`
      <div class="owned-job-actions">
        <button class="btn btn-sm btn-secondary" type="button" data-verify="${user.isVerified ? 'false' : 'true'}">${icon('badge-check')}${user.isVerified ? t('admin.unverify') : t('admin.verify')}</button>
        <button class="btn btn-sm ${user.isBanned ? 'btn-secondary' : 'btn-danger'}" type="button" data-ban="${user.isBanned ? 'false' : 'true'}">${icon(user.isBanned ? 'user-check' : 'user-x')}${user.isBanned ? t('admin.unban') : t('admin.ban')}</button>
        <button class="btn btn-sm btn-ghost" type="button" data-reset-password>${icon('key-round')}${t('admin.resetPassword')}</button>
      </div>
    `}
  </article>
`;

const jobItem = (job) => html`
  <article class="card card-pad admin-item" data-job="${job.id}">
    <div class="admin-item-top">
      <p class="admin-item-title"><a href="/jobs/${job.id}">${job.title}</a></p>
      ${jobStateBadge(job.state)}
    </div>
    <p class="muted text-sm">${job.poster.companyName || job.poster.name} · ${timeAgo(job.createdAt)} · ${t('jobs.views', { count: job.views })}</p>
    <div class="owned-job-actions">
      <button class="btn btn-sm ${job.isHidden ? 'btn-secondary' : 'btn-danger'}" type="button" data-hide="${job.isHidden ? 'false' : 'true'}">${icon(job.isHidden ? 'eye' : 'eye-off')}${job.isHidden ? t('admin.unhide') : t('admin.hide')}</button>
      <button class="btn btn-sm btn-secondary" type="button" data-feature="${job.isFeatured ? 'false' : 'true'}">${icon('star')}${job.isFeatured ? t('admin.unfeature') : t('admin.feature')}</button>
      <button class="btn btn-sm btn-ghost btn-danger-text" type="button" data-delete-job>${icon('trash-2')}${t('common.delete')}</button>
    </div>
  </article>
`;

export default {
  mount(root, { query, replaceQuery, setTitle }) {
    const state = {
      tab: TABS.includes(query.get('tab')) ? query.get('tab') : 'overview',
      reports: 'open',
      users: 'all',
      jobs: 'all',
      q: '',
      page: 1,
      items: [],
    };
    let requestController = null;
    let searchTimer = 0;
    setTitle(t('admin.title'));

    render(root, html`
      ${appBar({ title: t('admin.title'), back: true, backTo: '/me' })}
      <div class="page">
        <nav class="tabs" data-tabs></nav>
        <div data-controls></div>
        <div data-content>${skeletonCards(3)}</div>
        <div data-more></div>
      </div>
    `);

    const renderTabs = () => render($(root, '[data-tabs]'), TABS.map((tab) => html`
      <button class="tab-link ${state.tab === tab ? 'is-active' : ''}" type="button" data-tab="${tab}">${t(`admin.tabs.${tab}`)}</button>
    `));

    const renderControls = () => {
      const search = (placeholder) => html`
        <form class="search-box search-box-compact" role="search" data-admin-search>
          ${icon('search')}<input class="search-input" name="q" type="search" dir="auto" value="${state.q}" placeholder="${placeholder}" aria-label="${t('common.search')}">
        </form>
      `;
      const controls = {
        overview: null,
        reports: filterChips('reports', REPORT_FILTERS, state.reports, 'admin.reportFilters'),
        users: html`${search(t('admin.searchUsers'))}${filterChips('users', USER_FILTERS, state.users, 'admin.userFilters')}`,
        jobs: html`${search(t('admin.searchJobs'))}${filterChips('jobs', JOB_FILTERS, state.jobs, 'admin.jobFilters')}`,
      };
      render($(root, '[data-controls]'), html`<div class="stack-sm admin-controls">${controls[state.tab]}</div>`);
    };

    const endpoint = () => ({
      reports: ['/api/admin/reports', { status: state.reports }],
      users: ['/api/admin/users', { q: state.q, status: state.users === 'all' ? '' : state.users }],
      jobs: ['/api/admin/jobs', { q: state.q, state: state.jobs === 'all' ? '' : state.jobs }],
    })[state.tab];

    const renderItems = (hasMore) => {
      const renderer = { reports: reportItem, users: userItem, jobs: jobItem }[state.tab];
      render($(root, '[data-content]'), state.items.length
        ? html`<div class="card-list">${state.items.map(renderer)}</div>`
        : emptyState({ icon: 'inbox', title: t('admin.empty') }));
      render($(root, '[data-more]'), loadMore(hasMore));
    };

    const load = async ({ append = false } = {}) => {
      requestController?.abort();
      requestController = new AbortController();
      const content = $(root, '[data-content]');
      if (!append) {
        state.page = 1;
        render(content, skeletonCards(3));
        render($(root, '[data-more]'), null);
      }
      try {
        if (state.tab === 'overview') {
          render(content, overviewMarkup(await api.get('/api/admin/dashboard', null, { signal: requestController.signal })));
          return;
        }
        const [path, params] = endpoint();
        const data = await api.get(path, { ...params, page: state.page }, { signal: requestController.signal });
        state.items = append ? [...state.items, ...data.items] : data.items;
        renderItems(data.hasMore);
      } catch (error) {
        if (!isAbort(error)) render(content, errorState(error));
      }
    };

    const switchTab = (tab) => {
      state.tab = tab;
      state.q = '';
      replaceQuery({ tab: tab === 'overview' ? '' : tab });
      renderTabs();
      renderControls();
      load();
    };

    const itemId = (element, attribute) => Number(element.closest(`[${attribute}]`).getAttribute(attribute));

    const act = (button, task, successKey) => withBusy(button, async () => {
      try {
        await task();
        if (successKey) toast(t(successKey), { type: 'success' });
        load();
      } catch (error) {
        toastError(error);
      }
    });

    on(root, 'click', '[data-tab]', (event, button) => switchTab(button.dataset.tab));

    on(root, 'click', '[data-filter]', (event, button) => {
      state[button.dataset.filter] = button.dataset.value;
      renderControls();
      load();
    });

    on(root, 'input', '[data-admin-search] input', (event, input) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.q = input.value;
        load();
      }, 350);
    });
    on(root, 'submit', '[data-admin-search]', (event) => event.preventDefault());

    on(root, 'click', '[data-action="more"]', () => {
      state.page += 1;
      load({ append: true });
    });
    on(root, 'click', '[data-action="retry"]', () => load());

    on(root, 'click', '[data-resolve]', (event, button) => act(button, () => api.patch(`/api/admin/reports/${itemId(button, 'data-report')}`, { status: button.dataset.resolve }), 'admin.done'));

    on(root, 'click', '[data-hide-job]', (event, button) => act(button, () => api.patch(`/api/admin/jobs/${button.dataset.hideJob}`, { isHidden: true }), 'admin.jobHidden'));

    on(root, 'click', '[data-ban-user]', async (event, button) => {
      if (!(await confirmDialog({ title: t('admin.ban'), message: t('admin.banConfirm'), confirmLabel: t('admin.ban'), danger: true }))) return;
      act(button, () => api.patch(`/api/admin/users/${button.dataset.banUser}`, { isBanned: true }), 'admin.userBanned');
    });

    on(root, 'click', '[data-ban]', async (event, button) => {
      const banning = button.dataset.ban === 'true';
      if (banning && !(await confirmDialog({ title: t('admin.ban'), message: t('admin.banConfirm'), confirmLabel: t('admin.ban'), danger: true }))) return;
      act(button, () => api.patch(`/api/admin/users/${itemId(button, 'data-user')}`, { isBanned: banning }), banning ? 'admin.userBanned' : 'admin.done');
    });

    on(root, 'click', '[data-verify]', (event, button) => act(button, () => api.patch(`/api/admin/users/${itemId(button, 'data-user')}`, { isVerified: button.dataset.verify === 'true' }), 'admin.done'));

    on(root, 'click', '[data-reset-password]', async (event, button) => {
      if (!(await confirmDialog({ title: t('admin.resetPassword'), message: t('admin.resetConfirm'), confirmLabel: t('admin.resetPassword') }))) return;
      withBusy(button, async () => {
        try {
          const { temporaryPassword } = await api.post(`/api/admin/users/${itemId(button, 'data-user')}/reset-password`);
          openLayer({
            kind: 'dialog',
            title: t('admin.tempPasswordTitle'),
            body: html`<p class="dialog-message">${t('admin.tempPasswordText')}</p><p class="temp-password" dir="ltr">${temporaryPassword}</p>`,
            footer: html`<button class="btn btn-primary" type="button" data-copy>${icon('copy')}${t('common.copy')}</button>`,
            onMount: (panel) => $(panel, '[data-copy]').addEventListener('click', async () => {
              if (await copyText(temporaryPassword)) toast(t('common.copied'), { type: 'success' });
            }),
          });
        } catch (error) {
          toastError(error);
        }
      });
    });

    on(root, 'click', '[data-hide]', (event, button) => act(button, () => api.patch(`/api/admin/jobs/${itemId(button, 'data-job')}`, { isHidden: button.dataset.hide === 'true' }), 'admin.done'));
    on(root, 'click', '[data-feature]', (event, button) => act(button, () => api.patch(`/api/admin/jobs/${itemId(button, 'data-job')}`, { isFeatured: button.dataset.feature === 'true' }), 'admin.done'));
    on(root, 'click', '[data-delete-job]', async (event, button) => {
      if (!(await confirmDialog({ title: t('jobs.deleteTitle'), message: t('jobs.deleteMessage'), confirmLabel: t('common.delete'), danger: true }))) return;
      act(button, () => api.del(`/api/admin/jobs/${itemId(button, 'data-job')}`), 'jobs.deleted');
    });

    renderTabs();
    renderControls();
    load();

    return () => {
      requestController?.abort();
      clearTimeout(searchTimer);
    };
  },
};
