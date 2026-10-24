import { store } from '../../app/store.js';
import { api, isAbort } from '../../shared/api.js';
import { appBar, emptyState, errorState, jobCard, skeletonCards, workerCard } from '../../shared/components.js';
import { $, html, on, render } from '../../shared/html.js';
import { t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';

const TABS = ['jobs', 'workers'];

export default {
  mount(root, { query, replaceQuery, setTitle, signal, ready }) {
    let tab = TABS.includes(query.get('tab')) ? query.get('tab') : 'jobs';
    let data = null;
    setTitle(t('saved.title'));

    render(root, html`
      ${appBar({ title: t('saved.title'), back: true, backTo: '/me' })}
      <div class="page">
        <div class="segmented segmented-full" role="tablist" data-tabs></div>
        <div class="card-list" data-list>${skeletonCards(3)}</div>
      </div>
    `);

    const renderTabs = () => render($(root, '[data-tabs]'), TABS.map((item) => html`
      <button class="segment ${tab === item ? 'is-active' : ''}" type="button" role="tab" aria-selected="${tab === item}" data-tab="${item}">
        ${icon(item === 'jobs' ? 'briefcase' : 'users')}${t(`saved.${item}`)} ${data ? html`<span class="tab-count">${data[item].length}</span>` : null}
      </button>
    `));

    const renderList = () => {
      const items = data[tab].filter((item) => store.isSaved(tab === 'jobs' ? 'job' : 'worker', item.id));
      render($(root, '[data-list]'), items.length
        ? items.map((item) => (tab === 'jobs' ? jobCard(item, { saved: true }) : workerCard(item, { saved: true })))
        : emptyState({
          icon: 'bookmark',
          title: t(`saved.empty.${tab}`),
          text: t('saved.emptyText'),
          action: html`<a class="btn btn-primary" href="${tab === 'jobs' ? '/jobs' : '/workers'}">${t(`saved.browse.${tab}`)}</a>`,
        }));
    };

    const load = async () => {
      try {
        data = await api.get('/api/saved', null, { signal });
        renderTabs();
        renderList();
        ready();
      } catch (error) {
        if (!isAbort(error)) render($(root, '[data-list]'), errorState(error));
      }
    };

    on(root, 'click', '[data-tab]', (event, button) => {
      tab = button.dataset.tab;
      replaceQuery({ tab: tab === 'jobs' ? '' : tab });
      renderTabs();
      if (data) renderList();
    });
    on(root, 'click', '[data-action="retry"]', load);

    // Unsaving from this screen removes the card right away.
    const unsubscribe = store.subscribe((change) => {
      if (change === 'saved' && data) renderList();
    });

    renderTabs();
    load();
    return unsubscribe;
  },
};
