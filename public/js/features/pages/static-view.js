import { parsePageText } from '/shared/page-text.js';
import { whatsappLink } from '/shared/phone.js';
import { loadMeta, store } from '../../app/store.js';
import { appBar } from '../../shared/components.js';
import { $, html, render } from '../../shared/html.js';
import { t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';

// Page bodies live in the locale files as plain text (see shared/page-text.js). The server
// renders the same text for visitors without JavaScript (see server/web/shell.js).
const toBlocks = (text) => parsePageText(text).map((part) => {
  if (part.type === 'heading') return html`<h2>${part.text}</h2>`;
  if (part.type === 'list') return html`<ul>${part.items.map((item) => html`<li>${item}</li>`)}</ul>`;
  return html`<p>${part.text}</p>`;
});

const contactMarkup = (support) => {
  if (!support?.whatsapp && !support?.email) return null;
  return html`
    <h2>${t('pages.contact.title')}</h2>
    <div class="row-wrap">
      ${support.whatsapp ? html`<a class="btn btn-whatsapp btn-sm" href="${whatsappLink(support.whatsapp)}" target="_blank" rel="noopener" data-external>${icon('whatsapp')}${t('pages.contact.whatsapp')}</a>` : null}
      ${support.email ? html`<a class="btn btn-secondary btn-sm" href="mailto:${support.email}" data-external>${icon('send', 'flip-rtl')}<span dir="ltr">${support.email}</span></a>` : null}
    </div>
  `;
};

// The account deletion page doubles as the public link Google Play asks for.
const deletionAction = () => html`
  <div class="row-wrap">
    <a class="btn btn-danger" href="${store.user ? '/settings' : '/login?next=%2Fsettings'}">${icon('trash-2')}${t('pages.accountDeletion.action')}</a>
  </div>
`;

export default {
  mount(root, { page, setTitle, signal }) {
    const title = t(`pages.${page}.title`);
    setTitle(title);
    render(root, html`
      ${appBar({ title, back: true, backTo: '/me' })}
      <div class="page page-narrow">
        <article class="card card-pad article">
          ${toBlocks(t(`pages.${page}.body`))}
          ${page === 'accountDeletion' ? deletionAction() : null}
          <div data-contact></div>
        </article>
      </div>
    `);
    loadMeta().then((meta) => {
      if (!signal.aborted) render($(root, '[data-contact]'), contactMarkup(meta.support));
    }).catch(() => {});
  },
};
