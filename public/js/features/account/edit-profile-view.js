import { CATEGORIES, ROLES } from '/shared/catalog.js';
import { LIMITS } from '/shared/limits.js';
import { formatPhone } from '/shared/phone.js';
import { store } from '../../app/store.js';
import { api } from '../../shared/api.js';
import { appBar } from '../../shared/components.js';
import { bindCounters, field, handleFormError, input, readForm, select, switchControl, textarea } from '../../shared/forms.js';
import { $, html, on, render } from '../../shared/html.js';
import { label, t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';
import { bindPlaceFields, placeFields, readPlace } from '../../shared/places.js';
import { toast, withBusy } from '../../shared/ui.js';

const skillChip = (skill) => html`
  <span class="chip chip-removable">
    ${skill}
    <input type="hidden" name="skills" value="${skill}" data-list>
    <button class="chip-remove" type="button" data-remove-skill aria-label="${t('common.remove')}: ${skill}">${icon('x')}</button>
  </span>
`;

const formMarkup = (user, { highlightListing }) => html`
  <form class="form" id="profile-form" novalidate>
    <section class="form-section">
      <h2 class="form-section-title">${icon('user')}${t('editProfile.personal')}</h2>
      ${field({ name: 'name', label: t('editProfile.name'), control: input({ name: 'name', value: user.name, maxlength: LIMITS.name.max, autocomplete: 'name', required: true }) })}
      <fieldset class="field" data-field="role">
        <legend class="field-label">${t('editProfile.role')}</legend>
        <div class="choice-cards">
          ${ROLES.map((role) => html`
            <label class="choice-card">
              <input type="radio" name="role" value="${role.id}"${user.role === role.id ? html` checked` : null}>
              <span class="choice-icon">${icon(role.id === 'employer' ? 'building-2' : 'user')}</span>
              <span class="choice-title">${label(role)}</span>
            </label>
          `)}
        </div>
        <p class="field-error" hidden></p>
      </fieldset>
      <div data-company ${user.role === 'employer' ? '' : 'hidden'}>
        ${field({ name: 'companyName', label: t('editProfile.companyName'), optional: true, control: input({ name: 'companyName', value: user.companyName ?? '', maxlength: LIMITS.companyName.max, placeholder: t('editProfile.companyPlaceholder') }) })}
      </div>
      ${placeFields({ wilayaCode: user.wilayaCode, communeId: user.communeId })}
    </section>

    <section class="form-section ${highlightListing ? 'is-highlighted' : ''}" id="worker-profile">
      <h2 class="form-section-title">${icon('briefcase')}${t('editProfile.workProfile')}</h2>
      <p class="muted text-sm">${t('editProfile.workProfileHint')}</p>
      ${switchControl({ name: 'isListed', checked: user.isListed || highlightListing, label: t('editProfile.isListed'), hint: t('editProfile.isListedHint') })}
      ${switchControl({ name: 'isAvailable', checked: user.isAvailable, label: t('editProfile.isAvailable') })}
      ${field({ name: 'headline', label: t('editProfile.headline'), counterMax: LIMITS.headline.max, hint: t('editProfile.headlineHint'), control: input({ name: 'headline', value: user.headline ?? '', maxlength: LIMITS.headline.max, placeholder: t('editProfile.headlinePlaceholder') }) })}
      ${field({ name: 'category', label: t('editProfile.category'), control: select({ name: 'category', value: user.category ?? '', placeholder: t('jobForm.choose'), options: CATEGORIES.map((item) => ({ value: item.id, label: label(item) })) }) })}
      ${field({ name: 'experienceYears', label: t('editProfile.experienceYears'), optional: true, control: input({ name: 'experienceYears', value: user.experienceYears ?? '', type: 'number', min: LIMITS.experienceYears.min, max: LIMITS.experienceYears.max, inputmode: 'numeric' }) })}
      <div class="field" data-field="skills">
        <label class="field-label" for="f-skill-entry">${t('editProfile.skills')} <span class="optional">${t('common.optional')}</span></label>
        <div class="tag-input">
          <div class="chips" data-skill-chips>${user.skills.map(skillChip)}</div>
          <input class="input" id="f-skill-entry" data-skill-entry maxlength="${LIMITS.skills.maxLength}" placeholder="${t('editProfile.skillsPlaceholder')}" enterkeyhint="done">
        </div>
        <p class="field-hint">${t('editProfile.skillsHint', { count: LIMITS.skills.maxItems })}</p>
        <p class="field-error" hidden></p>
      </div>
      ${field({ name: 'bio', label: t('editProfile.bio'), optional: true, counterMax: LIMITS.bio.max, control: textarea({ name: 'bio', value: user.bio ?? '', rows: 4, maxlength: LIMITS.bio.max, placeholder: t('editProfile.bioPlaceholder') }) })}
      ${field({ name: 'expectedPay', label: t('editProfile.expectedPay'), optional: true, control: input({ name: 'expectedPay', value: user.expectedPay ?? '', maxlength: LIMITS.expectedPay.max, placeholder: t('editProfile.expectedPayPlaceholder') }) })}
    </section>

    <section class="form-section">
      <h2 class="form-section-title">${icon('phone')}${t('editProfile.contact')}</h2>
      <div class="field">
        <span class="field-label">${t('editProfile.phone')}</span>
        <p class="readonly" dir="ltr">${formatPhone(user.phone)}</p>
      </div>
      ${field({ name: 'whatsapp', label: t('editProfile.whatsapp'), optional: true, hint: t('editProfile.whatsappHint'), control: input({ name: 'whatsapp', value: user.whatsapp ?? '', type: 'tel', inputmode: 'tel', placeholder: '06XX XX XX XX', dir: 'ltr' }) })}
    </section>

    <div class="form-actions">
      <button class="btn btn-primary btn-lg btn-block" type="submit">${icon('check')}${t('common.save')}</button>
    </div>
  </form>
`;

const toPayload = (values) => ({
  name: values.name,
  role: values.role,
  companyName: values.role === 'employer' ? values.companyName : null,
  ...readPlace(values),
  isListed: values.isListed,
  isAvailable: values.isAvailable,
  headline: values.headline,
  category: values.category || null,
  experienceYears: values.experienceYears === '' ? null : Number(values.experienceYears),
  skills: values.skills ?? [],
  bio: values.bio,
  expectedPay: values.expectedPay,
  whatsapp: values.whatsapp,
});

export default {
  mount(root, { navigate, setTitle, query }) {
    const user = store.user;
    const highlightListing = query.get('listing') === '1';
    setTitle(t('editProfile.title'));

    render(root, html`
      ${appBar({ title: t('editProfile.title'), back: true, backTo: '/me' })}
      <div class="page page-narrow">
        ${query.get('welcome') ? html`<div class="notice notice-success">${icon('sparkles')}<span>${t('editProfile.welcome', { name: user.name })}</span></div>` : null}
        ${formMarkup(user, { highlightListing })}
      </div>
    `);

    const form = $(root, '#profile-form');
    bindCounters(form);
    bindPlaceFields(form);
    if (highlightListing) setTimeout(() => $(root, '#worker-profile').scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);

    on(form, 'change', 'input[name="role"]', (event, radio) => {
      $(form, '[data-company]').hidden = radio.value !== 'employer';
    });

    const addSkill = () => {
      const entry = $(form, '[data-skill-entry]');
      const skill = entry.value.replace(/[,،]/g, ' ').replace(/\s+/g, ' ').trim();
      entry.value = '';
      if (!skill) return;
      const existing = readForm(form).skills ?? [];
      if (existing.some((item) => item.toLowerCase() === skill.toLowerCase())) return;
      if (existing.length >= LIMITS.skills.maxItems) {
        toast(t('editProfile.skillsLimit', { count: LIMITS.skills.maxItems }), { type: 'error' });
        return;
      }
      $(form, '[data-skill-chips]').insertAdjacentHTML('beforeend', skillChip(skill).toString());
    };

    on(form, 'keydown', '[data-skill-entry]', (event) => {
      if (event.key === 'Enter' || event.key === ',' || event.key === '،') {
        event.preventDefault();
        addSkill();
      }
    });
    on(form, 'focusout', '[data-skill-entry]', addSkill);
    on(form, 'click', '[data-remove-skill]', (event, button) => button.closest('.chip').remove());

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      addSkill();
      withBusy($(form, 'button[type="submit"]'), async () => {
        try {
          const { user: updated } = await api.patch('/api/me', toPayload(readForm(form)));
          store.setUser(updated);
          toast(t('editProfile.saved'), { type: 'success' });
          navigate(updated.isListed ? `/u/${updated.id}` : '/me', { replace: true });
        } catch (error) {
          handleFormError(form, error);
        }
      });
    });
  },
};
