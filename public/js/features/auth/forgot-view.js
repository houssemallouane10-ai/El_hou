import { whatsappLink } from '/shared/phone.js';
import { loadMeta } from '../../app/store.js';
import { appBar } from '../../shared/components.js';
import { $, html, render } from '../../shared/html.js';
import { t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';

// Without SMS verification, passwords are reset by the moderators after they confirm the owner.
export default {
  mount(root, { setTitle }) {
    setTitle(t('auth.forgotTitle'));
    render(root, html`
      ${appBar({ title: t('auth.forgotTitle'), back: true, backTo: '/login' })}
      <div class="page page-narrow stack">
        <section class="card card-pad stack">
          <span class="empty-icon">${icon('key-round')}</span>
          <h1 class="card-title">${t('auth.forgotTitle')}</h1>
          <p>${t('auth.forgotText')}</p>
          <ol class="steps">
            <li>${t('auth.forgotStep1')}</li>
            <li>${t('auth.forgotStep2')}</li>
            <li>${t('auth.forgotStep3')}</li>
          </ol>
          <div data-support></div>
        </section>
      </div>
    `);

    loadMeta().then((meta) => {
      const phone = meta.support?.whatsapp;
      if (!phone) return;
      render($(root, '[data-support]'), html`
        <a class="btn btn-whatsapp btn-block" href="${whatsappLink(phone, t('auth.forgotWhatsapp'))}" target="_blank" rel="noopener" data-external>
          ${icon('whatsapp')}${t('auth.contactSupport')}
        </a>
      `);
    }).catch(() => {});
  },
};
