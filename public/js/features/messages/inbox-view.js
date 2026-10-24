import { api, isAbort } from '../../shared/api.js';
import { appBar, avatar, displayName, emptyState, errorState, skeletonCards, verifiedMark } from '../../shared/components.js';
import { timeAgo } from '../../shared/format.js';
import { $, html, on, render } from '../../shared/html.js';
import { t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';

const REFRESH_MS = 15_000;

const conversationItem = (item) => html`
  <a class="conversation ${item.unread ? 'is-unread' : ''}" href="/messages/${item.id}">
    ${avatar(item.other ?? { name: '?' }, 'lg')}
    <span class="conversation-body">
      <span class="conversation-top">
        <span class="conversation-name">${item.other ? displayName(item.other) : t('messages.deletedUser')}${verifiedMark(item.other)}</span>
        ${item.lastMessage ? html`<time class="muted text-xs" datetime="${item.lastMessage.createdAt}">${timeAgo(item.lastMessage.createdAt)}</time>` : null}
      </span>
      ${item.job ? html`<span class="conversation-job">${icon('briefcase')}${item.job.title}</span>` : null}
      <span class="conversation-preview">${item.lastMessage?.isMine ? html`<span class="muted">${t('messages.you')}</span> ` : null}${item.lastMessage?.preview ?? ''}</span>
    </span>
    ${item.unread ? html`<span class="count count-inline">${item.unread}</span>` : null}
  </a>
`;

export default {
  mount(root, { setTitle, signal, ready }) {
    setTitle(t('nav.messages'));
    render(root, html`
      ${appBar({ title: t('nav.messages'), back: true, backTo: '/me' })}
      <div class="page page-narrow">
        <div class="list card" data-list>${skeletonCards(4)}</div>
      </div>
    `);

    const load = async () => {
      try {
        const { items } = await api.get('/api/conversations', null, { signal });
        const list = $(root, '[data-list]');
        list.classList.toggle('card', items.length > 0);
        render(list, items.length ? items.map(conversationItem) : emptyState({
          icon: 'message-circle',
          title: t('messages.emptyTitle'),
          text: t('messages.emptyText'),
          action: html`<a class="btn btn-primary" href="/jobs">${t('messages.browse')}</a>`,
        }));
        ready();
      } catch (error) {
        if (!isAbort(error)) render($(root, '[data-list]'), errorState(error));
      }
    };

    on(root, 'click', '[data-action="retry"]', load);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, REFRESH_MS);

    load();
    return () => clearInterval(timer);
  },
};
