// Runs Lua 5.4 (wasmoon) in a fresh worker per run, with print, io.write
// and io.read wired to the output panel and the interactive stdin.
importScripts('stdin.js', '../vendor/wasmoon.js');

const post = (type, data) => postMessage({ type, ...data });

const PRELUDE = `
local out, err, read = __barmaj_out, __barmaj_err, __barmaj_read
__barmaj_out, __barmaj_err, __barmaj_read = nil, nil, nil

local function emit(f, ...)
  for i = 1, select('#', ...) do
    local v = select(i, ...)
    f(type(v) == 'number' and tostring(v) or v)
  end
end

function print(...)
  local t = {}
  for i = 1, select('#', ...) do t[i] = tostring((select(i, ...))) end
  out(table.concat(t, '\\t') .. '\\n')
end

local pending
local function line()
  if pending then local p = pending; pending = nil; return p end
  return read()
end

local function readOne(fmt)
  if type(fmt) == 'number' then
    local l = line()
    if l and #l > fmt then pending = l:sub(fmt + 1) end
    return l and l:sub(1, fmt)
  end
  fmt = (fmt or 'l'):gsub('^%*', ''):sub(1, 1)
  if fmt == 'n' then
    local l = line()
    while l and not l:match('%S') do l = line() end
    if not l then return nil end
    local num, rest = l:match('^%s*(%S+)(.*)$')
    if rest:match('%S') then pending = rest end
    return tonumber(num)
  elseif fmt == 'L' then
    local l = line()
    return l and (l .. '\\n')
  elseif fmt == 'a' then
    local t = {}
    for l in line do t[#t + 1] = l end
    return table.concat(t, '\\n')
  end
  return line()
end

io.write = function(...) emit(out, ...) return io.stdout end
io.read = function(...)
  if select('#', ...) == 0 then return readOne('l') end
  local r = {}
  for i = 1, select('#', ...) do r[i] = readOne((select(i, ...))) end
  return table.unpack(r, 1, select('#', ...))
end
io.lines = function(name)
  if name then error('files are not available here', 2) end
  return line
end
local fileMeta = getmetatable(io.stdout).__index
local nativeWrite = fileMeta.write
fileMeta.write = function(f, ...)
  if f == io.stdout then emit(out, ...) return f end
  if f == io.stderr then emit(err, ...) return f end
  return nativeWrite(f, ...)
end
local nativeRead = fileMeta.read
fileMeta.read = function(f, ...)
  if f == io.stdin then return io.read(...) end
  return nativeRead(f, ...)
end
`;

self.onmessage = async ({ data }) => {
  if (data.type !== 'run') return;
  barmajStdin.reset(data);
  let lua;
  try {
    const factory = new wasmoon.LuaFactory(new URL('../vendor/wasmoon.wasm', self.location.href).href);
    lua = await factory.createEngine({ injectObjects: false, enableProxy: false });
  } catch (e) {
    post('done', { ok: false, time: 0, engineError: String(e.message || e) });
    return;
  }
  lua.global.set('__barmaj_out', (s) => post('out', { text: String(s) }));
  lua.global.set('__barmaj_err', (s) => post('err', { text: String(s) }));
  lua.global.set('__barmaj_read', () => barmajStdin.readLine());
  await lua.doString(PRELUDE);
  const start = performance.now();
  try {
    lua.global.loadString(data.code, '@main.lua');
    await lua.global.run(0);
    post('done', { ok: true, time: performance.now() - start });
  } catch (e) {
    const message = String(e.message || e);
    post('err', { text: message.replace(/\n?stack traceback:[\s\S]*$/, '') + '\n' });
    const m = message.match(/main\.lua:(\d+):/);
    post('done', { ok: false, time: performance.now() - start, error: { name: 'LuaError', message, line: m ? +m[1] : 0 } });
  } finally {
    try { lua.global.close(); } catch { /* already closed */ }
  }
};
