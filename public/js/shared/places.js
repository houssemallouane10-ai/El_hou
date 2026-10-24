import { WILAYAS, communeById, communesOfWilaya, wilayaByCode } from '/shared/geo.js';
import { field, select } from './forms.js';
import { $, $$, html, on, render } from './html.js';
import { getLang, label, t } from './i18n.js';
import { icon } from './icons.js';
import { openLayer } from './ui.js';

// ---------- Labels ----------

export const wilayaName = (code) => label(wilayaByCode(code));

// "Negrine، Bir El Ater": the commune, then its wilaya when the names differ. Offers and
// profiles migrated from the first version may have no place at all.
export const placeLabel = ({ wilayaCode = null, communeId = null } = {}) => {
  const commune = communeById(communeId);
  const wilaya = wilayaByCode(commune?.wilaya ?? wilayaCode);
  if (!commune) return wilaya ? label(wilaya) : t('places.unknown');
  const communeText = label(commune);
  const wilayaText = label(wilaya);
  return !wilayaText || communeText === wilayaText ? communeText : `${communeText}${t('common.listSeparator')}${wilayaText}`;
};

// Codes are how people find their wilaya in a long list: "12 · Tébessa".
const wilayaCodeText = (code) => String(code).padStart(2, '0');
export const wilayaOptionLabel = (wilaya) => `${wilayaCodeText(wilaya.code)} · ${label(wilaya)}`;

export const wilayaOptions = () => WILAYAS.map((wilaya) => ({ value: String(wilaya.code), label: wilayaOptionLabel(wilaya) }));

// The wilaya seat (the commune named like its wilaya) first, the rest alphabetically.
export const communeOptions = (wilayaCode) => {
  const wilaya = wilayaByCode(wilayaCode);
  const communes = communesOfWilaya(wilayaCode);
  const seat = communes.find((commune) => commune.ar === wilaya?.ar) ?? null;
  const rest = communes.filter((commune) => commune !== seat).sort((a, b) => label(a).localeCompare(label(b), getLang()));
  return [seat, ...rest].filter(Boolean).map((commune) => ({ value: String(commune.id), label: label(commune) }));
};

// ---------- Search ----------

const char = (code) => String.fromCharCode(code);
const range = (from, to) => `${char(from)}-${char(to)}`;
const MARKS = new RegExp(`[${range(0x300, 0x36f)}${range(0x610, 0x61a)}${range(0x64b, 0x65f)}${char(0x670)}${char(0x640)}]`, 'g');
const FOLDS = [[char(0x671), char(0x627)], [char(0x629), char(0x647)], [char(0x649), char(0x64a)]];

// Same folding as the server's search: hamza forms, taa marbuta, alif maqsura and accents.
export const foldText = (value) => {
  let text = String(value ?? '').toLowerCase().normalize('NFKD').replace(MARKS, '');
  for (const [from, to] of FOLDS) text = text.split(from).join(to);
  return text.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
};

const wilayaSearchText = (wilaya) => foldText(`${wilaya.code} ${wilayaCodeText(wilaya.code)} ${wilaya.ar} ${wilaya.fr}`);

// ---------- Region picker ----------

const pickerOption = ({ value, code = null, name, meta = null, selected }) => html`
  <button class="option ${selected ? 'is-selected' : ''}" type="button" role="option" aria-selected="${selected ? 'true' : 'false'}"
    data-pick="${value}" data-search-text="${value === 'all' ? '' : wilayaSearchText(wilayaByCode(code))}">
    ${code === null ? html`<span class="option-code" aria-hidden="true">${icon('globe')}</span>` : html`<span class="option-code">${wilayaCodeText(code)}</span>`}
    <span class="option-label">${name}</span>
    ${meta ? html`<span class="option-meta">${meta}</span>` : null}
    ${selected ? icon('check', 'option-check') : null}
  </button>
`;

// A searchable sheet of the 69 wilayas. Resolves to a wilaya code, null for the whole country
// (when `allowAll`), or undefined when dismissed. `counts` maps codes to live offers.
export const pickWilaya = ({ value = null, counts = null, allowAll = true, title = t('places.pickRegion') } = {}) => {
  const offers = (code) => {
    const total = counts?.[code] ?? 0;
    return counts && total > 0 ? t('home.offers', { count: total }) : null;
  };
  const totalOffers = counts ? Object.values(counts).reduce((sum, total) => sum + total, 0) : 0;
  const layer = openLayer({
    title,
    body: html`
      <div class="search-box picker-search">
        ${icon('search')}
        <input class="search-input" type="search" dir="auto" autocomplete="off" enterkeyhint="search" data-picker-search
          placeholder="${t('places.searchWilaya')}" aria-label="${t('places.searchWilaya')}">
      </div>
      <div class="option-list" role="listbox" aria-label="${title}" data-picker-list>
        ${allowAll ? pickerOption({ value: 'all', name: t('places.allWilayas'), meta: counts && totalOffers > 0 ? t('home.offers', { count: totalOffers }) : null, selected: value === null }) : null}
        ${WILAYAS.map((wilaya) => pickerOption({ value: String(wilaya.code), code: wilaya.code, name: label(wilaya), meta: offers(wilaya.code), selected: value === wilaya.code }))}
      </div>
      <p class="muted text-center picker-empty" data-picker-empty hidden>${t('places.noMatch')}</p>
    `,
    onMount: (panel, self) => {
      const list = $(panel, '[data-picker-list]');
      on(list, 'click', '[data-pick]', (event, button) => self.close(button.dataset.pick === 'all' ? null : Number(button.dataset.pick)));
      $(panel, '[data-picker-search]').addEventListener('input', (event) => {
        const query = foldText(event.target.value);
        let visible = 0;
        for (const option of $$(list, '[data-pick]')) {
          const match = !query || (option.dataset.pick !== 'all' && option.dataset.searchText.includes(query));
          option.hidden = !match;
          if (match) visible += 1;
        }
        $(panel, '[data-picker-empty]').hidden = visible > 0;
      });
      $(list, '.is-selected')?.scrollIntoView({ block: 'center' });
    },
  });
  return layer.result;
};

// ---------- Form fields ----------

// A wilaya select and the communes of the chosen wilaya. With `requireCommune` (job offers) the
// commune must be picked; otherwise "any commune" is allowed. Call bindPlaceFields(form) once.
export const placeFields = ({ wilayaCode = null, communeId = null, requireCommune = false, optionalCommune = !requireCommune }) => {
  const communePlaceholder = requireCommune ? t('places.chooseCommune') : t('places.anyCommune');
  return html`
    ${field({
      name: 'wilayaCode',
      label: t('places.wilaya'),
      control: select({ name: 'wilayaCode', value: wilayaCode ? String(wilayaCode) : '', placeholder: t('places.chooseWilaya'), options: wilayaOptions() }),
    })}
    ${field({
      name: 'communeId',
      label: t('places.commune'),
      optional: optionalCommune,
      control: html`
        <select class="select" id="f-communeId" name="communeId" data-placeholder="${communePlaceholder}"${wilayaCode ? null : html` disabled`}>
          <option value="">${wilayaCode ? communePlaceholder : t('places.chooseWilayaFirst')}</option>
          ${wilayaCode ? communeOptions(wilayaCode).map((option) => html`<option value="${option.value}"${option.value === String(communeId ?? '') ? html` selected` : null}>${option.label}</option>`) : null}
        </select>
      `,
    })}
  `;
};

export const bindPlaceFields = (form) => {
  on(form, 'change', 'select[name="wilayaCode"]', (event, control) => {
    const communes = form.elements.namedItem('communeId');
    const code = Number(control.value) || null;
    communes.disabled = !code;
    render(communes, html`
      <option value="">${code ? communes.dataset.placeholder : t('places.chooseWilayaFirst')}</option>
      ${code ? communeOptions(code).map((option) => html`<option value="${option.value}">${option.label}</option>`) : null}
    `);
  });
};

// Reads the two selects into API fields: numbers, or null when empty.
export const readPlace = (values) => ({
  wilayaCode: values.wilayaCode ? Number(values.wilayaCode) : null,
  communeId: values.communeId ? Number(values.communeId) : null,
});
