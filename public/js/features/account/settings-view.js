import { CATEGORIES } from '/shared/catalog.js';
import { LIMITS } from '/shared/limits.js';
import { clearPrivateCaches } from '../../app/pwa.js';
import { store } from '../../app/store.js';
import { THEMES, getTheme, setTheme } from '../../app/theme.js';
import { api } from '../../shared/api.js';
import { appBar } from '../../shared/components.js';
import { bindPasswordToggles, field, handleFormError, passwordInput, readForm } from '../../shared/forms.js';
import { $, html, on, render } from '../../shared/html.js';
import { LANGUAGES, getLang, label, setLang, t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';
import { openLayer, toast, toastError, withBusy } from '../../shared/ui.js';
import { mountInstallCard } from '../pwa/install-card.js';

const THEME_ICONS = { system: 'monitor', light: 'sun', dark: 'moon' };

const appearanceSection = () => html`
  <section class="form-section">
    <h2 class="form-section-title">${icon('globe')}${t('settings.language')}</h2>
    <div class="segmented segmented-full" role="radiogroup" aria-label="${t('settings.language')}">
      ${LANGUAGES.map((language) => html`
        <button class="segment ${getLang() === language.id ? 'is-active' : ''}" type="button" role="radio" aria-checked="${getLang() === language.id}" data-lang="${language.id}" lang="${language.id}">${language.label}</button>
      `)}
    </div>
    <h2 class="form-section-title">${icon('sun')}${t('settings.theme')}</h2>
    <div class="segmented segmented-full" role="radiogroup" aria-label="${t('settings.theme')}" data-themes>
      ${THEMES.map((theme) => html`
        <button class="segment ${getTheme() === theme ? 'is-active' : ''}" type="button" role="radio" aria-checked="${getTheme() === theme}" data-theme-choice="${theme}">${icon(THEME_ICONS[theme])}${t(`settings.themes.${theme}`)}</button>
      `)}
    </div>
  </section>
`;

const alertsSection = (user) => html`
  <section class="form-section">
    <h2 class="form-section-title">${icon('bell')}${t('settings.alerts')}</h2>
    <p class="muted text-sm">${t('settings.alertsHint')}</p>
    <form id="alerts-form">
      <div class="check-grid">
        ${CATEGORIES.map((category) => html`
          <label class="check-chip">
            <input type="checkbox" name="categories" value="${category.id}" data-list${user.alertCategories.includes(category.id) ? html` checked` : null}>
            <span>${icon(category.icon)}${label(category)}</span>
          </label>
        `)}
      </div>
      <button class="btn btn-secondary" type="submit">${icon('check')}${t('settings.saveAlerts')}</button>
    </form>
  </section>
`;

const passwordSection = () => html`
  <section class="form-section">
    <h2 class="form-section-title">${icon('key-round')}${t('settings.password')}</h2>
    <form class="form" id="password-form" novalidate>
      ${field({ name: 'currentPassword', label: t('settings.currentPassword'), control: passwordInput({ name: 'currentPassword' }) })}
      ${field({ name: 'newPassword', label: t('settings.newPassword'), hint: t('auth.passwordHint', { count: LIMITS.password.min }), control: passwordInput({ name: 'newPassword', autocomplete: 'new-password' }) })}
      <button class="btn btn-secondary" type="submit">${t('settings.changePassword')}</button>
    </form>
  </section>
`;

const dangerSection = () => html`
  <section class="form-section danger-zone">
    <h2 class="form-section-title">${icon('triangle-alert')}${t('settings.dangerZone')}</h2>
    <p class="muted text-sm">${t('settings.deleteHint')}</p>
    <button class="btn btn-danger" type="button" data-action="delete-account">${icon('trash-2')}${t('settings.deleteAccount')}</button>
  </section>
`;

export default {
  mount(root, { navigate, setTitle }) {
    const user = store.user;
    setTitle(t('settings.title'));

    render(root, html`
      ${appBar({ title: t('settings.title'), back: true, backTo: '/me' })}
      <div class="page page-narrow stack">
        ${appearanceSection()}
        ${user ? alertsSection(user) : null}
        ${user ? passwordSection() : null}
        <div data-install hidden></div>
        ${user ? dangerSection() : null}
        <p class="center muted text-xs">${t('settings.version', { version: '1.0' })}</p>
      </div>
    `);

    on(root, 'click', '[data-lang]', (event, button) => setLang(button.dataset.lang));

    on(root, 'click', '[data-theme-choice]', (event, button) => {
      setTheme(button.dataset.themeChoice);
      for (const option of root.querySelectorAll('[data-theme-choice]')) {
        const active = option === button;
        option.classList.toggle('is-active', active);
        option.setAttribute('aria-checked', String(active));
      }
    });

    if (user) {
      const alertsForm = $(root, '#alerts-form');
      alertsForm.addEventListener('submit', (event) => {
        event.preventDefault();
        withBusy($(alertsForm, 'button[type="submit"]'), async () => {
          try {
            const { categories } = await api.put('/api/me/alerts', { categories: readForm(alertsForm).categories ?? [] });
            store.setUser({ ...store.user, alertCategories: categories });
            toast(categories.length ? t('settings.alertsSaved', { count: categories.length }) : t('settings.alertsOff'), { type: 'success' });
          } catch (error) {
            toastError(error);
          }
        });
      });

      const passwordForm = $(root, '#password-form');
      bindPasswordToggles(passwordForm);
      passwordForm.addEventListener('submit', (event) => {
        event.preventDefault();
        withBusy($(passwordForm, 'button[type="submit"]'), async () => {
          try {
            await api.put('/api/me/password', readForm(passwordForm));
            passwordForm.reset();
            toast(t('settings.passwordChanged'), { type: 'success' });
          } catch (error) {
            handleFormError(passwordForm, error);
          }
        });
      });

      on(root, 'click', '[data-action="delete-account"]', () => {
        openLayer({
          kind: 'dialog',
          title: t('settings.deleteAccount'),
          body: html`
            <form class="form" id="delete-form" novalidate>
              <p class="dialog-message">${t('settings.deleteConfirm')}</p>
              ${field({ name: 'password', label: t('auth.password'), control: passwordInput({ name: 'password' }) })}
            </form>
          `,
          footer: html`
            <button class="btn btn-secondary" type="button" data-layer-close>${t('common.cancel')}</button>
            <button class="btn btn-danger" type="submit" form="delete-form">${t('settings.deleteForever')}</button>
          `,
          onMount: (panel, layer) => {
            const form = $(panel, '#delete-form');
            bindPasswordToggles(form);
            form.addEventListener('submit', (event) => {
              event.preventDefault();
              withBusy($(panel, 'button[type="submit"]'), async () => {
                try {
                  await api.post('/api/me/deletion', readForm(form));
                  layer.close();
                  clearPrivateCaches();
                  store.clear();
                  toast(t('settings.accountDeleted'), { type: 'success' });
                  navigate('/', { replace: true });
                } catch (error) {
                  handleFormError(form, error);
                }
              });
            });
          },
        });
      });
    }

    return mountInstallCard($(root, '[data-install]'));
  },
};
