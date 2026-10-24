import { t } from '../shared/i18n.js';
import { closeAllLayers } from '../shared/ui.js';
import { renderLoadFailure, setActiveTab, syncBadges } from './shell.js';
import { store } from './store.js';

// `tab` highlights a navigation item; `tabbar: false` hides the bar on focused screens that
// carry their own bottom actions. `auth` routes send guests to /login and come back afterwards.
const ROUTES = [
  { path: '/', tab: 'home', load: () => import('../features/home/home-view.js') },
  { path: '/jobs', tab: 'jobs', load: () => import('../features/jobs/jobs-view.js') },
  { path: '/jobs/new', tab: 'post', auth: true, load: () => import('../features/jobs/job-form-view.js') },
  { path: '/jobs/:id', tab: 'jobs', tabbar: false, load: () => import('../features/jobs/job-view.js') },
  { path: '/jobs/:id/edit', tabbar: false, auth: true, load: () => import('../features/jobs/job-form-view.js') },
  { path: '/jobs/:id/applicants', tabbar: false, auth: true, load: () => import('../features/jobs/applicants-view.js') },
  { path: '/workers', tab: 'workers', load: () => import('../features/workers/workers-view.js') },
  { path: '/u/:id', tab: 'workers', tabbar: false, load: () => import('../features/workers/profile-view.js') },
  { path: '/me', tab: 'me', load: () => import('../features/account/me-view.js') },
  { path: '/me/edit', tabbar: false, auth: true, load: () => import('../features/account/edit-profile-view.js') },
  { path: '/me/jobs', tab: 'me', auth: true, load: () => import('../features/account/my-jobs-view.js') },
  { path: '/me/applications', tab: 'me', auth: true, load: () => import('../features/account/my-applications-view.js') },
  { path: '/saved', tab: 'me', auth: true, load: () => import('../features/account/saved-view.js') },
  { path: '/settings', tab: 'me', load: () => import('../features/account/settings-view.js') },
  { path: '/notifications', tab: 'me', auth: true, load: () => import('../features/notifications/notifications-view.js') },
  { path: '/messages', tab: 'me', auth: true, load: () => import('../features/messages/inbox-view.js') },
  { path: '/messages/:id', tabbar: false, auth: true, load: () => import('../features/messages/thread-view.js') },
  { path: '/login', tabbar: false, guestOnly: true, load: () => import('../features/auth/login-view.js') },
  { path: '/register', tabbar: false, guestOnly: true, load: () => import('../features/auth/register-view.js') },
  { path: '/forgot', tabbar: false, load: () => import('../features/auth/forgot-view.js') },
  { path: '/admin', tab: 'me', admin: true, load: () => import('../features/admin/admin-view.js') },
  { path: '/about', tab: 'me', page: 'about', load: () => import('../features/pages/static-view.js') },
  { path: '/safety', tab: 'me', page: 'safety', load: () => import('../features/pages/static-view.js') },
  { path: '/terms', tab: 'me', page: 'terms', load: () => import('../features/pages/static-view.js') },
  { path: '/privacy', tab: 'me', page: 'privacy', load: () => import('../features/pages/static-view.js') },
];

const NOT_FOUND = { tab: null, load: () => import('../features/pages/not-found-view.js') };

const compile = (path) => new RegExp(`^${path.replace(/\/:(\w+)/g, '/(?<$1>\\d+)')}$`);
const COMPILED = ROUTES.map((route) => ({ ...route, pattern: compile(route.path) }));

const matchRoute = (pathname) => {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  for (const route of COMPILED) {
    const match = normalized.match(route.pattern);
    if (match) return { route, params: Object.fromEntries(Object.entries(match.groups ?? {}).map(([key, value]) => [key, Number(value)])) };
  }
  return { route: NOT_FOUND, params: {} };
};

// Only same-site paths are accepted as post-login destinations ("//host" and "/\host" resolve
// to other sites, so the value is resolved and its origin compared).
export const safeNext = (value) => {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/';
  try {
    const url = new URL(value, location.origin);
    return url.origin === location.origin ? `${url.pathname}${url.search}${url.hash}` : '/';
  } catch {
    return '/';
  }
};

// ---------- History bookkeeping (scroll restoration and in-app back) ----------

const SCROLL_PREFIX = 'khedmati.scroll.';
const newKey = () => Math.random().toString(36).slice(2, 10);
const historyIndex = () => history.state?.index ?? 0;

// The scroll position is recorded continuously for the visible entry, because by the time a
// popstate event fires, history.state already points at the destination.
let visibleKey = null;
let scrollFrame = 0;

const rememberScroll = () => {
  if (!visibleKey) return;
  try {
    sessionStorage.setItem(SCROLL_PREFIX + visibleKey, String(Math.round(window.scrollY)));
  } catch {
    // Storage full or blocked: scroll restoration is a nicety.
  }
};

const savedScroll = () => {
  try {
    const value = sessionStorage.getItem(SCROLL_PREFIX + history.state?.key);
    return value === null ? null : Number(value);
  } catch {
    return null;
  }
};

// ---------- Navigation ----------

let outlet = null;
let current = null;
let navigationId = 0;

export const setTitle = (title) => {
  document.title = title ? `${title} · ${t('common.appName')}` : `${t('common.appName')} — ${t('common.tagline')}`;
};

const show = async ({ restoreScroll = false, focus = true } = {}) => {
  const id = ++navigationId;
  const url = new URL(location.href);
  const { route, params } = matchRoute(url.pathname);
  const scrollTarget = restoreScroll ? savedScroll() : null;
  visibleKey = history.state?.key ?? null;

  if (route.auth && !store.user) {
    navigate(`/login?next=${encodeURIComponent(url.pathname + url.search)}`, { replace: true });
    return;
  }
  if (route.guestOnly && store.user) {
    navigate(safeNext(url.searchParams.get('next')), { replace: true });
    return;
  }
  const resolved = route.admin && !store.user?.isAdmin ? NOT_FOUND : route;

  closeAllLayers();
  current?.controller.abort();
  current?.cleanup?.();
  const controller = new AbortController();
  current = { controller, cleanup: null };

  const container = document.createElement('div');
  container.className = 'view';
  outlet.replaceChildren(container);
  setActiveTab(resolved.tab, resolved.tabbar !== false);

  let module;
  try {
    module = await resolved.load();
  } catch {
    if (id === navigationId) renderLoadFailure(container, () => show());
    return;
  }
  if (id !== navigationId) return;

  let restorePending = scrollTarget !== null;
  const ctx = {
    params,
    query: url.searchParams,
    page: resolved.page,
    signal: controller.signal,
    navigate,
    setTitle,
    replaceQuery,
    // Views call ready() once their main content is on screen; the first call restores the
    // scroll position of a back/forward navigation.
    ready: () => {
      if (!restorePending || id !== navigationId) return;
      restorePending = false;
      window.scrollTo(0, scrollTarget);
    },
  };

  setTitle('');
  if (!restoreScroll) window.scrollTo(0, 0);
  const cleanup = await module.default.mount(container, ctx);
  if (id !== navigationId) {
    cleanup?.();
    return;
  }
  current.cleanup = cleanup ?? null;
  syncBadges();
  if (focus) outlet.focus({ preventScroll: true });
};

export const navigate = (to, { replace = false } = {}) => {
  rememberScroll();
  const state = { key: newKey(), index: replace ? historyIndex() : historyIndex() + 1 };
  if (replace) history.replaceState(state, '', to);
  else history.pushState(state, '', to);
  show();
};

// Updates the query string of the current screen without remounting it (filters, tabs).
export const replaceQuery = (query) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== '' && value !== false) params.set(key, String(value));
  }
  const search = params.toString();
  history.replaceState(history.state, '', `${location.pathname}${search ? `?${search}` : ''}`);
};

export const back = (fallback = '/') => {
  if (historyIndex() > 0) history.back();
  else navigate(fallback, { replace: true });
};

export const reload = () => show({ restoreScroll: true, focus: false });

const isAppLink = (link, event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (link.target || link.hasAttribute('download') || link.dataset.external !== undefined) return false;
  const url = new URL(link.href, location.href);
  return url.origin === location.origin && !url.pathname.startsWith('/api/') && !/\.[a-z0-9]+$/i.test(url.pathname);
};

export const startRouter = (outletElement) => {
  outlet = outletElement;
  if (!history.state?.key) history.replaceState({ key: newKey(), index: 0 }, '', location.href);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  document.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (link && isAppLink(link, event)) {
      event.preventDefault();
      const url = new URL(link.href, location.href);
      navigate(url.pathname + url.search + url.hash);
      return;
    }
    const backButton = event.target instanceof Element ? event.target.closest('[data-action="back"]') : null;
    if (backButton) back(backButton.dataset.fallback || '/');
  });

  window.addEventListener('popstate', () => show({ restoreScroll: true }));
  window.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      rememberScroll();
    });
  }, { passive: true });
  show({ focus: false });
};
