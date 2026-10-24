import { REPORT_REASONS } from '/shared/catalog.js';
import { LIMITS } from '/shared/limits.js';
import { store } from '../../app/store.js';
import { api } from '../../shared/api.js';
import { field, handleFormError, readForm, textarea } from '../../shared/forms.js';
import { $, html } from '../../shared/html.js';
import { label, t } from '../../shared/i18n.js';
import { openLayer, toast, toastError, withBusy } from '../../shared/ui.js';

// Lets a signed-in user flag an offer or a person for the moderators.
export const openReportSheet = ({ targetType, targetId, navigate }) => {
  if (!store.user) {
    navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
    return;
  }
  openLayer({
    title: t('report.title'),
    body: html`
      <form class="form" id="report-form" novalidate>
        <p class="muted">${t('report.intro')}</p>
        <fieldset class="field radio-list" data-field="reason">
          <legend class="field-label">${t('report.reason')}</legend>
          ${REPORT_REASONS.map((reason, index) => html`
            <label class="radio-row">
              <input type="radio" name="reason" value="${reason.id}"${index === 0 ? html` checked` : null}>
              <span>${label(reason)}</span>
            </label>
          `)}
          <p class="field-error" hidden></p>
        </fieldset>
        ${field({
          name: 'details',
          label: t('report.details'),
          optional: true,
          counterMax: LIMITS.reportDetails.max,
          control: textarea({ name: 'details', rows: 3, maxlength: LIMITS.reportDetails.max, placeholder: t('report.detailsPlaceholder') }),
        })}
      </form>
    `,
    footer: html`<button class="btn btn-danger btn-block" type="submit" form="report-form">${t('report.submit')}</button>`,
    onMount: (panel, layer) => {
      const form = $(panel, '#report-form');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const button = $(panel, 'button[type="submit"]');
        withBusy(button, async () => {
          try {
            await api.post('/api/reports', { targetType, targetId, ...readForm(form) });
            layer.close();
            toast(t('report.sent'), { type: 'success' });
          } catch (error) {
            if (error.code === 'ALREADY_REPORTED') {
              layer.close();
              toastError(error);
            } else handleFormError(form, error);
          }
        });
      });
    },
  });
};
