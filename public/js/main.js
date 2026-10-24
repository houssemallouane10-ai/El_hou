import { onUnauthorized } from './shared/api.js';
import { render } from './shared/html.js';
import { applyLang, onLangChange } from './shared/i18n.js';
import { iconSprite } from './shared/icons.js';
import { registerServiceWorker } from './app/pwa.js';
import { navigate, reload, startRouter } from './app/router.js';
import { renderTabbar, startShell } from './app/shell.js';
import { loadSession, refreshSummary, store } from './app/store.js';
import { applyTheme, watchSystemTheme } from './app/theme.js';

const SUMMARY_INTERVAL_MS = 30_000;

const mountIconSprite = () => {
  const holder = document.createElement('div');
  holder.hidden = true;
  render(holder, iconSprite());
  document.body.prepend(holder);
};

// Unread counters refresh every 30 s while the app is visible, and right away on return.
const startSummaryPolling = () => {
  setInterval(() => {
    if (document.visibilityState === 'visible') refreshSummary();
  }, SUMMARY_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshSummary();
  });
};

const boot = async () => {
  applyLang();
  applyTheme();
  watchSystemTheme();
  mountIconSprite();
  startShell({ navigate, onBackOnline: refreshSummary });

  try {
    await loadSession();
  } catch {
    store.clear();
  }

  // A request that finds the session gone (expired, signed out elsewhere) resets the app state;
  // re-showing the screen sends the user to /login only if that screen needs an account.
  onUnauthorized(() => {
    if (!store.user) return;
    store.clear();
    reload();
  });

  onLangChange(() => {
    renderTabbar();
    reload();
  });

  startRouter(document.getElementById('outlet'));
  startSummaryPolling();
  registerServiceWorker();
};

boot();
