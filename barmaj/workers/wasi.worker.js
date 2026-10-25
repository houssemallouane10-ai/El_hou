// Runs a C/C++ program compiled to WebAssembly (wasm32-wasi) by the on-device
// Clang. A fresh worker per run, so Stop never touches the compiler.
// Implements the small part of WASI preview1 that console programs use;
// anything else answers ENOSYS.
importScripts('stdin.js');

const post = (type, data) => postMessage({ type, ...data });

const E = { SUCCESS: 0, BADF: 8, INVAL: 28, NOSYS: 52, SPIPE: 70 };

class Exit {
  constructor(code) { this.code = code; }
}

// Output is batched: one message per 4 KB or 40 ms, and always before reading input
const output = () => {
  const parts = { 1: [], 2: [] };
  const dec = { 1: new TextDecoder(), 2: new TextDecoder() };
  let size = 0;
  let last = performance.now();
  const flush = () => {
    for (const fd of [1, 2]) {
      if (!parts[fd].length) continue;
      const text = parts[fd].map((b) => dec[fd].decode(b, { stream: true })).join('');
      parts[fd] = [];
      if (text) post(fd === 1 ? 'out' : 'err', { text });
    }
    size = 0;
    last = performance.now();
  };
  const write = (fd, bytes) => {
    parts[fd].push(bytes);
    size += bytes.length;
    if (size > 4096 || performance.now() - last > 40) flush();
  };
  return { write, flush };
};

const makeWasi = (args, io, getMemory) => {
  const enc = new TextEncoder();
  const dv = () => new DataView(getMemory().buffer);
  const u8 = () => new Uint8Array(getMemory().buffer);
  const env = ['LANG=C.UTF-8', 'TERM=xterm'];
  let pending = new Uint8Array(0);
  let eof = false;

  const strings = (list) => list.map((s) => enc.encode(s + '\0'));
  const sizes = (list, countPtr, sizePtr) => {
    const enc8 = strings(list);
    dv().setUint32(countPtr, enc8.length, true);
    dv().setUint32(sizePtr, enc8.reduce((n, b) => n + b.length, 0), true);
    return E.SUCCESS;
  };
  const fill = (list, ptrs, buf) => {
    let p = buf;
    strings(list).forEach((b, i) => {
      dv().setUint32(ptrs + i * 4, p, true);
      u8().set(b, p);
      p += b.length;
    });
    return E.SUCCESS;
  };

  const wasi = {
    args_sizes_get: (c, s) => sizes(args, c, s),
    args_get: (p, b) => fill(args, p, b),
    environ_sizes_get: (c, s) => sizes(env, c, s),
    environ_get: (p, b) => fill(env, p, b),

    fd_write(fd, iovs, count, written) {
      if (fd !== 1 && fd !== 2) return E.BADF;
      let n = 0;
      for (let i = 0; i < count; i++) {
        const ptr = dv().getUint32(iovs + i * 8, true);
        const len = dv().getUint32(iovs + i * 8 + 4, true);
        if (len) io.write(fd, u8().slice(ptr, ptr + len));
        n += len;
      }
      dv().setUint32(written, n, true);
      return E.SUCCESS;
    },

    fd_read(fd, iovs, count, read) {
      if (fd !== 0) return E.BADF;
      if (!pending.length && !eof) {
        io.flush();
        const line = barmajStdin.readLine();
        if (line === null) eof = true;
        else pending = enc.encode(line + '\n');
      }
      let n = 0;
      for (let i = 0; i < count && pending.length; i++) {
        const ptr = dv().getUint32(iovs + i * 8, true);
        const len = dv().getUint32(iovs + i * 8 + 4, true);
        const chunk = pending.subarray(0, len);
        u8().set(chunk, ptr);
        pending = pending.subarray(chunk.length);
        n += chunk.length;
      }
      dv().setUint32(read, n, true);
      return E.SUCCESS;
    },

    // stdin/stdout/stderr look like a terminal: character device without seek rights
    fd_fdstat_get(fd, stat) {
      if (fd > 2) return E.BADF;
      const d = dv();
      d.setUint8(stat, 2);
      d.setUint16(stat + 2, 0, true);
      d.setBigUint64(stat + 8, 0x1fffffffn & ~(1n << 2n) & ~(1n << 5n), true);
      d.setBigUint64(stat + 16, 0n, true);
      return E.SUCCESS;
    },
    fd_fdstat_set_flags: () => E.SUCCESS,
    fd_filestat_get(fd, buf) {
      if (fd > 2) return E.BADF;
      new Uint8Array(getMemory().buffer, buf, 64).fill(0);
      dv().setUint8(buf + 16, 2);
      return E.SUCCESS;
    },
    fd_seek: (fd) => (fd <= 2 ? E.SPIPE : E.BADF),
    fd_tell: (fd) => (fd <= 2 ? E.SPIPE : E.BADF),
    fd_close: () => E.SUCCESS,
    fd_sync: () => E.SUCCESS,
    fd_prestat_get: () => E.BADF,
    fd_prestat_dir_name: () => E.BADF,
    path_open: () => E.NOSYS,

    proc_exit(code) {
      throw new Exit(code);
    },
    proc_raise: () => E.NOSYS,
    sched_yield: () => E.SUCCESS,

    clock_res_get(id, res) {
      dv().setBigUint64(res, 1000n, true);
      return E.SUCCESS;
    },
    clock_time_get(id, precision, time) {
      const ms = id === 0 ? Date.now() : performance.now();
      dv().setBigUint64(time, BigInt(Math.round(ms * 1e6)), true);
      return E.SUCCESS;
    },
    random_get(buf, len) {
      for (let off = 0; off < len; off += 65536) {
        crypto.getRandomValues(new Uint8Array(getMemory().buffer, buf + off, Math.min(65536, len - off)));
      }
      return E.SUCCESS;
    },

    // sleep(): clock subscriptions only, waited out in place
    poll_oneoff(inPtr, outPtr, nsubs, nevents) {
      const d = dv();
      let wait = 0n;
      for (let i = 0; i < nsubs; i++) {
        const s = inPtr + i * 48;
        if (d.getUint8(s + 8) !== 0) continue;
        let timeout = d.getBigUint64(s + 24, true);
        if (d.getUint16(s + 40, true) & 1) timeout -= BigInt(Math.round(Date.now() * 1e6));
        if (timeout > wait) wait = timeout;
      }
      io.flush();
      const until = performance.now() + Number(wait / 1000000n);
      while (performance.now() < until) { /* busy wait: workers cannot block otherwise */ }
      for (let i = 0; i < nsubs; i++) {
        const s = inPtr + i * 48;
        const e = outPtr + i * 32;
        d.setBigUint64(e, d.getBigUint64(s, true), true);
        d.setUint16(e + 8, 0, true);
        d.setUint8(e + 10, d.getUint8(s + 8));
      }
      d.setUint32(nevents, nsubs, true);
      return E.SUCCESS;
    },
  };
  return new Proxy(wasi, { get: (target, name) => target[name] || (() => E.NOSYS) });
};

// Turn WebAssembly traps into the messages a native program would print
const describeTrap = (e) => {
  const m = String(e?.message || e);
  if (/out of bounds|memory access/i.test(m)) return { text: 'Segmentation fault (memory access out of bounds)', code: 139 };
  if (/divide by zero|remainder by zero/i.test(m)) return { text: 'Floating point exception (integer divide by zero)', code: 136 };
  if (/call stack|too much recursion|stack overflow/i.test(m)) return { text: 'Stack overflow (too much recursion)', code: 139 };
  if (/unreachable/i.test(m)) return { text: 'Aborted', code: 134 };
  if (/integer overflow|float unrepresentable/i.test(m)) return { text: `Runtime error: ${m}`, code: 134 };
  return { text: `Runtime error: ${m}`, code: 1 };
};

self.onmessage = async ({ data }) => {
  if (data.type !== 'run') return;
  barmajStdin.reset(data);
  const io = output();
  let memory = null;
  const args = ['main', ...((data.args || '').match(/"[^"]*"|'[^']*'|\S+/g) || []).map((a) => a.replace(/^["']|["']$/g, ''))];
  const wasi = makeWasi(args, io, () => memory);
  let module;
  try {
    module = await WebAssembly.compile(data.wasm);
  } catch (e) {
    post('done', { ok: false, time: 0, engineError: String(e.message || e) });
    return;
  }
  const start = performance.now();
  let code = 0;
  try {
    const instance = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasi });
    memory = instance.exports.memory;
    instance.exports._start();
  } catch (e) {
    if (e instanceof Exit) code = e.code;
    else {
      io.flush();
      const trap = describeTrap(e);
      post('err', { text: `\n${trap.text}\n` });
      code = trap.code;
    }
  }
  io.flush();
  post('done', { ok: code === 0, exitCode: code, time: performance.now() - start });
};
