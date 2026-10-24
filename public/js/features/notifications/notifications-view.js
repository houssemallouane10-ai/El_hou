import { refreshSummary, store } from '../../app/store.js';
import { api, isAbort } from '../../shared/api.js';
import { appBar, emptyState, errorState, loadMore, skeletonCards } from '../../shared/components.js';
import { categoryLabel, timeAgo } from '../../shared/format.js';
import { $, html, on, render } from '../../shared/html.js';
import { t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';
import { placeLabel } from '../../shared/places.js';
import { toastError } from '../../shared/ui.js';

// Each notification type knows its icon, its sentence and where it leads.
const TYPES = {
  'application.received': {
    icon: 'inbox',
    text: (data) => t('notifications.applicationReceived', { name: data.applicantName, job: data.jobTitle }),
    href: (data) => `/jobs/${data.jobId}/applicants`,
  },
  'application.status': {
    icon: 'circle-check',
    text: (data) => t(`notifications.applicationStatus.${data.status}`, { job: data.jobTitle }),
    href: () => '/me/applications',
  },
  'job.alert': {
    icon: 'bell',
    text: (data) => t('notifications.jobAlert', { category: categoryLabel(data.category), job: data.title, place: placeLabel(data) }),
    href: (data) => `/jobs/${data.jobId}`,
  },
  'job.hidden': {
    icon: 'eye-off',
    text: (data) => t('notifications.jobHidden', { job: data.jobTitle }),
    href: () => '/me/jobs?state=hidden',
  },
  'account.verified': {
    icon: 'badge-check',
    text: () => t('notifications.accountVerified'),
    href: () => `/u/${store.user?.id ?? ''}`,
  },
};

const notificationItem = (item) => {
  const type = TYPES[item.type];
  if (!type) return null;
  return html`
    <a class="notification ${item.isRead ? '' : 'is-unread'}" href="${type.href(item.data)}" data-notification="${item.id}">
      <span class="notification-icon">${icon(type.icon)}</span>
      <span class="notification-body">
        <span class="notification-text">${type.text(item.data)}</span>
        <time class="muted text-xs" datetime="${item.createdAt}">${timeAgo(item.createdAt)}</time>
      </span>
      ${item.isRead ? null : html`<span class="unread-dot" aria-label="${t('notifications.unread')}"></span>`}
    </a>
  `;
};

export default {
  mount(root, { setTitle, signal, ready }) {
    let page = 1;
    let items = [];
    setTitle(t('notifications.title'));

    render(root, html`
      ${appBar({
        title: t('notifications.title'),
        back: true,
        backTo: '/me',
        actions: html`<button class="btn btn-sm btn-ghost" type="button" data-action="read-all">${icon('check-check')}${t('notifications.markAllRead')}</button>`,
      })}
      <div class="page page-narrow">
        <div class="list card" data-list>${skeletonCards(4)}</div>
        <div data-more></div>
      </div>
    `);

    const renderList = (hasMore) => {
      const list = $(root, '[data-list]');
      list.classList.toggle('card', items.length > 0);
      render(list, items.length ? items.map(notificationItem) : emptyState({ icon: 'bell', title: t('notifications.emptyTitle'), text: t('notifications.emptyText') }));
      render($(root, '[data-more]'), loadMore(hasMore));
    };

    const load = async ({ append = false } = {}) => {
      try {
        const data = await api.get('/api/notifications', { page }, { signal });
        items = append ? [...items, ...data.items] : data.items;
        renderList(data.hasMore);
        ready();
      } catch (error) {
        if (!isAbort(error)) render($(root, '[data-list]'), errorState(error));
      }
    };

    on(root, 'click', '[data-notification]', (event, link) => {
      const id = Number(link.dataset.notification);
      const item = items.find((entry) => entry.id === id);
      if (item && !item.isRead) {
        item.isRead = true;
        api.post(`/api/notifications/${id}/read`).then(refreshSummary).catch(() => {});
      }
    });

    on(root, 'click', '[data-action="read-all"]', async () => {
      try {
        await api.post('/api/notifications/read-all');
        refreshSummary();
        page = 1;
        load();
      } catch (error) {
        toastError(error);
      }
    });

    on(root, 'click', '[data-action="more"]', () => {
      page += 1;
      load({ append: true });
    });

    on(root, 'click', '[data-action="retry"]', () => load());

    load();
  },
};
