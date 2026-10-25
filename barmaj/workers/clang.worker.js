// On-device C/C++ compiler: Clang/LLD from YoWASP (LLVM compiled to
// WebAssembly), producing wasm32-wasi programs that wasi.worker.js runs.
// This is a module worker that stays alive, so the compiler loads once.
let tool = null;
let progressId = null;

// GCC's all-in-one header, which libc++ does not ship
const BITS = `#include <algorithm>
#include <array>
#include <bit>
#include <bitset>
#include <cassert>
#include <cctype>
#include <cfloat>
#include <chrono>
#include <climits>
#include <cmath>
#include <complex>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <ctime>
#include <deque>
#include <functional>
#include <iomanip>
#include <iostream>
#include <iterator>
#include <limits>
#include <list>
#include <map>
#include <memory>
#include <numeric>
#include <optional>
#include <queue>
#include <random>
#include <set>
#include <sstream>
#include <stack>
#include <string>
#include <string_view>
#include <tuple>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <valarray>
#include <variant>
#include <vector>
`;

// Unbuffered stdout, so prompts appear before the program waits for input
const INIT = `#include <stdio.h>
__attribute__((constructor)) static void barmaj_unbuffered(void) { setvbuf(stdout, NULL, _IONBF, 0); }
`;

const post = (msg, transfer) => postMessage(msg, transfer || []);

let lastPercent = -1;
const onProgress = ({ totalLength, doneLength }) => {
  const percent = Math.floor((100 * doneLength) / totalLength);
  if (percent === lastPercent) return;
  lastPercent = percent;
  post({ type: 'progress', id: progressId, percent });
};

const load = (base) => {
  if (!tool) {
    tool = import(`${base}gen/bundle.js`)
      .then(async (m) => {
        await m.runClang(null, {}, { fetchProgress: onProgress });
        return m;
      })
      .catch((e) => {
        tool = null;
        throw e;
      });
  }
  return tool;
};

const splitFlags = (s) => (s || '').match(/"[^"]*"|'[^']*'|\S+/g)?.map((a) => a.replace(/^["']|["']$/g, '')) || [];

self.onmessage = async ({ data }) => {
  const { id } = data;
  progressId = id;
  let clang;
  try {
    clang = await load(data.base);
  } catch (e) {
    post({ type: 'error', id, message: String(e?.message || e) });
    return;
  }
  if (data.type === 'prefetch') {
    post({ type: 'ready', id });
    return;
  }
  const cpp = data.lang === 'cpp';
  const main = cpp ? 'main.cpp' : 'main.c';
  const init = cpp ? 'barmaj_init.cpp' : 'barmaj_init.c';
  const args = [
    cpp ? 'clang++' : 'clang',
    ...splitFlags(data.flags),
    '-fcolor-diagnostics',
    '-I', 'barmaj-include',
    ...(cpp ? ['-fno-exceptions'] : []),
    main, init,
    '-o', 'main.wasm',
    '-Wl,-z,stack-size=8388608',
    ...(cpp ? [] : ['-lm']),
  ];
  let diag = '';
  const dec = new TextDecoder();
  const collect = (bytes) => { if (bytes) diag += dec.decode(bytes, { stream: true }); };
  const start = performance.now();
  try {
    const out = await clang.runClang(args, {
      [main]: data.code,
      [init]: INIT,
      'barmaj-include': { bits: { 'stdc++.h': BITS } },
    }, { stdout: collect, stderr: collect });
    const wasm = out['main.wasm'];
    post({ type: 'compiled', id, ok: true, wasm, diag, time: performance.now() - start }, [wasm.buffer]);
  } catch (e) {
    if (typeof e?.code !== 'number') {
      post({ type: 'error', id, message: String(e?.message || e) });
      return;
    }
    post({ type: 'compiled', id, ok: false, diag, exitCode: e.code, time: performance.now() - start });
  }
};
