import { APPLICATION_STATUSES } from '/shared/catalog.js';
import { refreshSummary } from '../../app/store.js';
import { api, isAbort } from '../../shared/api.js';
import { appBar, applicationBadge, avatar, contactActions, emptyState, errorState, skeletonCards, verifiedMark } from '../../shared/components.js';
import { categoryLabel, locationLabel, timeAgo } from '../../shared/format.js';
import { $, html, on, render } from '../../shared/html.js';
import { t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';
import { toast, toastError } from '../../shared/ui.js';
import { startConversation } from '../messages/start-conversation.js';

const DECISIONS = [
  { status: 'shortlisted', icon: 'star' },
  { status: 'accepted', icon: 'circle-check' },
  { status: 'rejected', icon: 'circle-x' },
];

const applicantCard = (item, jobTitle) => html`
  <article class="card applicant ${item.isNew ? 'is-new' : ''}" data-application="${item.id}">
    <div class="applicant-head">
      ${avatar(item.applicant, 'lg')}
      <div class="applicant-titles">
        <h3 class="applicant-name">
          <a href="/u/${item.applicant.id}">${item.applicant.name}</a>${verifiedMark(item.applicant)}
          ${item.isNew ? html`<span class="badge badge-info">${t('common.new')}</span>` : null}
        </h3>
        <p class="muted text-sm">${item.applicant.headline || t('applicants.noHeadline')}</p>
      </div>
      ${applicationBadge(item.status)}
    </div>
    <div class="tags">
      ${item.applicant.category ? html`<span class="tag">${icon('briefcase')}${categoryLabel(item.applicant.category)}</span>` : null}
      ${item.applicant.experienceYears ? html`<span class="tag">${icon('award')}${t('workers.experience', { count: item.applicant.experienceYears })}</span>` : null}
      <span class="tag">${icon('map-pin')}${locationLabel(item.applicant.location)}</span>
      <span class="tag">${icon('clock')}${timeAgo(item.createdAt)}</span>
    </div>
    ${item.message ? html`<blockquote class="quote">${item.message}</blockquote>` : null}
    <div class="applicant-contact">
      ${contactActions({
        phone: item.applicant.contact.phone,
        whatsapp: item.applicant.contact.whatsapp,
        whatsappText: t('applicants.whatsappMessage', { name: item.applicant.name, title: jobTitle }),
      })}
      <button class="btn btn-secondary" type="button" data-message="${item.applicant.id}">${icon('message-circle')}<span>${t('common.message')}</span></button>
    </div>
    <div class="segmented" role="group" aria-label="${t('applicants.decision')}">
      ${DECISIONS.map((decision) => html`
        <button class="segment ${item.status === decision.status ? 'is-active' : ''}" type="button" data-decide="${decision.status}" aria-pressed="${item.status === decision.status}">
          ${icon(decision.icon)}${t(`applicants.actions.${decision.status}`)}
        </button>
      `)}
    </div>
  </article>
`;

export default {
  mount(root, { params, navigate, signal, setTitle, query, replaceQuery }) {
    const jobId = params.id;
    let status = query.get('status') ?? '';
    let data = null;
    setTitle(t('applicants.title'));

    const renderPage = () => {
      const counts = data?.counts ?? {};
      const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
      render(root, html`
        ${appBar({ title: t('applicants.title'), subtitle: data?.job.title, back: true, backTo: `/jobs/${jobId}` })}
        <div class="page">
          <nav class="tabs" aria-label="${t('applicants.filter')}">
            <button class="tab-link ${status ? '' : 'is-active'}" type="button" data-status="">${t('common.all')} <span class="tab-count">${total}</span></button>
            ${APPLICATION_STATUSES.map((item) => html`
              <button class="tab-link ${status === item.id ? 'is-active' : ''}" type="button" data-status="${item.id}">
                ${t(`applications.status.${item.id}`)} <span class="tab-count">${counts[item.id] ?? 0}</span>
              </button>
            `)}
          </nav>
          <div class="card-list" data-list>
            ${!data?.items ? skeletonCards(3) : data.items.length === 0
              ? emptyState({ icon: 'inbox', title: status ? t('applicants.emptyFiltered') : t('applicants.emptyTitle'), text: status ? null : t('applicants.emptyText') })
              : data.items.map((item) => applicantCard(item, data.job.title))}
          </div>
        </div>
      `);
    };

    const load = async () => {
      try {
        data = await api.get(`/api/jobs/${jobId}/applications`, { status }, { signal });
        setTitle(`${t('applicants.title')} — ${data.job.title}`);
        renderPage();
        refreshSummary();
      } catch (error) {
        if (isAbort(error)) return;
        render($(root, '[data-list]') ?? root, errorState(error));
      }
    };

    on(root, 'click', '[data-status]', (event, button) => {
      status = button.dataset.status;
      replaceQuery({ status });
      if (data) data = { ...data, items: null };
      renderPage();
      load();
    });

    on(root, 'click', '[data-decide]', async (event, button) => {
      const card = button.closest('[data-application]');
      const id = Number(card.dataset.application);
      const item = data.items.find((entry) => entry.id === id);
      const next = item.status === button.dataset.decide ? 'pending' : button.dataset.decide;
      try {
        await api.patch(`/api/applications/${id}`, { status: next });
        data.counts[item.status] -= 1;
        data.counts[next] = (data.counts[next] ?? 0) + 1;
        item.status = next;
        if (status && status !== next) data.items = data.items.filter((entry) => entry.id !== id);
        renderPage();
        toast(t(`applicants.updated.${next}`), { type: 'success', duration: 2500 });
      } catch (error) {
        toastError(error);
      }
    });

    on(root, 'click', '[data-message]', (event, button) => startConversation({ userId: Number(button.dataset.message), jobId, navigate }));
    on(root, 'click', '[data-action="retry"]', load);

    renderPage();
    load();
  },
};
