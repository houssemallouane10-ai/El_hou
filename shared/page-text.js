// Plain-text page bodies (about, terms, privacy…) as used in the locale files: blank lines
// separate blocks, a block may open with a "## " heading line, and a block whose lines all start
// with "- " is a list. Shared by the server (pre-rendered pages) and the browser.
export const parsePageText = (text) => String(text).split(/\n{2,}/).flatMap((block) => {
  const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
  const parts = [];
  if (lines[0]?.startsWith('## ')) parts.push({ type: 'heading', text: lines.shift().slice(3) });
  if (lines.length === 0) return parts;
  if (lines.every((line) => line.startsWith('- '))) parts.push({ type: 'list', items: lines.map((line) => line.slice(2)) });
  else parts.push({ type: 'paragraph', text: lines.join('\n') });
  return parts;
});
