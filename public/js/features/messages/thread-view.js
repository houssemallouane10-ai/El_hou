import { LIMITS } from '/shared/limits.js';
import { refreshSummary } from '../../app/store.js';
import { api, isAbort } from '../../shared/api.js';
import { avatar, displayName, errorState, verifiedMark } from '../../shared/components.js';
import { formatDate, formatTime } from '../../shared/format.js';
import { $, html, on, render } from '../../shared/html.js';
import { t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';
import { toastError } from '../../shared/ui.js';

const POLL_MS = 4000;
const MAX_COMPOSER_HEIGHT = 140;

const dayKey = (iso) => new Date(iso).toDateString();

const dayLabel = (iso) => {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (date.toDateString() === today.toDateString()) return t('messages.today');
  if (date.toDateString() === yesterday.toDateString()) return t('messages.yesterday');
  return formatDate(iso, { weekday: 'long', day: 'numeric', month: 'long' });
};

const bubble = (message) => html`
  <div class="bubble ${message.isMine ? 'is-mine' : ''}" data-message="${message.id}">
    <p class="bubble-text">${message.body}</p>
    <span class="bubble-meta">
      <time datetime="${message.createdAt}">${formatTime(message.createdAt)}</time>
      ${message.isMine ? html`<span class="receipt ${message.readAt ? 'is-read' : ''}" aria-label="${message.readAt ? t('messages.read') : t('messages.sent')}">${icon(message.readAt ? 'check-check' : 'check')}</span>` : null}
    </span>
  </div>
`;

const messagesMarkup = (messages) => {
  let lastDay = null;
  return messages.map((message) => {
    const day = dayKey(message.createdAt);
    const divider = day !== lastDay ? html`<div class="day-divider"><span>${dayLabel(message.createdAt)}</span></div>` : null;
    lastDay = day;
    return html`${divider}${bubble(message)}`;
  });
};

const header = (conversation) => html`
  <header class="appbar chat-head">
    <div class="appbar-inner">
      <button class="icon-btn" type="button" data-action="back" data-fallback="/messages" aria-label="${t('common.back')}">${icon('arrow-left', 'flip-rtl')}</button>
      ${conversation ? html`
        <a class="chat-person" href="/u/${conversation.other?.id ?? ''}">
          ${avatar(conversation.other ?? { name: '?' }, 'md')}
          <span class="chat-person-text">
            <span class="chat-person-name">${conversation.other ? displayName(conversation.other) : t('messages.deletedUser')}${verifiedMark(conversation.other)}</span>
            ${conversation.job ? html`<span class="chat-person-sub">${t('messages.about', { job: conversation.job.title })}</span>` : null}
          </span>
        </a>
        ${conversation.job ? html`<a class="icon-btn" href="/jobs/${conversation.job.id}" aria-label="${t('messages.viewJob')}">${icon('briefcase')}</a>` : null}
      ` : html`<div class="skeleton skeleton-line w-40"></div>`}
    </div>
  </header>
`;

export default {
  mount(root, { params, signal, setTitle }) {
    const conversationId = params.id;
    let messages = [];
    let conversation = null;
    let hasOlder = false;
    let polling = 0;
    let sending = false;

    const nearBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120;
    const scrollToBottom = () => window.scrollTo(0, document.documentElement.scrollHeight);

    const renderMessages = () => {
      render($(root, '[data-messages]'), html`
        ${hasOlder ? html`<div class="load-more"><button class="btn btn-sm btn-secondary" type="button" data-action="older">${t('messages.loadOlder')}</button></div>` : null}
        ${messages.length ? messagesMarkup(messages) : html`<p class="chat-empty muted">${t('messages.startHint')}</p>`}
      `);
    };

    const renderPage = () => {
      render(root, html`
        ${header(conversation)}
        <div class="page page-narrow chat">
          <div class="chat-messages" data-messages></div>
        </div>
        <form class="composer" data-composer>
          ${conversation && !conversation.otherIsActive
            ? html`<p class="composer-closed">${icon('info')}${t('messages.unavailable')}</p>`
            : html`
              <textarea class="composer-input" name="body" rows="1" dir="auto" maxlength="${LIMITS.messageBody.max}" placeholder="${t('messages.placeholder')}" aria-label="${t('messages.placeholder')}" required></textarea>
              <button class="composer-send" type="submit" aria-label="${t('common.send')}">${icon('send', 'flip-rtl')}</button>
            `}
        </form>
      `);
      renderMessages();
    };

    // Polls the latest page: appends new messages and refreshes read receipts of mine.
    const refresh = async () => {
      try {
        const data = await api.get(`/api/conversations/${conversationId}/messages`, null, { signal });
        const latest = new Map(data.messages.map((message) => [message.id, message]));
        let changed = false;
        messages = messages.map((message) => {
          const update = latest.get(message.id);
          if (update && update.readAt !== message.readAt) {
            changed = true;
            return update;
          }
          return message;
        });
        const known = new Set(messages.map((message) => message.id));
        const fresh = data.messages.filter((message) => !known.has(message.id));
        if (!changed && fresh.length === 0) return;
        const stickToBottom = nearBottom();
        messages = [...messages, ...fresh];
        renderMessages();
        if (fresh.length && stickToBottom) scrollToBottom();
        if (fresh.some((message) => !message.isMine)) refreshSummary();
      } catch (error) {
        if (!isAbort(error)) clearInterval(polling);
      }
    };

    const load = async () => {
      try {
        const data = await api.get(`/api/conversations/${conversationId}/messages`, null, { signal });
        conversation = data.conversation;
        messages = data.messages;
        hasOlder = data.hasOlder;
        setTitle(conversation.other ? displayName(conversation.other) : t('nav.messages'));
        renderPage();
        scrollToBottom();
        refreshSummary();
        polling = setInterval(() => {
          if (document.visibilityState === 'visible' && !sending) refresh();
        }, POLL_MS);
      } catch (error) {
        if (isAbort(error)) return;
        render(root, html`${header(null)}<div class="page">${errorState(error)}</div>`);
      }
    };

    const send = async (form) => {
      const field = form.elements.body;
      const body = field.value.trim();
      if (!body || sending) return;
      sending = true;
      try {
        const { message } = await api.post(`/api/conversations/${conversationId}/messages`, { body });
        field.value = '';
        field.style.height = '';
        messages = [...messages, message];
        renderMessages();
        scrollToBottom();
      } catch (error) {
        toastError(error);
      } finally {
        sending = false;
        field.focus();
      }
    };

    on(root, 'submit', '[data-composer]', (event, form) => {
      event.preventDefault();
      send(form);
    });

    on(root, 'keydown', '.composer-input', (event, field) => {
      const coarse = matchMedia('(pointer: coarse)').matches;
      if (event.key === 'Enter' && !event.shiftKey && !coarse && !event.isComposing) {
        event.preventDefault();
        send(field.form);
      }
    });

    on(root, 'input', '.composer-input', (event, field) => {
      field.style.height = 'auto';
      field.style.height = `${Math.min(field.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
    });

    on(root, 'click', '[data-action="older"]', async () => {
      try {
        const data = await api.get(`/api/conversations/${conversationId}/messages`, { before: messages[0]?.id }, { signal });
        const previousHeight = document.documentElement.scrollHeight;
        messages = [...data.messages, ...messages];
        hasOlder = data.hasOlder;
        renderMessages();
        window.scrollBy(0, document.documentElement.scrollHeight - previousHeight);
      } catch (error) {
        if (!isAbort(error)) toastError(error);
      }
    });

    on(root, 'click', '[data-action="retry"]', load);

    render(root, html`${header(null)}<div class="page page-narrow chat"><div class="chat-messages" data-messages></div></div>`);
    load();
    return () => clearInterval(polling);
  },
};
