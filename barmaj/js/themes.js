// Barmaj themes. Each theme sets the CSS variables used by app.css and the
// editor, plus optional effects (data-fx): glow, scanlines, art layers.
const svg = (s) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;

const ZELLIGE = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><g fill="none" stroke="#e3b35c" stroke-width="1.3"><path d="M48 10l10.5 27.5L86 48 58.5 58.5 48 86 37.5 58.5 10 48l27.5-10.5z"/><rect x="31" y="31" width="34" height="34"/><rect x="31" y="31" width="34" height="34" transform="rotate(45 48 48)"/><circle cx="48" cy="48" r="6"/><path d="M0 0l16 16M96 0 80 16M0 96l16-16M96 96 80 80M48 0v6M48 90v6M0 48h6M90 48h6"/></g></svg>`);

const DUNES = svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 300" preserveAspectRatio="none"><path d="M0 210 C 200 120 380 140 560 200 S 920 260 1200 170 V300 H0Z" fill="#f2a541" opacity=".55"/><path d="M0 250 C 260 180 460 220 700 250 S 1020 280 1200 230 V300 H0Z" fill="#e2725b" opacity=".6"/><circle cx="960" cy="90" r="46" fill="#f2a541" opacity=".5"/></svg>`);

const NEON_GRID = 'linear-gradient(transparent 0 calc(100% - 1px), rgba(255,47,209,.55) 0), linear-gradient(90deg, transparent 0 calc(100% - 1px), rgba(0,229,255,.4) 0)';

const dark = {
  '--bg': '#0c0f14', '--panel': '#11151c', '--panel-2': '#171c25', '--panel-3': '#1e2430', '--line': '#242b38', '--line-2': '#2f3747',
  '--text': '#e8ebf1', '--muted': '#8d97a9', '--faint': '#5c6578',
  '--accent': '#3ddc84', '--accent-ink': '#032112', '--accent-soft': 'rgba(61,220,132,.14)', '--blue': '#7aa2ff',
  '--danger': '#ff6b6b', '--danger-soft': 'rgba(255,107,107,.14)', '--warn': '#f7b955', '--ok': '#3ddc84',
  '--code-bg': '#0e1218', '--code-fg': '#dfe4ec', '--code-gutter': '#4b5466', '--code-active': 'rgba(255,255,255,.035)',
  '--code-sel': 'rgba(122,162,255,.3)', '--code-match': 'rgba(122,162,255,.16)', '--code-match-line': 'rgba(122,162,255,.5)',
  '--code-search': 'rgba(247,185,85,.25)', '--err-line': 'rgba(255,107,107,.13)', '--warn-line': 'rgba(247,185,85,.1)',
  '--hl-kw': '#c49bff', '--hl-str': '#9ee37d', '--hl-num': '#ffab70', '--hl-fn': '#7cc4ff', '--hl-type': '#ffd479',
  '--hl-prop': '#8fd3e8', '--hl-def': '#e8ebf1', '--hl-op': '#89ddff', '--hl-tag': '#ff8f8f', '--hl-comment': '#6a7488', '--hl-punc': '#9aa4b5',
  '--t-err': '#ff8a8a', '--t-sys': '#7d879a', '--t-echo': '#3ddc84',
  '--rb1': '#ffd479', '--rb2': '#c49bff', '--rb3': '#7cc4ff', '--rb4': '#9ee37d', '--rb5': '#ff8f8f', '--rb6': '#8fd3e8',
  '--guide': 'rgba(255,255,255,.07)', '--shadow': '0 18px 50px rgba(0,0,0,.45)',
  '--bar-bg': 'var(--panel)', '--run-bg': 'var(--accent)', '--run-ink': 'var(--accent-ink)', '--run-glow': 'var(--accent)',
  '--art': 'none', '--art-opacity': '0', '--art-size': 'auto', '--art-pos': '0 0', '--art-repeat': 'repeat', '--art-mask': 'none',
  '--bar-strip': 'none', '--bar-strip-h': '0px', '--glow-k': '55%', '--glow-r': '7px',
};

const light = {
  ...dark,
  '--bg': '#eef1f5', '--panel': '#ffffff', '--panel-2': '#f5f7fa', '--panel-3': '#eaeef3', '--line': '#e1e6ed', '--line-2': '#d3dae4',
  '--text': '#18202e', '--muted': '#5d687c', '--faint': '#98a2b3',
  '--accent': '#12a150', '--accent-ink': '#ffffff', '--accent-soft': 'rgba(18,161,80,.12)', '--blue': '#2f62e0',
  '--danger': '#d93a3a', '--danger-soft': 'rgba(217,58,58,.1)', '--warn': '#b7740c', '--ok': '#12a150',
  '--code-bg': '#ffffff', '--code-fg': '#1d2433', '--code-gutter': '#a6afbd', '--code-active': 'rgba(20,40,80,.035)',
  '--code-sel': 'rgba(47,98,224,.2)', '--code-match': 'rgba(47,98,224,.12)', '--code-match-line': 'rgba(47,98,224,.4)',
  '--code-search': 'rgba(240,170,40,.3)', '--err-line': 'rgba(217,58,58,.09)', '--warn-line': 'rgba(200,140,20,.09)',
  '--hl-kw': '#8b3fd9', '--hl-str': '#23863a', '--hl-num': '#c35a00', '--hl-fn': '#1f62c9', '--hl-type': '#9a6b00',
  '--hl-prop': '#0f7891', '--hl-def': '#1d2433', '--hl-op': '#0f7891', '--hl-tag': '#c62c2c', '--hl-comment': '#8a93a3', '--hl-punc': '#5d687c',
  '--t-err': '#c62c2c', '--t-sys': '#7a8496', '--t-echo': '#12a150',
  '--rb1': '#b7740c', '--rb2': '#8b3fd9', '--rb3': '#1f62c9', '--rb4': '#23863a', '--rb5': '#c62c2c', '--rb6': '#0f7891',
  '--guide': 'rgba(20,40,80,.08)', '--shadow': '0 18px 50px rgba(20,30,50,.18)',
};

export const themes = [
  {
    id: 'neon', scheme: 'dark', fx: ['glow', 'grid'],
    name: { ar: 'نيون وهران', fr: 'Néon d’Oran', en: 'Oran Neon' },
    vars: {
      ...dark,
      '--bg': '#07040f', '--panel': '#0d0819', '--panel-2': '#140c26', '--panel-3': '#1c1236', '--line': '#2a1d4a', '--line-2': '#3b2a66',
      '--text': '#f4ecff', '--muted': '#a897cf', '--faint': '#6f5d99',
      '--accent': '#ff2fd1', '--accent-ink': '#1c0018', '--accent-soft': 'rgba(255,47,209,.16)', '--blue': '#00e5ff',
      '--danger': '#ff4d6d', '--danger-soft': 'rgba(255,77,109,.16)', '--warn': '#ffd23f', '--ok': '#39ff9f',
      '--code-bg': '#090513', '--code-fg': '#efe6ff', '--code-gutter': '#5d4b8a', '--code-active': 'rgba(255,47,209,.07)',
      '--code-sel': 'rgba(0,229,255,.25)', '--code-match': 'rgba(0,229,255,.15)', '--code-match-line': 'rgba(0,229,255,.55)',
      '--hl-kw': '#ff4fd8', '--hl-str': '#3dffb0', '--hl-num': '#ffd23f', '--hl-fn': '#00e5ff', '--hl-type': '#b98cff',
      '--hl-prop': '#7df9ff', '--hl-def': '#f4ecff', '--hl-op': '#ff8af0', '--hl-tag': '#ff4d6d', '--hl-comment': '#7262a3', '--hl-punc': '#bba9e8',
      '--t-err': '#ff6b8b', '--t-sys': '#8676b3', '--t-echo': '#39ff9f',
      '--rb1': '#ffd23f', '--rb2': '#ff4fd8', '--rb3': '#00e5ff', '--rb4': '#3dffb0', '--rb5': '#b98cff', '--rb6': '#ff8a5c',
      '--guide': 'rgba(255,79,216,.12)',
      '--bar-bg': 'linear-gradient(100deg, #12082a, #0d0819 55%, #08142a)',
      '--run-bg': 'linear-gradient(120deg, #ff2fd1, #9b4dff 55%, #00e5ff)', '--run-ink': '#ffffff', '--run-glow': '#ff2fd1',
      '--art': NEON_GRID, '--art-opacity': '.22', '--art-size': '44px 44px', '--art-mask': 'linear-gradient(to top, #000, transparent 55%)',
      '--bar-strip': 'linear-gradient(90deg, #ff2fd1, #00e5ff)', '--bar-strip-h': '2px',
    },
  },
  {
    id: 'zellige', scheme: 'dark', fx: ['art'],
    name: { ar: 'الزليج', fr: 'Zellige', en: 'Zellige' },
    vars: {
      ...dark,
      '--bg': '#03181a', '--panel': '#052124', '--panel-2': '#082b2e', '--panel-3': '#0d3639', '--line': '#144245', '--line-2': '#1d5357',
      '--text': '#ebf5f0', '--muted': '#8fb5ae', '--faint': '#5b827c',
      '--accent': '#e3b35c', '--accent-ink': '#2a1a00', '--accent-soft': 'rgba(227,179,92,.16)', '--blue': '#4fd1c5',
      '--ok': '#7fd8a6', '--warn': '#f2c46d',
      '--code-bg': '#031416', '--code-fg': '#e6f2ec', '--code-gutter': '#3f6e69', '--code-active': 'rgba(227,179,92,.06)',
      '--code-sel': 'rgba(79,209,197,.25)', '--code-match': 'rgba(79,209,197,.14)', '--code-match-line': 'rgba(79,209,197,.5)',
      '--hl-kw': '#e3b35c', '--hl-str': '#7fd8a6', '--hl-num': '#f08a5d', '--hl-fn': '#4fd1c5', '--hl-type': '#f2d49b',
      '--hl-prop': '#9ad9e0', '--hl-def': '#ebf5f0', '--hl-op': '#e8a87c', '--hl-tag': '#f07167', '--hl-comment': '#5f8a85', '--hl-punc': '#a7c4bd',
      '--t-echo': '#e3b35c',
      '--rb1': '#e3b35c', '--rb2': '#4fd1c5', '--rb3': '#f08a5d', '--rb4': '#7fd8a6', '--rb5': '#f2d49b', '--rb6': '#9ad9e0',
      '--guide': 'rgba(227,179,92,.1)',
      '--bar-bg': 'linear-gradient(180deg, #072a2d, #052124)',
      '--art': ZELLIGE, '--art-opacity': '.05', '--art-size': '96px 96px',
      '--bar-strip': 'repeating-linear-gradient(90deg, #e3b35c 0 10px, #0d3639 10px 14px, #4fd1c5 14px 24px, #0d3639 24px 28px)', '--bar-strip-h': '3px',
    },
  },
  {
    id: 'sahara', scheme: 'dark', fx: ['art'],
    name: { ar: 'ليل الصحراء', fr: 'Nuit du Sahara', en: 'Sahara Night' },
    vars: {
      ...dark,
      '--bg': '#130d08', '--panel': '#1a120b', '--panel-2': '#22180f', '--panel-3': '#2c1f14', '--line': '#3a2a1b', '--line-2': '#4b3624',
      '--text': '#f5e9d3', '--muted': '#bb9f7d', '--faint': '#7f6750',
      '--accent': '#f2a541', '--accent-ink': '#2a1500', '--accent-soft': 'rgba(242,165,65,.15)', '--blue': '#6fb3d2',
      '--ok': '#b5d36a', '--danger': '#ef6f55',
      '--code-bg': '#110b06', '--code-fg': '#f2e4cc', '--code-gutter': '#6b5640', '--code-active': 'rgba(242,165,65,.06)',
      '--code-sel': 'rgba(242,165,65,.22)', '--code-match': 'rgba(242,165,65,.13)', '--code-match-line': 'rgba(242,165,65,.45)',
      '--hl-kw': '#e8775e', '--hl-str': '#c9d77e', '--hl-num': '#f2a541', '--hl-fn': '#ecc26b', '--hl-type': '#f4a261',
      '--hl-prop': '#d8b98a', '--hl-def': '#f5e9d3', '--hl-op': '#e9895f', '--hl-tag': '#e2725b', '--hl-comment': '#7f6750', '--hl-punc': '#c2a989',
      '--t-echo': '#f2a541',
      '--rb1': '#f2a541', '--rb2': '#e8775e', '--rb3': '#c9d77e', '--rb4': '#6fb3d2', '--rb5': '#ecc26b', '--rb6': '#d8b98a',
      '--guide': 'rgba(242,165,65,.09)',
      '--bar-bg': 'linear-gradient(100deg, #2a1810, #1a120b 60%)',
      '--run-bg': 'linear-gradient(120deg, #f2a541, #e2725b)', '--run-ink': '#2a1000', '--run-glow': '#e2725b',
      '--art': DUNES, '--art-opacity': '.16', '--art-size': '100% 34%', '--art-pos': 'bottom', '--art-repeat': 'no-repeat',
    },
  },
  {
    id: 'noir', scheme: 'dark', fx: [],
    name: { ar: 'برمج الليلي', fr: 'Barmaj Noir', en: 'Barmaj Noir' },
    vars: { ...dark },
  },
  {
    id: 'matrix', scheme: 'dark', fx: ['glow', 'scanlines'],
    name: { ar: 'ماتريكس', fr: 'Matrix', en: 'Matrix' },
    vars: {
      ...dark,
      '--bg': '#000000', '--panel': '#020a04', '--panel-2': '#041208', '--panel-3': '#07190c', '--line': '#0c2a14', '--line-2': '#12391c',
      '--text': '#b8ffbf', '--muted': '#5fae6d', '--faint': '#2f6b3b',
      '--accent': '#00ff66', '--accent-ink': '#001a0a', '--accent-soft': 'rgba(0,255,102,.13)', '--blue': '#5cffc4',
      '--danger': '#ff5c5c', '--warn': '#d6ff5c', '--ok': '#00ff66',
      '--code-bg': '#000000', '--code-fg': '#9dffa6', '--code-gutter': '#1f5a2c', '--code-active': 'rgba(0,255,102,.06)',
      '--code-sel': 'rgba(0,255,102,.22)', '--code-match': 'rgba(0,255,102,.12)', '--code-match-line': 'rgba(0,255,102,.5)',
      '--hl-kw': '#00ff66', '--hl-str': '#7dff9b', '--hl-num': '#d6ff5c', '--hl-fn': '#5cffc4', '--hl-type': '#a8ff7a',
      '--hl-prop': '#8cffb5', '--hl-def': '#c8ffd0', '--hl-op': '#66ff99', '--hl-tag': '#00ff66', '--hl-comment': '#2f7a3f', '--hl-punc': '#6ccf7d',
      '--t-err': '#ff7070', '--t-sys': '#3f9150', '--t-echo': '#00ff66',
      '--rb1': '#00ff66', '--rb2': '#d6ff5c', '--rb3': '#5cffc4', '--rb4': '#a8ff7a', '--rb5': '#7dff9b', '--rb6': '#8cffb5',
      '--guide': 'rgba(0,255,102,.1)', '--glow-k': '70%', '--glow-r': '6px',
    },
  },
  {
    id: 'casbah', scheme: 'light', fx: [],
    name: { ar: 'القصبة', fr: 'Casbah', en: 'Casbah' },
    vars: {
      ...light,
      '--bg': '#f1ece1', '--panel': '#fbf8f1', '--panel-2': '#f4eee2', '--panel-3': '#eae2d2', '--line': '#e0d6c2', '--line-2': '#d1c3a6',
      '--text': '#1b2738', '--muted': '#5b6878', '--faint': '#9aa4ae',
      '--accent': '#1f5fbf', '--accent-ink': '#ffffff', '--accent-soft': 'rgba(31,95,191,.12)', '--blue': '#1f5fbf',
      '--ok': '#2e8b57', '--danger': '#c0392b', '--warn': '#b7791f',
      '--code-bg': '#fffdf7', '--code-fg': '#1b2738', '--code-gutter': '#b3a88f', '--code-active': 'rgba(31,95,191,.05)',
      '--hl-kw': '#1f5fbf', '--hl-str': '#b5651d', '--hl-num': '#c0392b', '--hl-fn': '#0e7c86', '--hl-type': '#7b3fa0',
      '--hl-prop': '#0e7c86', '--hl-def': '#1b2738', '--hl-op': '#8a5a44', '--hl-tag': '#c0392b', '--hl-comment': '#a0947c', '--hl-punc': '#6b6455',
      '--t-echo': '#1f5fbf',
      '--rb1': '#1f5fbf', '--rb2': '#b5651d', '--rb3': '#0e7c86', '--rb4': '#c0392b', '--rb5': '#7b3fa0', '--rb6': '#2e8b57',
      '--guide': 'rgba(31,95,191,.1)',
      '--bar-strip': 'repeating-linear-gradient(135deg, #1f5fbf 0 7px, #fbf8f1 7px 10px, #b5651d 10px 13px, #fbf8f1 13px 16px)', '--bar-strip-h': '4px',
    },
  },
  {
    id: 'atlas', scheme: 'light', fx: [],
    name: { ar: 'الأطلس', fr: 'Atlas', en: 'Atlas' },
    vars: { ...light },
  },
];

export const themeById = Object.fromEntries(themes.map((th) => [th.id, th]));

const prefersLight = () => matchMedia('(prefers-color-scheme: light)').matches;

// 'auto' follows the phone; 'dark' / 'light' are kept from older settings
export const resolveTheme = (id) => {
  if (id === 'auto') return prefersLight() ? themeById.atlas : themeById.noir;
  if (id === 'dark') return themeById.noir;
  if (id === 'light') return themeById.atlas;
  return themeById[id] || themeById.neon;
};

const hexRgb = (hex) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// A custom accent colour on top of any theme
export const accentVars = (hex) => {
  const [r, g, b] = hexRgb(hex);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return {
    '--accent': hex,
    '--accent-soft': `rgba(${r},${g},${b},.15)`,
    '--accent-ink': lum > 0.55 ? '#111111' : '#ffffff',
    '--run-bg': hex,
    '--run-ink': lum > 0.55 ? '#111111' : '#ffffff',
    '--run-glow': hex,
    '--t-echo': hex,
  };
};

export const ACCENTS = ['#3ddc84', '#ff2fd1', '#00e5ff', '#e3b35c', '#f2a541', '#ff6b6b', '#9b6bff', '#2f80ff'];
