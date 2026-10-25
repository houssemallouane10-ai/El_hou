const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes text for safe interpolation into HTML strings. */
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** Only http(s) URLs may reach src/href attributes. */
export const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? esc(u) : '');

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
