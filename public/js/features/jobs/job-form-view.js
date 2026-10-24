import { CATEGORIES, DEFAULT_JOB_DURATION_DAYS, JOB_DURATIONS_DAYS, JOB_TYPES, SALARY_PERIODS } from '/shared/catalog.js';
import { LIMITS } from '/shared/limits.js';
import { normalizePhone } from '/shared/phone.js';
import { store } from '../../app/store.js';
import { api, isAbort } from '../../shared/api.js';
import { appBar, errorState } from '../../shared/components.js';
import { sortedLocations } from '../../shared/format.js';
import { bindCounters, field, handleFormError, input, readForm, select, switchControl, textarea } from '../../shared/forms.js';
import { $, html, on, render } from '../../shared/html.js';
import { label, t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';
import { toast, withBusy } from '../../shared/ui.js';

const DRAFT_KEY = 'khedmati.jobDraft';
const DRAFT_DELAY_MS = 600;

const readDraft = () => {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null');
  } catch {
    return null;
  }
};

const writeDraft = (values) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
  } catch {
    // Storage full or blocked: drafts are a convenience.
  }
};

const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear.
  }
};

// Accepts Western and Arabic-Indic digits, spaces and separators: "٤٥ ٠٠٠" -> 45000.
const toAmount = (value) => {
  const digits = normalizePhone(value).replace(/\D/g, '');
  return digits ? Number(digits) : null;
};

const radioChips = (name, options, value) => html`
  <div class="chips" role="radiogroup">
    ${options.map((option) => html`
      <label class="chip-radio"><input type="radio" name="${name}" value="${option.value}"${String(option.value) === String(value) ? html` checked` : null}><span>${option.label}</span></label>
    `)}
  </div>
`;

const formMarkup = (values, { isEdit }) => html`
  <form class="form job-form" id="job-form" novalidate>
    <section class="form-section">
      <h2 class="form-section-title">${icon('briefcase')}${t('jobForm.basics')}</h2>
      ${field({
        name: 'title',
        label: t('jobForm.title'),
        counterMax: LIMITS.jobTitle.max,
        hint: t('jobForm.titleHint'),
        control: input({ name: 'title', value: values.title, maxlength: LIMITS.jobTitle.max, placeholder: t('jobForm.titlePlaceholder'), required: true }),
      })}
      ${field({
        name: 'category',
        label: t('jobForm.category'),
        control: select({ name: 'category', value: values.category, placeholder: t('jobForm.choose'), required: true, options: CATEGORIES.map((item) => ({ value: item.id, label: label(item) })) }),
      })}
      <fieldset class="field" data-field="jobType">
        <legend class="field-label">${t('jobForm.jobType')}</legend>
        ${radioChips('jobType', JOB_TYPES.map((item) => ({ value: item.id, label: label(item) })), values.jobType)}
        <p class="field-error" hidden></p>
      </fieldset>
      ${field({
        name: 'positions',
        label: t('jobForm.positions'),
        control: html`
          <div class="stepper">
            <button class="icon-btn" type="button" data-step="-1" aria-label="−">${icon('minus')}</button>
            ${input({ name: 'positions', value: values.positions, type: 'number', min: LIMITS.positions.min, max: LIMITS.positions.max, inputmode: 'numeric' })}
            <button class="icon-btn" type="button" data-step="1" aria-label="+">${icon('plus')}</button>
          </div>
        `,
      })}
    </section>

    <section class="form-section">
      <h2 class="form-section-title">${icon('map-pin')}${t('jobForm.place')}</h2>
      ${field({
        name: 'location',
        label: t('jobForm.location'),
        control: select({ name: 'location', value: values.location, required: true, options: sortedLocations().map((item) => ({ value: item.id, label: label(item) })) }),
      })}
      ${field({
        name: 'address',
        label: t('jobForm.address'),
        optional: true,
        control: input({ name: 'address', value: values.address, maxlength: LIMITS.address.max, placeholder: t('jobForm.addressPlaceholder') }),
      })}
    </section>

    <section class="form-section">
      <h2 class="form-section-title">${icon('banknote')}${t('jobForm.pay')}</h2>
      <fieldset class="field" data-field="salaryPeriod">
        <legend class="field-label">${t('jobForm.salaryPeriod')}</legend>
        ${radioChips('salaryPeriod', SALARY_PERIODS.map((item) => ({ value: item.id, label: label(item) })), values.salaryPeriod)}
        <p class="field-error" hidden></p>
      </fieldset>
      <div class="grid-2" data-amounts ${values.salaryPeriod === 'negotiable' ? 'hidden' : ''}>
        ${field({
          name: 'salaryMin',
          label: t('jobForm.salaryMin'),
          control: html`<div class="input-group">${input({ name: 'salaryMin', value: values.salaryMin ?? '', inputmode: 'numeric', placeholder: '30000', dir: 'ltr' })}<span class="input-addon">${t('common.currency')}</span></div>`,
        })}
        ${field({
          name: 'salaryMax',
          label: t('jobForm.salaryMax'),
          optional: true,
          control: html`<div class="input-group">${input({ name: 'salaryMax', value: values.salaryMax ?? '', inputmode: 'numeric', placeholder: '45000', dir: 'ltr' })}<span class="input-addon">${t('common.currency')}</span></div>`,
        })}
      </div>
    </section>

    <section class="form-section">
      <h2 class="form-section-title">${icon('file-text')}${t('jobForm.details')}</h2>
      ${field({
        name: 'description',
        label: t('jobForm.description'),
        counterMax: LIMITS.jobDescription.max,
        hint: t('jobForm.descriptionHint'),
        control: textarea({ name: 'description', value: values.description, rows: 6, maxlength: LIMITS.jobDescription.max, placeholder: t('jobForm.descriptionPlaceholder'), required: true }),
      })}
      ${field({
        name: 'requirements',
        label: t('jobForm.requirements'),
        optional: true,
        counterMax: LIMITS.jobRequirements.max,
        control: textarea({ name: 'requirements', value: values.requirements, rows: 3, maxlength: LIMITS.jobRequirements.max, placeholder: t('jobForm.requirementsPlaceholder') }),
      })}
    </section>

    <section class="form-section">
      <h2 class="form-section-title">${icon('phone')}${t('jobForm.contact')}</h2>
      ${field({
        name: 'contactPhone',
        label: t('jobForm.contactPhone'),
        control: input({ name: 'contactPhone', value: values.contactPhone, type: 'tel', inputmode: 'tel', autocomplete: 'tel', placeholder: '06XX XX XX XX', dir: 'ltr', required: true }),
      })}
      ${field({
        name: 'contactWhatsapp',
        label: t('jobForm.contactWhatsapp'),
        optional: true,
        hint: t('jobForm.contactWhatsappHint'),
        control: input({ name: 'contactWhatsapp', value: values.contactWhatsapp, type: 'tel', inputmode: 'tel', placeholder: '06XX XX XX XX', dir: 'ltr' }),
      })}
    </section>

    <section class="form-section">
      <h2 class="form-section-title">${icon('settings')}${t('jobForm.options')}</h2>
      ${switchControl({ name: 'isUrgent', checked: values.isUrgent, label: t('jobForm.isUrgent'), hint: t('jobForm.isUrgentHint') })}
      ${isEdit ? null : html`
        <fieldset class="field" data-field="durationDays">
          <legend class="field-label">${t('jobForm.duration')}</legend>
          ${radioChips('durationDays', JOB_DURATIONS_DAYS.map((days) => ({ value: days, label: t('jobForm.days', { count: days }) })), values.durationDays)}
          <p class="field-error" hidden></p>
        </fieldset>
      `}
    </section>

    <div class="form-actions">
      <button class="btn btn-primary btn-lg btn-block" type="submit">${isEdit ? html`${icon('check')}${t('jobForm.saveChanges')}` : html`${icon('send', 'flip-rtl')}${t('jobForm.publish')}`}</button>
    </div>
  </form>
`;

const defaultsFor = (user) => ({
  title: '',
  category: '',
  jobType: 'full_time',
  positions: 1,
  location: user.location || 'bir-el-ater',
  address: '',
  salaryPeriod: 'month',
  salaryMin: '',
  salaryMax: '',
  description: '',
  requirements: '',
  contactPhone: user.phone,
  contactWhatsapp: user.whatsapp || user.phone,
  isUrgent: false,
  durationDays: DEFAULT_JOB_DURATION_DAYS,
});

const valuesFromJob = (job) => ({
  title: job.title,
  category: job.category,
  jobType: job.jobType,
  positions: job.positions,
  location: job.location,
  address: job.address ?? '',
  salaryPeriod: job.salary.period,
  salaryMin: job.salary.min ?? '',
  salaryMax: job.salary.max ?? '',
  description: job.description,
  requirements: job.requirements ?? '',
  contactPhone: job.contact.phone,
  contactWhatsapp: job.contact.whatsapp ?? '',
  isUrgent: job.isUrgent,
});

const toPayload = (values, { isEdit }) => {
  const negotiable = values.salaryPeriod === 'negotiable';
  return {
    title: values.title,
    category: values.category,
    jobType: values.jobType,
    positions: Number(values.positions) || 1,
    location: values.location,
    address: values.address,
    salaryPeriod: values.salaryPeriod,
    salaryMin: negotiable ? null : toAmount(values.salaryMin),
    salaryMax: negotiable ? null : toAmount(values.salaryMax),
    description: values.description,
    requirements: values.requirements,
    contactPhone: values.contactPhone,
    contactWhatsapp: values.contactWhatsapp,
    isUrgent: Boolean(values.isUrgent),
    ...(isEdit ? {} : { durationDays: Number(values.durationDays) || DEFAULT_JOB_DURATION_DAYS }),
  };
};

export default {
  mount(root, { params, navigate, signal, setTitle, query }) {
    const isEdit = Boolean(params.id);
    const title = isEdit ? t('jobForm.editTitle') : t('jobForm.newTitle');
    let draftTimer = 0;
    setTitle(title);

    const renderForm = (values) => {
      render(root, html`
        ${appBar({ title, back: true, backTo: isEdit ? `/jobs/${params.id}` : '/' })}
        <div class="page page-narrow">
          ${!isEdit && query.get('welcome') ? html`<div class="notice notice-success">${icon('sparkles')}<span>${t('jobForm.welcome')}</span></div>` : null}
          ${formMarkup(values, { isEdit })}
        </div>
      `);
      const form = $(root, '#job-form');
      bindCounters(form);

      on(form, 'change', 'input[name="salaryPeriod"]', (event, radio) => {
        $(form, '[data-amounts]').hidden = radio.value === 'negotiable';
      });

      on(form, 'click', '[data-step]', (event, button) => {
        const control = form.elements.positions;
        const next = (Number(control.value) || 1) + Number(button.dataset.step);
        control.value = String(Math.min(LIMITS.positions.max, Math.max(LIMITS.positions.min, next)));
      });

      if (!isEdit) {
        form.addEventListener('input', () => {
          clearTimeout(draftTimer);
          draftTimer = setTimeout(() => writeDraft(readForm(form)), DRAFT_DELAY_MS);
        });
      }

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const payload = toPayload(readForm(form), { isEdit });
        withBusy($(form, 'button[type="submit"]'), async () => {
          try {
            const data = isEdit
              ? await api.patch(`/api/jobs/${params.id}`, payload)
              : await api.post('/api/jobs', payload);
            clearTimeout(draftTimer);
            if (!isEdit) clearDraft();
            toast(isEdit ? t('jobForm.updated') : t('jobForm.published'), { type: 'success', duration: 5000 });
            navigate(`/jobs/${data.job.id}`, { replace: true });
          } catch (error) {
            handleFormError(form, error);
          }
        });
      });
    };

    if (isEdit) {
      render(root, html`${appBar({ title, back: true, backTo: `/jobs/${params.id}` })}<div class="page page-narrow"><div class="skeleton skeleton-block"></div></div>`);
      api.get(`/api/jobs/${params.id}`, null, { signal }).then(({ job }) => {
        if (!job.isOwner) throw Object.assign(new Error('JOB_NOT_FOUND'), { code: 'JOB_NOT_FOUND' });
        renderForm(valuesFromJob(job));
      }).catch((error) => {
        if (isAbort(error)) return;
        render(root, html`${appBar({ title, back: true })}<div class="page">${errorState(error)}</div>`);
        on(root, 'click', '[data-action="retry"]', () => navigate(location.pathname, { replace: true }));
      });
    } else {
      const draft = readDraft();
      renderForm({ ...defaultsFor(store.user), ...(draft ?? {}) });
      if (draft?.title || draft?.description) {
        toast(t('jobForm.draftRestored'), {
          actionLabel: t('jobForm.discardDraft'),
          onAction: () => {
            clearDraft();
            renderForm(defaultsFor(store.user));
          },
          duration: 6000,
        });
      }
    }

    return () => clearTimeout(draftTimer);
  },
};
