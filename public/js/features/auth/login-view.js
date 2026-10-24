import { safeNext } from '../../app/router.js';
import { loadSession, store } from '../../app/store.js';
import { api } from '../../shared/api.js';
import { appBar } from '../../shared/components.js';
import { bindPasswordToggles, field, handleFormError, input, passwordInput, readForm } from '../../shared/forms.js';
import { $, html, render } from '../../shared/html.js';
import { t } from '../../shared/i18n.js';
import { toast, withBusy } from '../../shared/ui.js';

export default {
  mount(root, { navigate, query, setTitle }) {
    const next = safeNext(query.get('next'));
    setTitle(t('auth.loginTitle'));

    render(root, html`
      ${appBar({ back: true, backTo: '/' })}
      <div class="page page-auth">
        <div class="auth-head">
          <img src="/icons/logo.svg" alt="" width="64" height="64">
          <h1 class="auth-title">${t('auth.loginTitle')}</h1>
          <p class="muted">${t('auth.loginSubtitle')}</p>
        </div>
        <form class="form card card-pad" id="login-form" novalidate>
          ${field({ name: 'phone', label: t('auth.phone'), control: input({ name: 'phone', type: 'tel', inputmode: 'tel', autocomplete: 'tel', placeholder: '06XX XX XX XX', dir: 'ltr', required: true, autofocus: true }) })}
          ${field({ name: 'password', label: t('auth.password'), control: passwordInput({ name: 'password' }) })}
          <a class="text-link text-sm" href="/forgot">${t('auth.forgot')}</a>
          <button class="btn btn-primary btn-lg btn-block" type="submit">${t('auth.loginButton')}</button>
        </form>
        <p class="auth-switch">${t('auth.noAccount')} <a href="/register${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}">${t('auth.createAccount')}</a></p>
      </div>
    `);

    const form = $(root, '#login-form');
    bindPasswordToggles(form);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      withBusy($(form, 'button[type="submit"]'), async () => {
        try {
          await api.post('/api/auth/login', readForm(form));
          await loadSession();
          toast(t('auth.welcomeBack', { name: store.user.name.split(' ')[0] }), { type: 'success' });
          navigate(next, { replace: true });
        } catch (error) {
          handleFormError(form, error);
        }
      });
    });
  },
};
