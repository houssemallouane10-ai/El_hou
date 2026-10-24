// Safe templating: every interpolated value is HTML-escaped unless it is already a SafeHtml
// (produced by `html` or `raw`). Arrays are joined; null, undefined and booleans render nothing.

class SafeHtml {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);

const toMarkup = (value) => {
  if (value === null || value === undefined || typeof value === 'boolean') return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(toMarkup).join('');
  return escapeHtml(value);
};

export const raw = (value) => new SafeHtml(String(value ?? ''));

export const html = (strings, ...values) => new SafeHtml(
  strings.reduce((markup, chunk, index) => markup + chunk + (index < values.length ? toMarkup(values[index]) : ''), ''),
);

export const render = (element, template) => {
  element.innerHTML = toMarkup(template);
};

// Delegated listener: `handler(event, matchedElement)` runs for events inside `root` whose
// target is (or is inside) an element matching `selector`.
export const on = (root, type, selector, handler, options) => {
  const listener = (event) => {
    const match = event.target instanceof Element ? event.target.closest(selector) : null;
    if (match && root.contains(match)) handler(event, match);
  };
  root.addEventListener(type, listener, options);
  return () => root.removeEventListener(type, listener, options);
};

export const $ = (root, selector) => root.querySelector(selector);
export const $$ = (root, selector) => [...root.querySelectorAll(selector)];
