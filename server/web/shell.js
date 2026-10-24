import fs from 'node:fs';
import path from 'node:path';
import { SALARY_PERIODS, findById } from '../../shared/catalog.js';
import { parsePageText } from '../../shared/page-text.js';
import arabic from '../../public/js/locales/ar.js';
import { placeLabelArabic } from '../shared/places.js';

const SITE_NAME = 'خدمتي';
const DEFAULT_TITLE = 'خدمتي — منصة العمل والتوظيف في الجزائر';
const DEFAULT_DESCRIPTION = 'عروض عمل، عمّال وحرفيون، وتواصل مباشر في كل ولايات وبلديات الجزائر. انشر عرضك مجانًا أو ابحث عن عمل قريب منك.';
const DESCRIPTION_LENGTH = 180;
const PRIVATE_PREFIXES = ['/me', '/messages', '/notifications', '/saved', '/settings', '/admin', '/login', '/register', '/forgot', '/u'];

// Pages whose text is rendered on the server too, so that store reviewers, crawlers and
// browsers without JavaScript can read them (Google Play links to /privacy and /account-deletion).
export const STATIC_PAGES = {
  '/about': 'about',
  '/safety': 'safety',
  '/terms': 'terms',
  '/privacy': 'privacy',
  '/account-deletion': 'accountDeletion',
};

const META_BLOCK = /<!-- meta:start -->[\s\S]*?<!-- meta:end -->/;
const OUTLET_BLOCK = /<!-- outlet:start -->[\s\S]*?<!-- outlet:end -->/;
const TITLE_TAG = /<title>[\s\S]*?<\/title>/;

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[char]);

const truncate = (text, length) => {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  return flat.length > length ? `${flat.slice(0, length - 1).trimEnd()}…` : flat;
};

const formatAmount = (value) => new Intl.NumberFormat('ar-DZ').format(value);

const salaryText = ({ min, max, period }) => {
  if (period === 'negotiable' || (min == null && max == null)) return 'الأجر حسب الاتفاق';
  const amount = min != null && max != null && min !== max ? `${formatAmount(min)} - ${formatAmount(max)}` : formatAmount(min ?? max);
  return `${amount} دج ${findById(SALARY_PERIODS, period)?.ar ?? ''}`.trim();
};

const renderPageBody = (text) => parsePageText(text).map((part) => {
  if (part.type === 'heading') return `<h2>${escapeHtml(part.text)}</h2>`;
  if (part.type === 'list') return `<ul>${part.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  return `<p>${escapeHtml(part.text)}</p>`;
}).join('\n');

const contactLines = ({ supportWhatsapp, supportEmail }) => [
  supportWhatsapp && `${arabic.pages.contact.whatsapp}: ${supportWhatsapp}`,
  supportEmail && `${arabic.pages.contact.email}: ${supportEmail}`,
].filter(Boolean);

const renderStaticPage = (key, support) => {
  const page = arabic.pages[key];
  const contact = contactLines(support);
  const contactBlock = contact.length > 0
    ? `<h2>${escapeHtml(arabic.pages.contact.title)}</h2><ul>${contact.map((line) => `<li dir="auto">${escapeHtml(line)}</li>`).join('')}</ul>`
    : '';
  return `<div class="page page-narrow ssr-page"><article class="card card-pad article"><h1>${escapeHtml(page.title)}</h1>\n${renderPageBody(page.body)}${contactBlock}</article></div>`;
};

// Server-side link previews (WhatsApp, Facebook) for shareable pages. Everything else gets the
// default card; personal pages are marked noindex.
const metaForPath = (pathname, services) => {
  const jobMatch = pathname.match(/^\/jobs\/(\d+)$/);
  if (jobMatch) {
    const job = services.jobs.shareSummary(Number(jobMatch[1]));
    if (job) {
      const place = placeLabelArabic(job);
      return {
        title: `${job.title}${place ? ` — ${place}` : ''} | ${SITE_NAME}`,
        description: truncate(`${salaryText(job.salary)} · ${job.description}`, DESCRIPTION_LENGTH),
        type: 'article',
      };
    }
  }
  const pageKey = STATIC_PAGES[pathname];
  if (pageKey) {
    const page = arabic.pages[pageKey];
    return { title: `${page.title} — ${SITE_NAME}`, description: truncate(parsePageText(page.body)[0]?.text, DESCRIPTION_LENGTH), type: 'website' };
  }
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    type: 'website',
    noindex: PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)),
  };
};

export const createShell = ({ publicDir, cacheTemplate, services, support = {} }) => {
  const templatePath = path.join(publicDir, 'index.html');
  let template = null;
  const loadTemplate = () => {
    if (!template || !cacheTemplate) template = fs.readFileSync(templatePath, 'utf8');
    return template;
  };

  return {
    render(pathname, baseUrl) {
      const meta = metaForPath(pathname, services);
      const url = `${baseUrl}${pathname}`;
      const tags = [
        `<meta name="description" content="${escapeHtml(meta.description)}">`,
        `<link rel="canonical" href="${escapeHtml(url)}">`,
        `<meta property="og:site_name" content="${SITE_NAME}">`,
        '<meta property="og:locale" content="ar_DZ">',
        `<meta property="og:type" content="${meta.type}">`,
        `<meta property="og:title" content="${escapeHtml(meta.title)}">`,
        `<meta property="og:description" content="${escapeHtml(meta.description)}">`,
        `<meta property="og:url" content="${escapeHtml(url)}">`,
        `<meta property="og:image" content="${escapeHtml(`${baseUrl}/icons/og-image.png`)}">`,
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta name="twitter:card" content="summary_large_image">',
        ...(meta.noindex ? ['<meta name="robots" content="noindex">'] : []),
      ];
      const pageKey = STATIC_PAGES[pathname];
      const page = loadTemplate()
        .replace(TITLE_TAG, `<title>${escapeHtml(meta.title)}</title>`)
        .replace(META_BLOCK, `<!-- meta:start -->\n    ${tags.join('\n    ')}\n    <!-- meta:end -->`);
      return pageKey ? page.replace(OUTLET_BLOCK, `<!-- outlet:start -->${renderStaticPage(pageKey, support)}<!-- outlet:end -->`) : page;
    },
  };
};
