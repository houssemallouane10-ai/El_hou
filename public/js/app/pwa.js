import { t } from '../shared/i18n.js';
import { toast } from '../shared/ui.js';

// ---------- Service worker and updates ----------

export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return;
  const secure = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!secure) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });

  const offerUpdate = (worker) => {
    toast(t('pwa.updateReady'), {
      duration: 0,
      actionLabel: t('pwa.update'),
      onAction: () => worker.postMessage('skip-waiting'),
    });
  };

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker);
      });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update().catch(() => {});
    });
  } catch {
    // The app works without offline support.
  }
};

export const clearPrivateCaches = () => {
  navigator.serviceWorker?.controller?.postMessage('clear-data');
};

// ---------- Install prompt ----------

let deferredPrompt = null;
const installListeners = new Set();

const notifyInstall = () => {
  for (const listener of installListeners) listener();
};

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  notifyInstall();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  notifyInstall();
  toast(t('pwa.installed'), { type: 'success' });
});

const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// 'prompt' when the browser can show its install dialog, 'ios' when the user must use the
// Share menu, null when installing is not possible or already done.
export const installMode = () => {
  if (isStandalone()) return null;
  if (deferredPrompt) return 'prompt';
  if (isIos()) return 'ios';
  return null;
};

export const promptInstall = async () => {
  if (!deferredPrompt) return false;
  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  await promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  notifyInstall();
  return outcome === 'accepted';
};

export const onInstallAvailabilityChange = (listener) => {
  installListeners.add(listener);
  return () => installListeners.delete(listener);
};
