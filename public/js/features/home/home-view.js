import { CATEGORIES } from '/shared/catalog.js';
import { loadMeta, store } from '../../app/store.js';
import { api, isAbort } from '../../shared/api.js';
import {
  appBar,
  emptyState,
  errorState,
  inboxActions,
  jobCard,
  sectionHead,
  skeletonCards,
  workerCard,
} from '../../shared/components.js';
import { formatNumber } from '../../shared/format.js';
import { $, html, on, render } from '../../shared/html.js';
import { label, t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';
import { mountInstallCard } from '../pwa/install-card.js';

const VISIBLE_CATEGORIES = 8;

const profileLink = (user) => {
  if (!user) return '/register';
  return user.isListed ? `/u/${user.id}` : '/me/edit?listing=1';
};

const statsMarkup = (meta) => {
  const items = [
    { value: meta?.stats.activeJobs, label: t('home.stats.activeJobs'), icon: 'briefcase' },
    { value: meta?.stats.availableWorkers, label: t('home.stats.availableWorkers'), icon: 'users' },
    { value: meta?.stats.employers, label: t('home.stats.employers'), icon: 'building-2' },
  ];
  return items.map((item) => html`
    <div class="stat">
      <span class="stat-icon">${icon(item.icon)}</span>
      <span class="stat-value">${meta ? formatNumber(item.value ?? 0) : '—'}</span>
      <span class="stat-label">${item.label}</span>
    </div>
  `);
};

const categoriesMarkup = (counts, expanded) => {
  const sorted = [...CATEGORIES].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));
  const visible = expanded ? sorted : sorted.slice(0, VISIBLE_CATEGORIES);
  return html`
    ${visible.map((category) => html`
      <a class="cat-tile" href="/jobs?category=${category.id}">
        <span class="cat-icon">${icon(category.icon)}</span>
        <span class="cat-name">${label(category)}</span>
        <span class="cat-count">${t('home.offers', { count: counts[category.id] ?? 0 })}</span>
      </a>
    `)}
    ${expanded ? null : html`
      <button class="cat-tile cat-more" type="button" data-action="all-categories">
        <span class="cat-icon">${icon('layout-grid')}</span>
        <span class="cat-name">${t('home.allCategories')}</span>
        <span class="cat-count">${t('home.moreCategories', { count: CATEGORIES.length - VISIBLE_CATEGORIES })}</span>
      </button>
    `}
  `;
};

export default {
  mount(root, { navigate, signal, ready }) {
    const user = store.user;
    let categoryCounts = {};
    let expanded = false;

    render(root, html`
      ${appBar({ brand: true, actions: inboxActions(user) })}
      <div class="page home">
        <section class="hero">
          <p class="hero-kicker">${user ? t('home.greeting', { name: user.name.split(' ')[0] }) : t('home.welcome')}</p>
          <h1 class="hero-title">${t('home.heroTitle')}</h1>
          <p class="hero-text">${t('home.heroText')}</p>
          <form class="search-box" role="search" data-search>
            ${icon('search')}
            <input class="search-input" name="q" type="search" dir="auto" enterkeyhint="search" autocomplete="off"
              placeholder="${t('home.searchPlaceholder')}" aria-label="${t('common.search')}">
            <button class="btn btn-primary btn-sm" type="submit">${t('common.search')}</button>
          </form>
          <div class="hero-actions">
            <a class="btn btn-accent" href="/jobs/new">${icon('plus')}${t('home.postJob')}</a>
            <a class="btn btn-glass" href="${profileLink(user)}">${icon('user')}${user?.isListed ? t('home.myProfile') : t('home.createProfile')}</a>
          </div>
        </section>

        <section class="stats" data-stats>${statsMarkup(null)}</section>

        <section class="section">
          ${sectionHead(t('home.categories'), { href: '/jobs', label: t('common.seeAll') })}
          <div class="cat-grid" data-categories>${categoriesMarkup({}, false)}</div>
        </section>

        <section class="section" data-urgent-section hidden>
          ${sectionHead(t('home.urgent'), { href: '/jobs?urgent=1', label: t('common.seeAll') })}
          <div class="h-scroll" data-urgent></div>
        </section>

        <section class="section">
          ${sectionHead(t('home.latest'), { href: '/jobs', label: t('common.seeAll') })}
          <div class="card-list" data-latest>${skeletonCards(3)}</div>
        </section>

        <section class="section">
          ${sectionHead(t('home.workers'), { href: '/workers', label: t('common.seeAll') })}
          <div class="h-scroll" data-workers>${skeletonCards(2)}</div>
        </section>

        <section data-install hidden></section>

        <section class="callout">
          <span class="callout-icon">${icon('shield')}</span>
          <div>
            <h2 class="callout-title">${t('home.safetyTitle')}</h2>
            <p class="callout-text">${t('home.safetyText')}</p>
            <a class="section-link" href="/safety">${t('home.safetyLink')}${icon('chevron-right', 'flip-rtl')}</a>
          </div>
        </section>

        <footer class="site-footer">
          <nav class="footer-links">
            <a href="/about">${t('pages.about.title')}</a>
            <a href="/safety">${t('pages.safety.title')}</a>
            <a href="/terms">${t('pages.terms.title')}</a>
            <a href="/privacy">${t('pages.privacy.title')}</a>
          </nav>
          <p>${t('home.footer', { year: new Date().getFullYear() })}</p>
        </footer>
      </div>
    `);

    on(root, 'submit', '[data-search]', (event, form) => {
      event.preventDefault();
      const q = form.elements.q.value.trim();
      navigate(q ? `/jobs?q=${encodeURIComponent(q)}` : '/jobs');
    });

    on(root, 'click', '[data-action="all-categories"]', () => {
      expanded = true;
      render($(root, '[data-categories]'), categoriesMarkup(categoryCounts, expanded));
    });

    const loadSection = async (selector, request, renderItems) => {
      const slot = $(root, selector);
      try {
        const data = await request();
        render(slot, renderItems(data));
      } catch (error) {
        if (!isAbort(error)) render(slot, errorState(error));
      }
    };

    loadMeta({ fresh: true }).then((meta) => {
      if (signal.aborted) return;
      categoryCounts = meta.categories ?? {};
      render($(root, '[data-stats]'), statsMarkup(meta));
      render($(root, '[data-categories]'), categoriesMarkup(categoryCounts, expanded));
    }).catch(() => {});

    const latest = loadSection('[data-latest]', () => api.get('/api/jobs', { limit: 6 }, { signal }), (page) => (page.items.length
      ? page.items.map((job) => jobCard(job, { saved: store.isSaved('job', job.id) }))
      : emptyState({
        icon: 'briefcase',
        title: t('home.noJobsTitle'),
        text: t('home.noJobsText'),
        action: html`<a class="btn btn-primary" href="/jobs/new">${icon('plus')}${t('home.postJob')}</a>`,
      })));

    api.get('/api/jobs', { urgent: 1, limit: 6 }, { signal }).then((page) => {
      if (page.items.length === 0) return;
      $(root, '[data-urgent-section]').hidden = false;
      render($(root, '[data-urgent]'), page.items.map((job) => jobCard(job, { saved: store.isSaved('job', job.id) })));
    }).catch(() => {});

    loadSection('[data-workers]', () => api.get('/api/workers', { available: 1, limit: 8 }, { signal }), (page) => (page.items.length
      ? page.items.map((worker) => workerCard(worker, { saved: store.isSaved('worker', worker.id) }))
      : emptyState({
        icon: 'users',
        title: t('home.noWorkersTitle'),
        action: html`<a class="btn btn-secondary" href="${profileLink(user)}">${t('home.createProfile')}</a>`,
      })));

    on(root, 'click', '[data-action="retry"]', () => navigate(location.pathname + location.search, { replace: true }));

    latest.then(ready);
    return mountInstallCard($(root, '[data-install]'));
  },
};
