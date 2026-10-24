import { appBar } from '../../shared/components.js';
import { html, render } from '../../shared/html.js';
import { t } from '../../shared/i18n.js';

// Page bodies live in the locale files as plain text: blank lines separate blocks,
// "## " starts a heading and "- " starts a list item.
const toBlocks = (text) => text.split(/\n{2,}/).map((block) => {
  if (block.startsWith('## ')) return html`<h2>${block.slice(3)}</h2>`;
  const lines = block.split('\n');
  if (lines.every((line) => line.startsWith('- '))) return html`<ul>${lines.map((line) => html`<li>${line.slice(2)}</li>`)}</ul>`;
  return html`<p>${block}</p>`;
});

export default {
  mount(root, { page, setTitle }) {
    const title = t(`pages.${page}.title`);
    setTitle(title);
    render(root, html`
      ${appBar({ title, back: true, backTo: '/me' })}
      <div class="page page-narrow">
        <article class="card card-pad article">${toBlocks(t(`pages.${page}.body`))}</article>
      </div>
    `);
  },
};
