import { LIMITS } from '/shared/limits.js';
import { refreshSummary } from '../../app/store.js';
import { api, isAbort } from '../../shared/api.js';
import { avatar, displayName, errorState, verifiedMark } from '../../shared/components.js';
import { formatDate, formatTime } from '../../shared/format.js';
import { $, html, on, render } from '../../shared/html.js';
import { t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';
import { openLayer, toastError } from '../../shared/ui.js';
import { openReportSheet } from '../moderation/report-sheet.js';
import { blockUser, unblockUser } from './blocking.js';

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

// Why the composer is closed, if it is: the viewer blocked the other person, the other person
// is gone, or the other person blocked the viewer (not said in so many words).
const composerNotice = (conversation) => {
  if (!conversation || conversation.canSend) return null;
  if (conversation.iBlocked) {
    return html`<p class="composer-closed">${icon('user-x')}<span>${t('blocking.youBlocked')}</span><button class="btn btn-sm btn-secondary" type="button" data-action="unblock">${t('blocking.unblock')}</button></p>`;
  }
  if (!conversation.otherIsActive) return html`<p class="composer-closed">${icon('info')}<span>${t('messages.unavailable')}</span></p>`;
  return html`<p class="composer-closed">${icon('info')}<span>${t('blocking.cannotReply')}</span></p>`;
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
        ${conversation.other ? html`<button class="icon-btn" type="button" data-action="menu" aria-haspopup="dialog" aria-label="${t('messages.options')}">${icon('ellipsis-vertical')}</button>` : null}
      ` : html`<div class="skeleton skeleton-line w-40"></div>`}
    </div>
  </header>
`;

export default {
  mount(root, { params, navigate, signal, setTitle }) {
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
          ${composerNotice(conversation)
            ?? html`
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

    const setBlocked = (blocked) => {
      conversation = { ...conversation, iBlocked: blocked, canSend: !blocked && conversation.otherIsActive };
      renderPage();
      scrollToBottom();
    };

    const person = () => ({ userId: conversation.other.id, name: displayName(conversation.other) });

    on(root, 'click', '[data-action="unblock"]', async () => {
      if (await unblockUser(person())) setBlocked(false);
    });

    on(root, 'click', '[data-action="menu"]', async () => {
      const layer = openLayer({
        title: displayName(conversation.other),
        body: html`
          <div class="list menu-list">
            <a class="list-item" href="/u/${conversation.other.id}"><span class="list-icon">${icon('user')}</span><span class="list-text">${t('messages.viewProfile')}</span></a>
            <button class="list-item" type="button" data-choice="report"><span class="list-icon">${icon('flag')}</span><span class="list-text">${t('messages.reportUser')}</span></button>
            ${conversation.iBlocked
              ? html`<button class="list-item" type="button" data-choice="unblock"><span class="list-icon">${icon('user-check')}</span><span class="list-text">${t('blocking.unblock')}</span></button>`
              : html`<button class="list-item is-danger" type="button" data-choice="block"><span class="list-icon">${icon('user-x')}</span><span class="list-text">${t('blocking.block')}</span></button>`}
          </div>
        `,
        onMount: (panel, self) => on(panel, 'click', '[data-choice]', (event, button) => self.close(button.dataset.choice)),
      });
      const choice = await layer.result;
      if (choice === 'report') openReportSheet({ targetType: 'user', targetId: conversation.other.id, navigate });
      if (choice === 'block' && await blockUser(person())) setBlocked(true);
      if (choice === 'unblock' && await unblockUser(person())) setBlocked(false);
    });

    render(root, html`${header(null)}<div class="page page-narrow chat"><div class="chat-messages" data-messages></div></div>`);
    load();
    return () => clearInterval(polling);
  },
};
