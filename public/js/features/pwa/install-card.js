import { installMode, onInstallAvailabilityChange, promptInstall } from '../../app/pwa.js';
import { $, html, render } from '../../shared/html.js';
import { t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';
import { openLayer } from '../../shared/ui.js';

const showIosHelp = () => openLayer({
  title: t('pwa.iosTitle'),
  body: html`
    <ol class="steps">
      <li>${t('pwa.iosStep1')}</li>
      <li>${t('pwa.iosStep2')}</li>
      <li>${t('pwa.iosStep3')}</li>
    </ol>
  `,
});

const startInstall = async () => {
  if (installMode() === 'ios') showIosHelp();
  else await promptInstall();
};

// Renders the "install the app" card into `slot` whenever installing is possible, and keeps it
// in sync when the browser makes the prompt available. Returns a cleanup function.
export const mountInstallCard = (slot) => {
  const update = () => {
    const mode = installMode();
    slot.hidden = !mode;
    if (!mode) return;
    render(slot, html`
      <div class="install-card">
        <img src="/icons/logo.svg" alt="" width="48" height="48">
        <div class="install-text">
          <strong>${t('pwa.installTitle')}</strong>
          <span>${t('pwa.installText')}</span>
        </div>
        <button class="btn btn-primary btn-sm" type="button" data-install>${icon('download')}${t('pwa.install')}</button>
      </div>
    `);
    $(slot, '[data-install]').addEventListener('click', startInstall);
  };
  update();
  return onInstallAvailabilityChange(update);
};
