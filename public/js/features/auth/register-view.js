import { ROLES } from '/shared/catalog.js';
import { LIMITS } from '/shared/limits.js';
import { safeNext } from '../../app/router.js';
import { loadSession } from '../../app/store.js';
import { api } from '../../shared/api.js';
import { appBar } from '../../shared/components.js';
import { bindPasswordToggles, field, handleFormError, input, passwordInput, readForm } from '../../shared/forms.js';
import { $, html, render } from '../../shared/html.js';
import { label, t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';
import { toast, withBusy } from '../../shared/ui.js';

const ROLE_DETAILS = { seeker: 'auth.seekerHint', employer: 'auth.employerHint' };

export default {
  mount(root, { navigate, query, setTitle }) {
    const next = query.get('next') ? safeNext(query.get('next')) : null;
    const presetRole = ROLES.some((role) => role.id === query.get('role')) ? query.get('role') : 'seeker';
    setTitle(t('auth.registerTitle'));

    render(root, html`
      ${appBar({ back: true, backTo: '/' })}
      <div class="page page-auth">
        <div class="auth-head">
          <img src="/icons/logo.svg" alt="" width="64" height="64">
          <h1 class="auth-title">${t('auth.registerTitle')}</h1>
          <p class="muted">${t('auth.registerSubtitle')}</p>
        </div>
        <form class="form card card-pad" id="register-form" novalidate>
          <fieldset class="field" data-field="role">
            <legend class="field-label">${t('auth.roleQuestion')}</legend>
            <div class="choice-cards">
              ${ROLES.map((role) => html`
                <label class="choice-card">
                  <input type="radio" name="role" value="${role.id}"${role.id === presetRole ? html` checked` : null}>
                  <span class="choice-icon">${icon(role.id === 'employer' ? 'building-2' : 'search')}</span>
                  <span class="choice-title">${label(role)}</span>
                  <span class="choice-text">${t(ROLE_DETAILS[role.id])}</span>
                </label>
              `)}
            </div>
            <p class="field-error" hidden></p>
          </fieldset>
          ${field({ name: 'name', label: t('auth.name'), control: input({ name: 'name', autocomplete: 'name', maxlength: LIMITS.name.max, placeholder: t('auth.namePlaceholder'), required: true }) })}
          ${field({ name: 'phone', label: t('auth.phone'), hint: t('auth.phoneHint'), control: input({ name: 'phone', type: 'tel', inputmode: 'tel', autocomplete: 'tel', placeholder: '06XX XX XX XX', dir: 'ltr', required: true }) })}
          ${field({ name: 'password', label: t('auth.password'), hint: t('auth.passwordHint', { count: LIMITS.password.min }), control: passwordInput({ name: 'password', autocomplete: 'new-password' }) })}
          <p class="text-sm muted">${t('auth.agreePrefix')} <a href="/terms">${t('pages.terms.title')}</a> ${t('auth.agreeAnd')} <a href="/privacy">${t('pages.privacy.title')}</a>.</p>
          <button class="btn btn-primary btn-lg btn-block" type="submit">${t('auth.registerButton')}</button>
        </form>
        <p class="auth-switch">${t('auth.haveAccount')} <a href="/login${next ? `?next=${encodeURIComponent(next)}` : ''}">${t('auth.login')}</a></p>
      </div>
    `);

    const form = $(root, '#register-form');
    bindPasswordToggles(form);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      withBusy($(form, 'button[type="submit"]'), async () => {
        try {
          const values = readForm(form);
          const { user } = await api.post('/api/auth/register', values);
          await loadSession();
          toast(t('auth.welcome', { name: user.name.split(' ')[0] }), { type: 'success', duration: 5000 });
          const destination = next ?? (user.role === 'employer' ? '/jobs/new?welcome=1' : '/me/edit?listing=1&welcome=1');
          navigate(destination, { replace: true });
        } catch (error) {
          handleFormError(form, error);
        }
      });
    });
  },
};
