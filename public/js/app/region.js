import { wilayaByCode } from '/shared/geo.js';
import { store } from './store.js';

// The wilaya people browse by default: their last choice on this device, else the wilaya of
// their account, else the whole country (null). Lists accept `?wilaya=<code>` or `?wilaya=all`
// to override it, so links keep working whatever the reader's own region is.
const STORAGE_KEY = 'khedmati.wilaya';
const ALL = 'all';

const readStored = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const getRegion = () => {
  const stored = readStored();
  if (stored === ALL) return null;
  if (stored && wilayaByCode(stored)) return Number(stored);
  return wilayaByCode(store.user?.wilayaCode)?.code ?? null;
};

export const setRegion = (code) => {
  try {
    localStorage.setItem(STORAGE_KEY, code === null ? ALL : String(code));
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
};

export const regionFromQuery = (query) => {
  const value = query.get('wilaya');
  if (value === ALL) return null;
  if (value && wilayaByCode(value)) return Number(value);
  return getRegion();
};

// The query value for a list filtered to `code`; omitted when it matches the saved region.
export const regionQueryValue = (code) => {
  if (code === getRegion()) return '';
  return code === null ? ALL : String(code);
};
