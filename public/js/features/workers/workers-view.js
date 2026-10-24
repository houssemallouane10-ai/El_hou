import { CATEGORIES } from '/shared/catalog.js';
import { store } from '../../app/store.js';
import { api, isAbort } from '../../shared/api.js';
import { appBar, emptyState, errorState, inboxActions, loadMore, skeletonCards, workerCard } from '../../shared/components.js';
import { locationLabel, sortedLocations } from '../../shared/format.js';
import { readForm, select, switchControl } from '../../shared/forms.js';
import { $, html, on, render } from '../../shared/html.js';
import { label, t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';
import { openLayer, toastError } from '../../shared/ui.js';

const SEARCH_DELAY_MS = 350;

const listingCta = (user) => {
  if (user?.isListed) return null;
  return html`
    <a class="cta-card" href="${user ? '/me/edit?listing=1' : '/register'}">
      <span class="cta-icon">${icon('user-check')}</span>
      <span class="cta-text">
        <strong>${t('workers.ctaTitle')}</strong>
        <span>${t('workers.ctaText')}</span>
      </span>
      ${icon('chevron-right', 'flip-rtl')}
    </a>
  `;
};

export default {
  mount(root, { query, replaceQuery, setTitle, ready }) {
    const filters = {
      q: query.get('q') ?? '',
      category: query.get('category') ?? '',
      location: query.get('location') ?? '',
      available: query.get('available') ?? '',
    };
    let page = 1;
    let items = [];
    let loading = false;
    let requestController = null;
    let searchTimer = 0;
    let firstLoad = true;

    setTitle(t('workers.title'));
    render(root, html`
      ${appBar({ title: t('workers.title'), actions: inboxActions(store.user) })}
      <div class="page">
        ${listingCta(store.user)}
        <div class="toolbar">
          <form class="search-box search-box-compact" role="search" data-search>
            ${icon('search')}
            <input class="search-input" name="q" type="search" dir="auto" enterkeyhint="search" autocomplete="off"
              value="${filters.q}" placeholder="${t('workers.searchPlaceholder')}" aria-label="${t('common.search')}">
          </form>
          <button class="btn btn-secondary filter-btn" type="button" data-action="filters" aria-label="${t('common.filters')}">
            ${icon('sliders-horizontal')}<span class="hide-sm">${t('common.filters')}</span><span class="count" data-filter-count hidden></span>
          </button>
        </div>
        <div class="chips-scroll" data-categories></div>
        <div class="list-toolbar"><p class="muted text-sm" data-count aria-live="polite"></p></div>
        <div class="chips" data-active></div>
        <div class="card-grid" data-results>${skeletonCards(4)}</div>
        <div data-more></div>
      </div>
    `);

    const syncControls = () => {
      render($(root, '[data-categories]'), html`
        <button class="chip ${filters.category ? '' : 'is-active'}" type="button" data-category="">${t('common.all')}</button>
        ${CATEGORIES.map((category) => html`
          <button class="chip ${filters.category === category.id ? 'is-active' : ''}" type="button" data-category="${category.id}">${icon(category.icon)}${label(category)}</button>
        `)}
      `);
      const chips = [];
      if (filters.location) chips.push({ key: 'location', text: locationLabel(filters.location) });
      if (filters.available) chips.push({ key: 'available', text: t('workers.availableOnly') });
      render($(root, '[data-active]'), chips.map((chip) => html`
        <button class="chip chip-removable" type="button" data-remove="${chip.key}">${chip.text}${icon('x')}</button>
      `));
      const badge = $(root, '[data-filter-count]');
      badge.textContent = String(chips.length);
      badge.hidden = chips.length === 0;
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
        const data = await api.get('/api/workers', {
          q: filters.q.trim(),
          category: filters.category,
          location: filters.location,
          available: filters.available ? 1 : '',
          page,
        }, { signal: requestController.signal });
        items = append ? [...items, ...data.items] : data.items;
        $(root, '[data-count]').textContent = t('workers.results', { count: data.total });
        render($(root, '[data-results]'), items.length
          ? items.map((worker) => workerCard(worker, { saved: store.isSaved('worker', worker.id), showSave: worker.id !== store.user?.id }))
          : emptyState({ icon: 'users', title: t('workers.emptyTitle'), text: t('workers.emptyText') }));
        render($(root, '[data-more]'), loadMore(data.hasMore));
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
      replaceQuery(filters);
      syncControls();
      load();
    };

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
      apply();
    });

    on(root, 'click', '[data-category]', (event, button) => {
      filters.category = button.dataset.category;
      apply();
    });

    on(root, 'click', '[data-remove]', (event, button) => {
      filters[button.dataset.remove] = '';
      apply();
    });

    on(root, 'click', '[data-action="more"]', (event, button) => {
      if (loading) return;
      button.disabled = true;
      page += 1;
      load({ append: true });
    });

    on(root, 'click', '[data-action="retry"]', () => load());

    on(root, 'click', '[data-action="filters"]', () => {
      openLayer({
        title: t('common.filters'),
        body: html`
          <form class="form" id="worker-filters">
            <div class="field">
              <label class="field-label" for="f-location">${t('jobs.filters.location')}</label>
              ${select({ name: 'location', value: filters.location, placeholder: t('jobs.filters.anywhere'), options: sortedLocations().map((item) => ({ value: item.id, label: label(item) })) })}
            </div>
            ${switchControl({ name: 'available', checked: Boolean(filters.available), label: t('workers.availableOnly') })}
          </form>
        `,
        footer: html`
          <button class="btn btn-secondary" type="button" data-sheet-reset>${t('common.reset')}</button>
          <button class="btn btn-primary" type="submit" form="worker-filters">${t('jobs.showResults')}</button>
        `,
        onMount: (panel, layer) => {
          const form = $(panel, '#worker-filters');
          form.addEventListener('submit', (event) => {
            event.preventDefault();
            const values = readForm(form);
            filters.location = values.location;
            filters.available = values.available ? '1' : '';
            layer.close();
            apply();
          });
          $(panel, '[data-sheet-reset]').addEventListener('click', () => {
            filters.location = '';
            filters.available = '';
            layer.close();
            apply();
          });
        },
      });
    });

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
