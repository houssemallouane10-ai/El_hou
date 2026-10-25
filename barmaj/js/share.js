// Share code inside the link itself: #c=<base64url of deflated JSON>.
// Nothing is uploaded anywhere.
const b64url = (bytes) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

export const encodeShare = async (file) => {
  const json = JSON.stringify({ l: file.lang, n: file.name, c: file.code, i: file.stdin || undefined, a: file.author || undefined });
  const bytes = new TextEncoder().encode(json);
  if (typeof CompressionStream === 'function') return 'z' + b64url(await pipe(bytes, new CompressionStream('deflate-raw')));
  return 'u' + b64url(bytes);
};

export const decodeShare = async (token) => {
  const kind = token[0];
  let bytes = fromB64url(token.slice(1));
  if (kind === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
  else if (kind !== 'u') throw new Error('unknown link format');
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (typeof data.c !== 'string' || typeof data.l !== 'string') throw new Error('bad link');
  return {
    lang: data.l,
    name: String(data.n || 'shared'),
    code: data.c,
    stdin: typeof data.i === 'string' ? data.i : '',
    author: typeof data.a === 'string' ? data.a.slice(0, 40) : '',
  };
};

export const shareUrl = async (file) => {
  const url = new URL(location.href);
  url.search = '';
  url.hash = 'c=' + (await encodeShare(file));
  return url.href;
};
