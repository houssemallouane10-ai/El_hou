import fs from 'node:fs';
import path from 'node:path';
import { LOCATIONS, SALARY_PERIODS, findById } from '../../shared/catalog.js';

const SITE_NAME = 'خدمتي';
const DEFAULT_TITLE = 'خدمتي — منصة العمل والتوظيف في بئر العاتر';
const DEFAULT_DESCRIPTION = 'عروض عمل، عمّال وحرفيون، وتواصل مباشر في بئر العاتر وولاية تبسة. انشر عرضك مجانًا أو ابحث عن عمل قريب منك.';
const DESCRIPTION_LENGTH = 180;
const PRIVATE_PREFIXES = ['/me', '/messages', '/notifications', '/saved', '/settings', '/admin', '/login', '/register', '/forgot', '/u'];

const META_BLOCK = /<!-- meta:start -->[\s\S]*?<!-- meta:end -->/;
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

// Server-side link previews (WhatsApp, Facebook) for shareable pages. Everything else gets the
// default card; personal pages are marked noindex.
const metaForPath = (pathname, services) => {
  const jobMatch = pathname.match(/^\/jobs\/(\d+)$/);
  if (jobMatch) {
    const job = services.jobs.shareSummary(Number(jobMatch[1]));
    if (job) {
      const place = findById(LOCATIONS, job.location)?.ar ?? '';
      return {
        title: `${job.title} — ${place} | ${SITE_NAME}`,
        description: truncate(`${salaryText(job.salary)} · ${job.description}`, DESCRIPTION_LENGTH),
        type: 'article',
      };
    }
  }
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    type: 'website',
    noindex: PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)),
  };
};

export const createShell = ({ publicDir, cacheTemplate, services }) => {
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
      return loadTemplate()
        .replace(TITLE_TAG, `<title>${escapeHtml(meta.title)}</title>`)
        .replace(META_BLOCK, `<!-- meta:start -->\n    ${tags.join('\n    ')}\n    <!-- meta:end -->`);
    },
  };
};
