import { $, $$, html } from './html.js';
import { hasKey, t } from './i18n.js';
import { toastError } from './ui.js';

// ---------- Controls ----------

const attrs = (pairs) => pairs
  .filter(([, value]) => value !== undefined && value !== null && value !== false)
  .map(([name, value]) => (value === true ? html` ${name}` : html` ${name}="${value}"`));

export const field = ({ name, label, control, hint = null, optional = false, counterMax = null }) => html`
  <div class="field" data-field="${name}">
    <div class="field-top">
      <label class="field-label" for="f-${name}">${label}${optional ? html` <span class="optional">${t('common.optional')}</span>` : null}</label>
      ${counterMax ? html`<span class="field-counter" data-counter-for="${name}" data-max="${counterMax}"></span>` : null}
    </div>
    ${control}
    ${hint ? html`<p class="field-hint">${hint}</p>` : null}
    <p class="field-error" hidden></p>
  </div>
`;

export const input = ({ name, value = '', type = 'text', placeholder, maxlength, inputmode, autocomplete, required, min, max, dir, autofocus }) => html`
  <input class="input" id="f-${name}" name="${name}" type="${type}" value="${value ?? ''}"${attrs([
    ['placeholder', placeholder],
    ['maxlength', maxlength],
    ['inputmode', inputmode],
    ['autocomplete', autocomplete],
    ['required', required],
    ['min', min],
    ['max', max],
    ['dir', dir ?? (type === 'text' || type === 'search' ? 'auto' : null)],
    ['autofocus', autofocus],
  ])}>
`;

export const textarea = ({ name, value = '', rows = 4, placeholder, maxlength, required }) => html`
  <textarea class="textarea" id="f-${name}" name="${name}" rows="${rows}" dir="auto"${attrs([
    ['placeholder', placeholder],
    ['maxlength', maxlength],
    ['required', required],
  ])}>${value ?? ''}</textarea>
`;

export const select = ({ name, options, value = '', placeholder = null, required }) => html`
  <select class="select" id="f-${name}" name="${name}"${attrs([['required', required]])}>
    ${placeholder !== null ? html`<option value="">${placeholder}</option>` : null}
    ${options.map((option) => html`<option value="${option.value}"${option.value === value ? html` selected` : null}>${option.label}</option>`)}
  </select>
`;

export const switchControl = ({ name, checked = false, label, hint = null }) => html`
  <label class="switch-row" data-field="${name}">
    <span class="switch-text">
      <span class="switch-label">${label}</span>
      ${hint ? html`<span class="field-hint">${hint}</span>` : null}
    </span>
    <input class="switch-input" type="checkbox" id="f-${name}" name="${name}"${checked ? html` checked` : null}>
    <span class="switch" aria-hidden="true"></span>
  </label>
`;

export const passwordInput = ({ name, autocomplete = 'current-password', placeholder }) => html`
  <div class="input-group">
    ${input({ name, type: 'password', autocomplete, placeholder, required: true })}
    <button class="input-addon" type="button" data-action="toggle-password" aria-label="${t('auth.showPassword')}" aria-pressed="false">${t('auth.show')}</button>
  </div>
`;

// ---------- Reading and errors ----------

// Collects named controls: checkboxes become booleans, `data-list` groups become arrays
// (checked boxes, or every hidden input of the group).
export const readForm = (form) => {
  const values = {};
  for (const element of form.elements) {
    if (!element.name || element.disabled) continue;
    if (element.dataset.list !== undefined) {
      values[element.name] ??= [];
      if (element.type !== 'checkbox' || element.checked) values[element.name].push(element.value);
    } else if (element.type === 'checkbox') values[element.name] = element.checked;
    else if (element.type === 'radio') {
      if (element.checked) values[element.name] = element.value;
    } else values[element.name] = element.value;
  }
  return values;
};

const clearErrors = (form) => {
  for (const error of $$(form, '.field-error')) {
    error.hidden = true;
    error.textContent = '';
  }
  for (const control of $$(form, '[aria-invalid="true"]')) control.removeAttribute('aria-invalid');
};

// Shows server field errors next to their controls. Returns false when none matched a control.
const showFieldErrors = (form, fields) => {
  clearErrors(form);
  let firstControl = null;
  for (const [name, code] of Object.entries(fields ?? {})) {
    const holder = $(form, `[data-field="${CSS.escape(name)}"]`);
    if (!holder) continue;
    const error = $(holder, '.field-error');
    if (error) {
      error.textContent = hasKey(`fieldErrors.${code}`) ? t(`fieldErrors.${code}`) : t('fieldErrors.invalid');
      error.hidden = false;
    }
    const control = $(holder, 'input, select, textarea');
    if (control) {
      control.setAttribute('aria-invalid', 'true');
      firstControl ??= control;
    }
  }
  if (firstControl) {
    firstControl.focus({ preventScroll: true });
    firstControl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return true;
  }
  return false;
};

export const handleFormError = (form, error) => {
  if (error?.code === 'VALIDATION_FAILED' && showFieldErrors(form, error.fields)) return;
  toastError(error);
};

export const bindCounters = (form) => {
  const update = (counter) => {
    const control = form.elements.namedItem(counter.dataset.counterFor);
    if (!control) return;
    const length = control.value.length;
    const max = Number(counter.dataset.max);
    counter.textContent = `${length}/${max}`;
    counter.classList.toggle('is-near', length > max * 0.9);
  };
  const counters = $$(form, '[data-counter-for]');
  counters.forEach(update);
  form.addEventListener('input', (event) => {
    for (const counter of counters) if (counter.dataset.counterFor === event.target.name) update(counter);
  });
};

export const bindPasswordToggles = (root) => {
  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="toggle-password"]');
    if (!button) return;
    const control = button.parentElement.querySelector('input');
    const visible = control.type === 'text';
    control.type = visible ? 'password' : 'text';
    button.textContent = visible ? t('auth.show') : t('auth.hide');
    button.setAttribute('aria-pressed', String(!visible));
  });
};
