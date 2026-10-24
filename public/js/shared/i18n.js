import ar from '../locales/ar.js';
import fr from '../locales/fr.js';

const DICTIONARIES = { ar, fr };
const LOCALES = { ar: 'ar-DZ', fr: 'fr-DZ' };
const STORAGE_KEY = 'khedmati.lang';
export const LANGUAGES = [
  { id: 'ar', label: 'العربية' },
  { id: 'fr', label: 'Français' },
];

const readStoredLang = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored in DICTIONARIES ? stored : 'ar';
  } catch {
    return 'ar';
  }
};

let lang = readStoredLang();
const listeners = new Set();
const pluralRules = new Map();

const lookup = (dictionary, key) => key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), dictionary);

const interpolate = (text, params) => text.replace(/\{(\w+)\}/g, (match, name) => (params[name] ?? match));

const pluralForm = (entry, count) => {
  if (!pluralRules.has(lang)) pluralRules.set(lang, new Intl.PluralRules(LOCALES[lang]));
  const category = pluralRules.get(lang).select(count);
  return entry[category] ?? entry.other;
};

export const getLang = () => lang;
export const getLocale = () => LOCALES[lang];

export const applyLang = () => {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
};

export const setLang = (next) => {
  if (!(next in DICTIONARIES) || next === lang) return;
  lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
  applyLang();
  for (const listener of listeners) listener(lang);
};

export const onLangChange = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// t('jobs.count', { count: 3 }) picks the plural form for the active language when the entry
// is an object of CLDR categories (zero, one, two, few, many, other).
export const t = (key, params = {}) => {
  let entry = lookup(DICTIONARIES[lang], key) ?? lookup(DICTIONARIES.ar, key);
  if (entry === undefined) return key;
  if (typeof entry === 'object') entry = pluralForm(entry, Number(params.count ?? 0));
  return interpolate(entry, { ...params, count: params.count === undefined ? undefined : formatCount(params.count) });
};

export const hasKey = (key) => lookup(DICTIONARIES[lang], key) !== undefined || lookup(DICTIONARIES.ar, key) !== undefined;

const formatCount = (count) => new Intl.NumberFormat(LOCALES[lang]).format(count);

// Catalog entries carry their own labels: { id, ar, fr }.
export const label = (item) => (item ? item[lang] ?? item.ar : '');
