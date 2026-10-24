import { CATEGORIES, JOB_TYPES } from '/shared/catalog.js';
import { communeById } from '/shared/geo.js';
import { regionFromQuery, regionQueryValue, setRegion } from '../../app/region.js';
import { loadMeta, store } from '../../app/store.js';
import { api, isAbort } from '../../shared/api.js';
import { appBar, emptyState, errorState, inboxActions, jobCard, loadMore, regionButton, skeletonCards } from '../../shared/components.js';
import { categoryLabel, jobTypeLabel } from '../../shared/format.js';
import { readForm, select, switchControl } from '../../shared/forms.js';
import { $, html, on, render } from '../../shared/html.js';
import { label, t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';
import { communeOptions, pickWilaya, placeLabel } from '../../shared/places.js';
import { openLayer, toast, toastError } from '../../shared/ui.js';

const FILTER_KEYS = ['q', 'category', 'jobType', 'commune', 'urgent', 'withSalary', 'postedWithin', 'sort'];
const ADVANCED_KEYS = ['jobType', 'commune', 'urgent', 'withSalary', 'postedWithin'];
const POSTED_WITHIN = ['1', '3', '7', '30'];
const SORTS = ['recent', 'urgent', 'popular'];
const SEARCH_DELAY_MS = 350;

// The wilaya comes from ?wilaya=, else from a ?commune= link, else from the saved region. A commune
// only counts inside that wilaya.
const readFilters = (query) => {
  const filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, query.get(key) ?? '']));
  const commune = communeById(filters.commune);
  filters.wilaya = !query.has('wilaya') && commune ? commune.wilaya : regionFromQuery(query);
  if (commune?.wilaya !== filters.wilaya) filters.commune = '';
  return filters;
};

const advancedCount = (filters) => ADVANCED_KEYS.filter((key) => filters[key]).length;

const activeChips = (filters) => {
  const chips = [];
  if (filters.jobType) chips.push({ key: 'jobType', text: jobTypeLabel(filters.jobType) });
  if (filters.commune) chips.push({ key: 'commune', text: placeLabel({ communeId: Number(filters.commune) }) });
  if (filters.postedWithin) chips.push({ key: 'postedWithin', text: t(`jobs.posted.${filters.postedWithin}`) });
  if (filters.urgent) chips.push({ key: 'urgent', text: t('jobs.urgentOnly') });
  if (filters.withSalary) chips.push({ key: 'withSalary', text: t('jobs.withSalary') });
  return chips;
};

const filterSheetBody = (filters) => html`
  <form class="form" id="job-filters">
    <div class="field">
      <label class="field-label" for="f-category">${t('jobs.filters.category')}</label>
      ${select({ name: 'category', value: filters.category, placeholder: t('common.all'), options: CATEGORIES.map((item) => ({ value: item.id, label: label(item) })) })}
    </div>
    <fieldset class="field">
      <legend class="field-label">${t('jobs.filters.jobType')}</legend>
      <div class="chips">
        <label class="chip-radio"><input type="radio" name="jobType" value=""${filters.jobType ? null : html` checked`}><span>${t('common.all')}</span></label>
        ${JOB_TYPES.map((type) => html`<label class="chip-radio"><input type="radio" name="jobType" value="${type.id}"${filters.jobType === type.id ? html` checked` : null}><span>${label(type)}</span></label>`)}
      </div>
    </fieldset>
    ${filters.wilaya ? html`
      <div class="field">
        <label class="field-label" for="f-commune">${t('places.commune')}</label>
        ${select({ name: 'commune', value: filters.commune, placeholder: t('places.anyCommune'), options: communeOptions(filters.wilaya) })}
      </div>
    ` : html`<p class="field-hint">${icon('map-pin')} ${t('places.communeNeedsWilaya')}</p>`}
    <fieldset class="field">
      <legend class="field-label">${t('jobs.filters.postedWithin')}</legend>
      <div class="chips">
        <label class="chip-radio"><input type="radio" name="postedWithin" value=""${filters.postedWithin ? null : html` checked`}><span>${t('jobs.posted.any')}</span></label>
        ${POSTED_WITHIN.map((days) => html`<label class="chip-radio"><input type="radio" name="postedWithin" value="${days}"${filters.postedWithin === days ? html` checked` : null}><span>${t(`jobs.posted.${days}`)}</span></label>`)}
      </div>
    </fieldset>
    ${switchControl({ name: 'urgent', checked: Boolean(filters.urgent), label: t('jobs.urgentOnly') })}
    ${switchControl({ name: 'withSalary', checked: Boolean(filters.withSalary), label: t('jobs.withSalary'), hint: t('jobs.withSalaryHint') })}
  </form>
`;

export default {
  mount(root, { query, replaceQuery, setTitle, ready, navigate }) {
    const filters = readFilters(query);
    let page = 1;
    let items = [];
    let loading = false;
    let requestController = null;
    let searchTimer = 0;
    let firstLoad = true;

    setTitle(t('jobs.title'));
    render(root, html`
      ${appBar({ title: t('jobs.title'), actions: inboxActions(store.user) })}
      <div class="page">
        <div class="toolbar">
          <form class="search-box search-box-compact" role="search" data-search>
            ${icon('search')}
            <input class="search-input" name="q" type="search" dir="auto" enterkeyhint="search" autocomplete="off"
              value="${filters.q}" placeholder="${t('jobs.searchPlaceholder')}" aria-label="${t('common.search')}">
          </form>
          <button class="btn btn-secondary filter-btn" type="button" data-action="filters" aria-label="${t('common.filters')}">
            ${icon('sliders-horizontal')}<span class="hide-sm">${t('common.filters')}</span><span class="count" data-filter-count hidden></span>
          </button>
        </div>
        <div class="region-row" data-region></div>
        <div class="chips-scroll" data-categories></div>
        <div class="list-toolbar">
          <p class="muted text-sm" data-count aria-live="polite"></p>
          <label class="sort">
            <span class="sr-only">${t('jobs.sort.label')}</span>
            <select class="select select-sm" data-sort>
              ${SORTS.map((sort) => html`<option value="${sort}"${(filters.sort || 'recent') === sort ? html` selected` : null}>${t(`jobs.sort.${sort}`)}</option>`)}
            </select>
          </label>
        </div>
        <div class="chips" data-active></div>
        <div class="card-list" data-results>${skeletonCards(4)}</div>
        <div data-more></div>
      </div>
    `);

    const syncControls = () => {
      render($(root, '[data-region]'), regionButton(filters.wilaya));
      render($(root, '[data-categories]'), html`
        <button class="chip ${filters.category ? '' : 'is-active'}" type="button" data-category="">${t('common.all')}</button>
        ${CATEGORIES.map((category) => html`
          <button class="chip ${filters.category === category.id ? 'is-active' : ''}" type="button" data-category="${category.id}">${icon(category.icon)}${label(category)}</button>
        `)}
      `);
      const activeChip = $(root, '[data-categories] .is-active');
      if (activeChip && filters.category) activeChip.scrollIntoView({ block: 'nearest', inline: 'center' });
      render($(root, '[data-active]'), activeChips(filters).map((chip) => html`
        <button class="chip chip-removable" type="button" data-remove="${chip.key}" aria-label="${t('common.remove')}: ${chip.text}">${chip.text}${icon('x')}</button>
      `));
      const count = advancedCount(filters);
      const badge = $(root, '[data-filter-count]');
      badge.textContent = String(count);
      badge.hidden = count === 0;
    };

    const renderResults = (hasMore, total) => {
      $(root, '[data-count]').textContent = t('jobs.results', { count: total });
      if (items.length === 0) {
        render($(root, '[data-results]'), emptyState({
          icon: 'search',
          title: t('jobs.emptyTitle'),
          text: t('jobs.emptyText'),
          action: html`
            <div class="row-center">
              ${advancedCount(filters) || filters.q || filters.category ? html`<button class="btn btn-secondary" type="button" data-action="reset">${t('common.resetFilters')}</button>` : null}
              ${filters.wilaya ? html`<button class="btn btn-secondary" type="button" data-action="all-wilayas">${icon('globe')}${t('places.browseAll')}</button>` : null}
              ${filters.category ? html`<button class="btn btn-primary" type="button" data-action="alert">${icon('bell')}${t('jobs.alertCta')}</button>` : null}
            </div>
          `,
        }));
      } else {
        render($(root, '[data-results]'), items.map((job) => jobCard(job, { saved: store.isSaved('job', job.id) })));
      }
      render($(root, '[data-more]'), loadMore(hasMore));
    };

    const load = async ({ append = false } = {}) => {
      requestController?.abort();
      requestController = new AbortController();
      loading = true;
      if (!append) {
        page = 1;
        render($(root, '[data-results]'), skeletonCards(4));
        render($(root, '[data-more]'), null);
      }
      try {
        const data = await api.get('/api/jobs', {
          q: filters.q.trim(),
          category: filters.category,
          jobType: filters.jobType,
          wilaya: filters.wilaya ?? '',
          commune: filters.commune,
          urgent: filters.urgent ? 1 : '',
          withSalary: filters.withSalary ? 1 : '',
          postedWithin: filters.postedWithin,
          sort: filters.sort && filters.sort !== 'recent' ? filters.sort : '',
          page,
        }, { signal: requestController.signal });
        items = append ? [...items, ...data.items] : data.items;
        renderResults(data.hasMore, data.total);
        if (firstLoad) {
          firstLoad = false;
          ready();
        }
      } catch (error) {
        if (isAbort(error)) return;
        if (append) toastError(error);
        else render($(root, '[data-results]'), errorState(error));
      } finally {
        loading = false;
      }
    };

    const apply = () => {
      replaceQuery({ ...filters, wilaya: regionQueryValue(filters.wilaya), sort: filters.sort === 'recent' ? '' : filters.sort });
      syncControls();
      load();
    };

    on(root, 'click', '[data-action="region"]', async () => {
      const meta = await loadMeta().catch(() => null);
      const choice = await pickWilaya({ value: filters.wilaya, counts: meta?.jobsByWilaya ?? null });
      if (choice === undefined || choice === filters.wilaya) return;
      setRegion(choice);
      filters.wilaya = choice;
      filters.commune = '';
      apply();
    });

    on(root, 'input', '[data-search] input', (event, input) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        filters.q = input.value;
        apply();
      }, SEARCH_DELAY_MS);
    });

    on(root, 'submit', '[data-search]', (event, form) => {
      event.preventDefault();
      clearTimeout(searchTimer);
      filters.q = form.elements.q.value;
      form.elements.q.blur();
      apply();
    });

    on(root, 'click', '[data-category]', (event, button) => {
      filters.category = button.dataset.category;
      apply();
    });

    on(root, 'change', '[data-sort]', (event, control) => {
      filters.sort = control.value;
      apply();
    });

    on(root, 'click', '[data-remove]', (event, button) => {
      filters[button.dataset.remove] = '';
      apply();
    });

    on(root, 'click', '[data-action="reset"]', () => {
      for (const key of FILTER_KEYS) filters[key] = '';
      $(root, '[data-search] input').value = '';
      apply();
    });

    on(root, 'click', '[data-action="all-wilayas"]', () => {
      setRegion(null);
      filters.wilaya = null;
      filters.commune = '';
      apply();
    });

    on(root, 'click', '[data-action="more"]', (event, button) => {
      if (loading) return;
      button.disabled = true;
      page += 1;
      load({ append: true });
    });

    on(root, 'click', '[data-action="retry"]', () => load());

    on(root, 'click', '[data-action="alert"]', async () => {
      if (!store.user) {
        navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }
      const categories = [...new Set([...(store.user.alertCategories ?? []), filters.category])];
      try {
        const result = await api.put('/api/me/alerts', { categories, wilayaCode: store.user.alertWilaya ?? null });
        store.setUser({ ...store.user, alertCategories: result.categories, alertWilaya: result.wilayaCode });
        const scope = result.wilayaCode ? placeLabel({ wilayaCode: result.wilayaCode }) : t('places.allWilayas');
        toast(t('jobs.alertOn', { category: categoryLabel(filters.category), scope }), { type: 'success' });
      } catch (error) {
        toastError(error);
      }
    });

    on(root, 'click', '[data-action="filters"]', () => {
      openLayer({
        title: t('common.filters'),
        body: filterSheetBody(filters),
        footer: html`
          <button class="btn btn-secondary" type="button" data-sheet-reset>${t('common.reset')}</button>
          <button class="btn btn-primary" type="submit" form="job-filters">${t('jobs.showResults')}</button>
        `,
        onMount: (panel, layer) => {
          const form = $(panel, '#job-filters');
          form.addEventListener('submit', (event) => {
            event.preventDefault();
            const values = readForm(form);
            Object.assign(filters, {
              category: values.category,
              jobType: values.jobType ?? '',
              commune: values.commune ?? '',
              postedWithin: values.postedWithin ?? '',
              urgent: values.urgent ? '1' : '',
              withSalary: values.withSalary ? '1' : '',
            });
            layer.close();
            apply();
          });
          $(panel, '[data-sheet-reset]').addEventListener('click', () => {
            Object.assign(filters, { category: '', jobType: '', commune: '', postedWithin: '', urgent: '', withSalary: '' });
            layer.close();
            apply();
          });
        },
      });
    });

    // Infinite scroll: load the next page when the "more" button comes into view.
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !loading) $(root, '[data-action="more"]')?.click();
    }, { rootMargin: '400px' });
    observer.observe($(root, '[data-more]'));

    syncControls();
    load();

    return () => {
      requestController?.abort();
      observer.disconnect();
      clearTimeout(searchTimer);
    };
  },
};
