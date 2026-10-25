// Synchronous stdin for engine workers.
// Lines typed in the Input tab are consumed first. After that the worker asks
// the page for a line and blocks on a synchronous XHR that the service worker
// (sw.js) answers once the user has typed it. Without the service worker the
// program simply reaches end of input.
self.barmajStdin = {
  lines: [],
  bridge: false,
  url: new URL('../__stdin__', self.location.href).href,
  seq: 0,

  reset({ stdin, interactive }) {
    this.lines = stdin ? stdin.replace(/\r\n/g, '\n').split('\n') : [];
    if (this.lines.length && this.lines[this.lines.length - 1] === '') this.lines.pop();
    this.bridge = interactive && this.ping();
  },

  ping() {
    try {
      const x = new XMLHttpRequest();
      x.open('GET', this.url + '?ping=1', false);
      x.send();
      return x.status === 200 && x.getResponseHeader('x-barmaj') === 'stdin';
    } catch {
      return false;
    }
  },

  // Returns the next line without its newline, or null at end of input
  readLine() {
    if (this.lines.length) {
      const line = this.lines.shift();
      postMessage({ type: 'echo', text: line + '\n' });
      return line;
    }
    if (!this.bridge) return null;
    const id = `${Date.now().toString(36)}-${++this.seq}-${Math.random().toString(36).slice(2, 8)}`;
    postMessage({ type: 'stdin', id });
    for (;;) {
      let x;
      try {
        x = new XMLHttpRequest();
        x.open('GET', `${this.url}?id=${id}`, false);
        x.send();
      } catch {
        return null;
      }
      if (x.status === 204) continue; // still waiting, ask again
      if (x.status !== 200) return null;
      const reply = JSON.parse(x.responseText);
      return reply.value == null ? null : String(reply.value);
    }
  },
};
