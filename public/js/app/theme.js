// Theme preference: 'system' follows the device, 'light' and 'dark' force a scheme.
const STORAGE_KEY = 'khedmati.theme';
export const THEMES = ['system', 'light', 'dark'];
const THEME_COLORS = { light: '#0a7a55', dark: '#0d1411' };

export const getTheme = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
};

const effectiveScheme = (theme) => {
  if (theme !== 'system') return theme;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const syncThemeColor = (theme) => {
  const color = THEME_COLORS[effectiveScheme(theme)];
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.setAttribute('content', color);
};

export const applyTheme = (theme = getTheme()) => {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  syncThemeColor(theme);
};

export const setTheme = (theme) => {
  if (!THEMES.includes(theme)) return;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
  applyTheme(theme);
};

export const watchSystemTheme = () => {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getTheme() === 'system') syncThemeColor('system');
  });
};
