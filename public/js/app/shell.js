import { api } from '../shared/api.js';
import { errorState } from '../shared/components.js';
import { $, $$, html, on, render } from '../shared/html.js';
import { t } from '../shared/i18n.js';
import { icon } from '../shared/icons.js';
import { toast, toastError } from '../shared/ui.js';
import { store } from './store.js';

const TABS = [
  { id: 'home', href: '/', icon: 'house', label: 'nav.home' },
  { id: 'jobs', href: '/jobs', icon: 'briefcase', label: 'nav.jobs' },
  { id: 'post', href: '/jobs/new', icon: 'plus', label: 'nav.post' },
  { id: 'workers', href: '/workers', icon: 'users', label: 'nav.workers' },
  { id: 'me', href: '/me', icon: 'user', label: 'nav.account', badge: 'account' },
];

const tabbar = () => document.getElementById('tabbar');

export const renderTabbar = () => {
  render(tabbar(), html`
    <a class="rail-brand" href="/">
      <img src="/icons/logo.svg" alt="" width="40" height="40">
      <span>${t('common.appName')}</span>
    </a>
    ${TABS.map((tab) => html`
      <a class="tab ${tab.id === 'post' ? 'tab-post' : ''}" href="${tab.href}" data-tab="${tab.id}">
        <span class="tab-icon">${icon(tab.icon)}${tab.badge ? html`<span class="count" data-badge="${tab.badge}" hidden></span>` : null}</span>
        <span class="tab-label">${t(tab.label)}</span>
      </a>
    `)}
    <div class="rail-extra">
      <a class="tab" href="/messages" data-tab="messages">
        <span class="tab-icon">${icon('message-circle')}<span class="count" data-badge="messages" hidden></span></span>
        <span class="tab-label">${t('nav.messages')}</span>
      </a>
      <a class="tab" href="/notifications" data-tab="notifications">
        <span class="tab-icon">${icon('bell')}<span class="count" data-badge="notifications" hidden></span></span>
        <span class="tab-label">${t('nav.notifications')}</span>
      </a>
    </div>
  `);
  syncBadges();
};

export const setActiveTab = (tabId, visible) => {
  for (const tab of $$(tabbar(), '[data-tab]')) {
    const active = tab.dataset.tab === tabId;
    tab.classList.toggle('is-active', active);
    if (active) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
  document.body.classList.toggle('no-tabbar', !visible);
};

// ---------- Unread counters ----------

const badgeCount = (kind, summary) => {
  if (kind === 'account') return summary.notifications + summary.messages + summary.applications;
  return summary[kind] ?? 0;
};

export const syncBadges = () => {
  const summary = store.summary;
  const signedIn = Boolean(store.user);
  for (const badge of $$(document, '[data-badge]')) {
    const count = signedIn ? badgeCount(badge.dataset.badge, summary) : 0;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = count === 0;
  }
  const total = signedIn ? badgeCount('account', summary) : 0;
  if ('setAppBadge' in navigator) {
    (total > 0 ? navigator.setAppBadge(total) : navigator.clearAppBadge()).catch(() => {});
  }
};

// ---------- Save buttons (offers and workers), wherever they appear ----------

const syncSaveButtons = () => {
  for (const button of $$(document, '[data-save]')) {
    const saved = store.isSaved(button.dataset.save, Number(button.dataset.id));
    button.classList.toggle('is-saved', saved);
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', saved ? t('common.unsave') : t('common.save'));
    render(button, icon(saved ? 'bookmark-check' : 'bookmark'));
  }
};

const bindSaveButtons = (navigate) => {
  on(document, 'click', '[data-save]', async (event, button) => {
    event.preventDefault();
    if (!store.user) {
      toast(t('auth.loginToSave'), {
        actionLabel: t('auth.login'),
        onAction: () => navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`),
      });
      return;
    }
    const kind = button.dataset.save;
    const id = Number(button.dataset.id);
    const wasSaved = store.isSaved(kind, id);
    store.setSaved(kind, id, !wasSaved);
    try {
      if (wasSaved) await api.del(`/api/saved/${kind}s/${id}`);
      else await api.put(`/api/saved/${kind}s/${id}`);
      toast(wasSaved ? t('common.removedFromSaved') : t('common.addedToSaved'), { type: 'success', duration: 2000 });
    } catch (error) {
      store.setSaved(kind, id, wasSaved);
      toastError(error);
    }
  });
};

// ---------- Connectivity ----------

const bindConnectivity = (onBackOnline) => {
  const bar = document.getElementById('offline-bar');
  const update = () => {
    const offline = !navigator.onLine;
    bar.hidden = !offline;
    render(bar, offline ? html`${icon('wifi-off')}<span>${t('common.offline')}</span>` : '');
    document.body.classList.toggle('is-offline', offline);
  };
  window.addEventListener('offline', update);
  window.addEventListener('online', () => {
    update();
    toast(t('common.backOnline'), { type: 'success', duration: 2500 });
    onBackOnline();
  });
  update();
};

export const renderLoadFailure = (container, retry) => {
  render(container, html`<div class="page">${errorState({ code: navigator.onLine ? 'NETWORK' : 'OFFLINE' })}</div>`);
  $(container, '[data-action="retry"]').addEventListener('click', retry);
};

export const startShell = ({ navigate, onBackOnline }) => {
  renderTabbar();
  bindSaveButtons(navigate);
  bindConnectivity(onBackOnline);
  store.subscribe((change) => {
    if (change === 'saved' || change === 'session') syncSaveButtons();
    if (change === 'summary' || change === 'session' || change === 'user') syncBadges();
  });
};
