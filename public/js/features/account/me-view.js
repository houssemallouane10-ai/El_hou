import { ROLES, findById } from '/shared/catalog.js';
import { formatPhone } from '/shared/phone.js';
import { clearPrivateCaches } from '../../app/pwa.js';
import { store } from '../../app/store.js';
import { api } from '../../shared/api.js';
import { appBar, avatar, verifiedMark } from '../../shared/components.js';
import { $, html, on, render } from '../../shared/html.js';
import { label, t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';
import { confirmDialog, toast, toastError } from '../../shared/ui.js';
import { mountInstallCard } from '../pwa/install-card.js';
import { profileCompletion } from './profile-completion.js';

const menuItem = ({ href, iconName, text, badge = null, tone = '' }) => html`
  <a class="list-item ${tone}" href="${href}">
    <span class="list-icon">${icon(iconName)}</span>
    <span class="list-text">${text}</span>
    ${badge ? html`<span class="count count-inline" data-badge="${badge}" hidden></span>` : null}
    ${icon('chevron-right', 'flip-rtl list-chevron')}
  </a>
`;

const appLinks = () => html`
  <nav class="list card">
    ${menuItem({ href: '/settings', iconName: 'settings', text: t('me.settings') })}
    ${menuItem({ href: '/about', iconName: 'info', text: t('pages.about.title') })}
    ${menuItem({ href: '/safety', iconName: 'shield', text: t('pages.safety.title') })}
    ${menuItem({ href: '/terms', iconName: 'file-text', text: t('pages.terms.title') })}
    ${menuItem({ href: '/privacy', iconName: 'lock', text: t('pages.privacy.title') })}
  </nav>
`;

const guestMarkup = () => html`
  <section class="card welcome-card">
    <img src="/icons/logo.svg" alt="" width="64" height="64">
    <h1 class="welcome-title">${t('me.guestTitle')}</h1>
    <p class="muted">${t('me.guestText')}</p>
    <div class="welcome-actions">
      <a class="btn btn-primary btn-block" href="/register">${t('auth.createAccount')}</a>
      <a class="btn btn-secondary btn-block" href="/login">${t('auth.login')}</a>
    </div>
  </section>
  <div data-install hidden></div>
  ${appLinks()}
`;

const completionCard = (user) => {
  const { percent, missing } = profileCompletion(user);
  if (percent === 100) return null;
  return html`
    <a class="card completion" href="/me/edit">
      <div class="completion-top">
        <strong>${t('me.completion', { percent })}</strong>
        <span class="section-link">${t('me.complete')}${icon('chevron-right', 'flip-rtl')}</span>
      </div>
      <progress class="meter" max="100" value="${percent}">${percent}%</progress>
      <p class="muted text-sm">${t('me.completionHint', { fields: missing.map((field) => t(`profileFields.${field}`)).join(t('common.listSeparator')) })}</p>
    </a>
  `;
};

const memberMarkup = (user) => html`
  <section class="card me-card">
    ${avatar(user, 'xl')}
    <div class="me-text">
      <h1 class="me-name">${user.name}${verifiedMark(user)}</h1>
      ${user.companyName ? html`<p class="muted">${user.companyName}</p>` : null}
      <p class="muted text-sm" dir="ltr">${formatPhone(user.phone)}</p>
      <span class="tags">
        <span class="badge badge-muted">${label(findById(ROLES, user.role))}</span>
        ${user.isOwner ? html`<span class="badge badge-featured">${icon('star')}${t('me.ownerBadge')}</span>` : null}
      </span>
    </div>
    <a class="btn btn-secondary btn-sm" href="${user.isListed || user.role === 'employer' ? `/u/${user.id}` : '/me/edit'}">${t('me.viewProfile')}</a>
  </section>

  ${completionCard(user)}

  <nav class="list card" aria-label="${t('me.activity')}">
    <p class="list-heading">${t('me.activity')}</p>
    ${menuItem({ href: '/me/jobs', iconName: 'briefcase', text: t('me.myJobs'), badge: 'applications' })}
    ${menuItem({ href: '/me/applications', iconName: 'send', text: t('me.myApplications') })}
    ${menuItem({ href: '/saved', iconName: 'bookmark', text: t('me.saved') })}
    ${menuItem({ href: '/messages', iconName: 'message-circle', text: t('nav.messages'), badge: 'messages' })}
    ${menuItem({ href: '/notifications', iconName: 'bell', text: t('nav.notifications'), badge: 'notifications' })}
  </nav>

  <nav class="list card" aria-label="${t('me.account')}">
    <p class="list-heading">${t('me.account')}</p>
    ${menuItem({ href: '/me/edit', iconName: 'pencil', text: t('me.editProfile') })}
    ${menuItem({ href: '/settings', iconName: 'settings', text: t('me.settingsFull') })}
    ${user.isAdmin ? menuItem({ href: '/admin', iconName: 'layout-dashboard', text: t('me.admin'), tone: 'is-accent' }) : null}
  </nav>

  <div data-install hidden></div>

  <nav class="list card" aria-label="${t('common.appName')}">
    <p class="list-heading">${t('common.appName')}</p>
    ${menuItem({ href: '/about', iconName: 'info', text: t('pages.about.title') })}
    ${menuItem({ href: '/safety', iconName: 'shield', text: t('pages.safety.title') })}
    ${menuItem({ href: '/terms', iconName: 'file-text', text: t('pages.terms.title') })}
    ${menuItem({ href: '/privacy', iconName: 'lock', text: t('pages.privacy.title') })}
  </nav>

  <button class="btn btn-ghost btn-danger-text btn-block" type="button" data-action="logout">${icon('log-out', 'flip-rtl')}${t('me.logout')}</button>
`;

export default {
  mount(root, { navigate, setTitle }) {
    const user = store.user;
    setTitle(t('nav.account'));
    render(root, html`
      ${appBar({ title: t('nav.account') })}
      <div class="page page-narrow stack">${user ? memberMarkup(user) : guestMarkup()}</div>
    `);

    on(root, 'click', '[data-action="logout"]', async () => {
      const confirmed = await confirmDialog({ title: t('me.logout'), message: t('me.logoutConfirm'), confirmLabel: t('me.logout') });
      if (!confirmed) return;
      try {
        await api.post('/api/auth/logout');
      } catch (error) {
        toastError(error);
        return;
      }
      clearPrivateCaches();
      store.clear();
      toast(t('me.loggedOut'), { type: 'success' });
      navigate('/', { replace: true });
    });

    return mountInstallCard($(root, '[data-install]'));
  },
};
