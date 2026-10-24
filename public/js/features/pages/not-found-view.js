import { appBar, emptyState } from '../../shared/components.js';
import { html, render } from '../../shared/html.js';
import { t } from '../../shared/i18n.js';
import { icon } from '../../shared/icons.js';

export default {
  mount(root, { setTitle }) {
    setTitle(t('notFound.title'));
    render(root, html`
      ${appBar({ title: t('notFound.title'), back: true })}
      <div class="page">
        ${emptyState({
          icon: 'circle-help',
          title: t('notFound.title'),
          text: t('notFound.text'),
          action: html`<a class="btn btn-primary" href="/">${icon('house')}${t('notFound.home')}</a>`,
        })}
      </div>
    `);
  },
};
