import { $, html, on, render } from './html.js';
import { hasKey, t } from './i18n.js';
import { icon } from './icons.js';

// ---------- Toasts ----------

const TOAST_ICONS = { success: 'circle-check', error: 'triangle-alert', info: 'info' };

export const toast = (message, { type = 'info', actionLabel = null, onAction = null, duration = 4000 } = {}) => {
  const element = document.createElement('div');
  element.className = `toast toast-${type}`;
  element.setAttribute('role', type === 'error' ? 'alert' : 'status');
  render(element, html`
    <span class="toast-icon">${icon(TOAST_ICONS[type] ?? 'info')}</span>
    <span class="toast-text">${message}</span>
    ${actionLabel ? html`<button class="toast-action" type="button">${actionLabel}</button>` : null}
  `);
  const dismiss = () => {
    element.classList.remove('is-visible');
    setTimeout(() => element.remove(), 250);
  };
  if (actionLabel) {
    $(element, '.toast-action').addEventListener('click', () => {
      dismiss();
      onAction?.();
    });
  }
  document.getElementById('toasts').append(element);
  requestAnimationFrame(() => element.classList.add('is-visible'));
  if (duration) setTimeout(dismiss, duration);
  return dismiss;
};

export const errorMessage = (error) => {
  const key = `errors.${error?.code}`;
  return hasKey(key) ? t(key) : t('errors.default');
};

export const toastError = (error) => toast(errorMessage(error), { type: 'error' });

// ---------- Dialogs and bottom sheets ----------

const layers = [];
let layerCounter = 0;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

document.addEventListener('keydown', (event) => {
  const top = layers.at(-1);
  if (!top) return;
  if (event.key === 'Escape' && top.dismissible) {
    event.preventDefault();
    top.close();
  }
  if (event.key === 'Tab') {
    const focusable = [...top.panel.querySelectorAll(FOCUSABLE)].filter((element) => element.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

// Opens a modal layer. `kind` is 'sheet' (slides up on phones) or 'dialog' (centered).
// Resolves `layer.result` with the value passed to close().
export const openLayer = ({ kind = 'sheet', title, body, footer = null, dismissible = true, onMount = null }) => {
  const id = `layer-${++layerCounter}`;
  const previousFocus = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = `overlay overlay-${kind}`;
  render(overlay, html`
    <div class="layer ${kind}" role="dialog" aria-modal="true" aria-labelledby="${id}-title" tabindex="-1">
      ${kind === 'sheet' ? html`<div class="sheet-handle" aria-hidden="true"></div>` : null}
      <header class="layer-head">
        <h2 class="layer-title" id="${id}-title">${title}</h2>
        ${dismissible ? html`<button class="icon-btn" type="button" data-layer-close aria-label="${t('common.close')}">${icon('x')}</button>` : null}
      </header>
      <div class="layer-body">${body}</div>
      ${footer ? html`<footer class="layer-foot">${footer}</footer>` : null}
    </div>
  `);
  const panel = overlay.firstElementChild;
  let resolveResult;
  const layer = {
    panel,
    dismissible,
    result: new Promise((resolve) => {
      resolveResult = resolve;
    }),
    close(value) {
      const index = layers.indexOf(layer);
      if (index === -1) return;
      layers.splice(index, 1);
      overlay.classList.remove('is-open');
      setTimeout(() => overlay.remove(), 250);
      if (layers.length === 0) document.body.classList.remove('has-layer');
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
      resolveResult(value);
    },
  };
  layers.push(layer);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay && dismissible) layer.close();
  });
  on(overlay, 'click', '[data-layer-close]', () => layer.close());
  document.getElementById('overlays').append(overlay);
  document.body.classList.add('has-layer');
  requestAnimationFrame(() => overlay.classList.add('is-open'));
  onMount?.(panel, layer);
  setTimeout(() => {
    const target = panel.querySelector('[autofocus]') ?? panel.querySelector('input, textarea, select') ?? panel;
    target.focus({ preventScroll: true });
  }, 60);
  return layer;
};

export const closeAllLayers = () => {
  for (const layer of [...layers].reverse()) layer.close();
};

export const confirmDialog = ({ title, message, confirmLabel = t('common.confirm'), danger = false }) => {
  const layer = openLayer({
    kind: 'dialog',
    title,
    body: html`<p class="dialog-message">${message}</p>`,
    footer: html`
      <button class="btn btn-secondary" type="button" data-layer-close>${t('common.cancel')}</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" type="button" data-confirm>${confirmLabel}</button>
    `,
    onMount: (panel, self) => $(panel, '[data-confirm]').addEventListener('click', () => self.close(true)),
  });
  return layer.result.then((value) => value === true);
};

// ---------- Async buttons and sharing ----------

// Disables the button and shows a spinner while `task` runs.
export const withBusy = async (button, task) => {
  if (!button || button.getAttribute('aria-busy') === 'true') return undefined;
  button.setAttribute('aria-busy', 'true');
  button.disabled = true;
  try {
    return await task();
  } finally {
    button.removeAttribute('aria-busy');
    button.disabled = false;
  }
};

export const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const shareLink = async ({ title, text, url }) => {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  if (await copyText(url)) toast(t('common.linkCopied'), { type: 'success' });
  else toast(url);
};
