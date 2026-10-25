// Renders code as a shareable image in the current theme, signed with the
// user's name: a window with the file name and language, coloured code and
// line numbers, on a gradient (or the theme's art) background.
const S = 2;
const FONT = 15 * S;
const LINE = Math.round(FONT * 1.65);
const PAD = 56 * S;
const BAR = 54 * S;
const GUTTER_GAP = 18 * S;
const INNER = 28 * S;
const MAX_COLS = 84;

const cssVar = (css, name) => css.getPropertyValue(name).trim();

const loadImage = (src) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

// Split long lines so the image stays readable on a phone
const wrap = (lines) => {
  const out = [];
  lines.forEach((line, n) => {
    let row = [];
    let cols = 0;
    let first = true;
    for (const [text, cls] of line) {
      let rest = text;
      while (cols + rest.length > MAX_COLS) {
        const take = MAX_COLS - cols;
        if (take > 0) row.push([rest.slice(0, take), cls]);
        out.push({ n: first ? n : null, row });
        first = false;
        row = [];
        cols = 0;
        rest = rest.slice(take);
      }
      if (rest) { row.push([rest, cls]); cols += rest.length; }
    }
    out.push({ n: first ? n : null, row });
  });
  return out;
};

export const renderCodeImage = async ({ tokens, fileName, lang, author, brand }) => {
  await Promise.all([
    document.fonts.load(`500 ${FONT}px "JetBrains Mono"`),
    document.fonts.load(`600 ${16 * S}px "IBM Plex Sans Arabic"`),
  ]).catch(() => {});
  const css = getComputedStyle(document.documentElement);
  const color = (cls) => cssVar(css, cls ? `--hl-${cls}` : '--code-fg') || cssVar(css, '--code-fg');
  const rows = wrap(tokens.lines);
  const lastNumber = tokens.firstLine + tokens.lines.length - 1;

  const measure = document.createElement('canvas').getContext('2d');
  measure.font = `500 ${FONT}px "JetBrains Mono", monospace`;
  const charW = measure.measureText('M').width;
  const gutterW = String(lastNumber).length * charW;
  const longest = Math.max(24, ...rows.map((r) => r.row.reduce((n, [text]) => n + text.length, 0)));
  const cardW = Math.round(INNER * 2 + gutterW + GUTTER_GAP + longest * charW);
  const codeH = rows.length * LINE + (tokens.more ? LINE : 0);
  const cardH = BAR + INNER + codeH + INNER * 0.8;
  const footH = 58 * S;
  const W = Math.max(cardW + PAD * 2, 760 * S);
  const H = cardH + PAD + footH + PAD * 0.4;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background: accent gradient, plus the theme's art pattern when it has one
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, cssVar(css, '--accent') || '#3ddc84');
  g.addColorStop(1, cssVar(css, '--blue') || '#7aa2ff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(5, 8, 14, .38)';
  ctx.fillRect(0, 0, W, H);
  const art = cssVar(css, '--art').match(/url\("(data:image\/svg\+xml[^"]+)"\)/);
  if (art) {
    const img = await loadImage(art[1]);
    if (img) {
      ctx.globalAlpha = 0.18;
      const tile = document.createElement('canvas');
      tile.width = 96 * S;
      tile.height = 96 * S;
      tile.getContext('2d').drawImage(img, 0, 0, tile.width, tile.height);
      ctx.fillStyle = ctx.createPattern(tile, 'repeat');
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  // Window
  const x = (W - cardW) / 2;
  const y = PAD;
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, .5)';
  ctx.shadowBlur = 60 * S;
  ctx.shadowOffsetY = 20 * S;
  roundRect(ctx, x, y, cardW, cardH, 20 * S);
  ctx.fillStyle = cssVar(css, '--code-bg') || '#0e1218';
  ctx.fill();
  ctx.restore();
  roundRect(ctx, x, y, cardW, cardH, 20 * S);
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = S;
  ctx.stroke();

  // Title bar: three dots, file name, language badge
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
    ctx.beginPath();
    ctx.arc(x + 26 * S + i * 20 * S, y + BAR / 2, 6 * S, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  });
  ctx.font = `600 ${14 * S}px "IBM Plex Sans Arabic", system-ui, sans-serif`;
  ctx.fillStyle = cssVar(css, '--muted') || '#8d97a9';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fileName, x + cardW / 2, y + BAR / 2);
  ctx.font = `700 ${12 * S}px "JetBrains Mono", monospace`;
  const badgeW = ctx.measureText(lang.badge).width + 16 * S;
  roundRect(ctx, x + cardW - badgeW - 18 * S, y + BAR / 2 - 12 * S, badgeW, 24 * S, 7 * S);
  ctx.fillStyle = lang.color;
  ctx.fill();
  ctx.fillStyle = lang.fg || '#fff';
  ctx.fillText(lang.badge, x + cardW - badgeW / 2 - 18 * S, y + BAR / 2 + S);
  ctx.fillStyle = 'rgba(255,255,255,.06)';
  ctx.fillRect(x, y + BAR, cardW, S);

  // Code
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `500 ${FONT}px "JetBrains Mono", monospace`;
  const codeX = x + INNER + gutterW + GUTTER_GAP;
  let cy = y + BAR + INNER + FONT;
  for (const { n, row } of rows) {
    if (n !== null) {
      ctx.fillStyle = cssVar(css, '--code-gutter') || '#4b5466';
      ctx.textAlign = 'right';
      ctx.fillText(String(tokens.firstLine + n), x + INNER + gutterW, cy);
      ctx.textAlign = 'left';
    }
    let cx = codeX;
    for (const [text, cls] of row) {
      ctx.fillStyle = color(cls);
      ctx.fillText(text, cx, cy);
      cx += text.length * charW;
    }
    cy += LINE;
  }
  if (tokens.more) {
    ctx.fillStyle = cssVar(css, '--code-gutter');
    ctx.fillText(`… +${tokens.more}`, codeX, cy);
  }

  // Signature
  const fy = y + cardH + footH / 2 + 8 * S;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.font = `700 ${17 * S}px "IBM Plex Sans Arabic", system-ui, sans-serif`;
  if (author) {
    ctx.textAlign = 'left';
    ctx.direction = /[؀-ۿ]/.test(author) ? 'rtl' : 'ltr';
    ctx.textAlign = ctx.direction === 'rtl' ? 'right' : 'left';
    ctx.fillText(`— ${author}`, ctx.direction === 'rtl' ? x + ctx.measureText(`— ${author}`).width : x, fy);
    ctx.direction = 'ltr';
  }
  const logo = await loadImage('icons/icon.svg');
  ctx.font = `600 ${14 * S}px "IBM Plex Sans Arabic", system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  const brandText = brand;
  ctx.fillText(brandText, x + cardW, fy);
  if (logo) {
    const tw = ctx.measureText(brandText).width;
    ctx.drawImage(logo, x + cardW - tw - 34 * S, fy - 13 * S, 26 * S, 26 * S);
  }

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
};
