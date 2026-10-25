// Runs Python with Pyodide. The worker stays alive between runs so Python
// loads only once; each run gets fresh globals. Packages imported by the code
// (numpy, pandas, matplotlib…) are installed automatically, plots and images
// are sent to the output panel, and `import turtle` draws an animated SVG.
importScripts('stdin.js');

const post = (type, data) => postMessage({ type, ...data });
let py = null;
let booting = null;

const RUNNER = String.raw`
import ast, base64, inspect, io, json, linecache, sys, traceback
import js

def emit_image(data, mime='image/png'):
    js.barmajImage(base64.b64encode(data).decode(), mime)

def _show_figures(*args, **kwargs):
    import matplotlib.pyplot as plt
    for n in plt.get_fignums():
        buf = io.BytesIO()
        plt.figure(n).savefig(buf, format='png', dpi=110, bbox_inches='tight')
        emit_image(buf.getvalue())
    plt.close('all')

def _prepare(src):
    if 'matplotlib' in src or 'pandas' in src or 'seaborn' in src:
        try:
            import matplotlib
            matplotlib.use('Agg')
            import matplotlib.pyplot as plt
            plt.show = _show_figures
        except ImportError:
            pass
    if 'PIL' in src:
        try:
            from PIL import Image
            def _show(self, *a, **k):
                buf = io.BytesIO()
                self.save(buf, format='PNG')
                emit_image(buf.getvalue())
            Image.Image.show = _show
        except ImportError:
            pass
    if 'turtle' in sys.modules:
        sys.modules['turtle']._reset()

def _finish():
    if 'matplotlib.pyplot' in sys.modules:
        _show_figures()
    if 'turtle' in sys.modules:
        sys.modules['turtle']._flush()

def _user_line(tb):
    line = 0
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == 'main.py':
            line = tb.tb_lineno
        tb = tb.tb_next
    return line

async def run(src):
    linecache.cache['main.py'] = (len(src), None, src.splitlines(True), 'main.py')
    result = {'code': 0}
    try:
        _prepare(src)
        code = compile(src, 'main.py', 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT, dont_inherit=True)
        scope = {'__name__': '__main__', '__file__': 'main.py', '__builtins__': __builtins__}
        # Running the user's own program is the whole point of this worker
        value = eval(code, scope)
        if inspect.iscoroutine(value):
            await value
    except SystemExit as e:
        if isinstance(e.code, int):
            result['code'] = e.code
        elif e.code is not None:
            print(e.code, file=sys.stderr)
            result['code'] = 1
    except BaseException as e:
        tb = e.__traceback__
        while tb is not None and tb.tb_frame.f_code.co_filename != 'main.py':
            tb = tb.tb_next
        traceback.print_exception(type(e), e, tb)
        line = e.lineno if isinstance(e, SyntaxError) and e.filename == 'main.py' else _user_line(tb)
        result = {'code': 1, 'name': type(e).__name__, 'message': str(e), 'line': line or 0}
    finally:
        try:
            _finish()
        except Exception:
            traceback.print_exc()
        sys.stdout.flush()
        sys.stderr.flush()
    return json.dumps(result)
`;

// A small turtle graphics module: records the drawing and renders an animated SVG
const TURTLE = String.raw`
import math
import js

_mode = 1.0
_ops = []
_turtles = []
_default = None


class _Screen:
    def __init__(self):
        self._bg = 'white'
        self._size = None

    def bgcolor(self, *c):
        if c:
            self._bg = _color(*c)
        return self._bg

    def setup(self, width=None, height=None, startx=None, starty=None):
        if isinstance(width, int) and isinstance(height, int):
            self._size = (width, height)

    def screensize(self, canvwidth=None, canvheight=None, bg=None):
        if bg:
            self.bgcolor(bg)

    def colormode(self, mode=None):
        global _mode
        if mode is None:
            return _mode
        _mode = float(mode)

    def turtles(self):
        return list(_turtles)

    def mainloop(self):
        done()

    def exitonclick(self):
        done()

    def bye(self):
        done()

    def _noop(self, *a, **k):
        return None

    title = tracer = update = listen = onkey = onkeypress = onkeyrelease = onclick = onscreenclick = ontimer = delay = register_shape = addshape = _noop


_screen = _Screen()


def Screen():
    return _screen


def _color(*args):
    if len(args) == 1:
        a = args[0]
        if isinstance(a, str):
            return a
        args = tuple(a)
    if len(args) == 3:
        r, g, b = args
        if _mode == 1.0:
            r, g, b = (v * 255 for v in (r, g, b))
        return 'rgb(%d,%d,%d)' % (round(r), round(g), round(b))
    raise TypeError('bad color arguments: %r' % (args,))


class Vec2D(tuple):
    def __new__(cls, x, y):
        return tuple.__new__(cls, (x, y))

    def __repr__(self):
        return '(%.2f,%.2f)' % self


class Turtle:
    def __init__(self, shape='classic', visible=True, **kwargs):
        self._x = self._y = 0.0
        self._h = 0.0
        self._down = True
        self._pc = 'black'
        self._fc = 'black'
        self._w = 1
        self._visible = visible
        self._fill = None
        self._fill_at = 0
        _turtles.append(self)

    def _line(self, x, y):
        if self._down:
            _ops.append(('line', self._x, self._y, x, y, self._pc, self._w))
        self._x, self._y = x, y
        if self._fill is not None:
            self._fill.append((x, y))

    def forward(self, distance):
        a = math.radians(self._h)
        self._line(self._x + distance * math.cos(a), self._y + distance * math.sin(a))

    def backward(self, distance):
        self.forward(-distance)

    def right(self, angle):
        self._h = (self._h - angle) % 360

    def left(self, angle):
        self._h = (self._h + angle) % 360

    def goto(self, x, y=None):
        if y is None:
            x, y = x
        self._line(float(x), float(y))

    def setx(self, x):
        self._line(float(x), self._y)

    def sety(self, y):
        self._line(self._x, float(y))

    def setheading(self, angle):
        self._h = angle % 360

    def heading(self):
        return self._h

    def home(self):
        self._line(0.0, 0.0)
        self._h = 0.0

    def position(self):
        return Vec2D(self._x, self._y)

    def xcor(self):
        return self._x

    def ycor(self):
        return self._y

    def distance(self, x, y=None):
        if y is None:
            x, y = x
        return math.hypot(x - self._x, y - self._y)

    def towards(self, x, y=None):
        if y is None:
            x, y = x
        return math.degrees(math.atan2(y - self._y, x - self._x)) % 360

    def circle(self, radius, extent=None, steps=None):
        if extent is None:
            extent = 360
        if steps is None:
            frac = abs(extent) / 360
            steps = 1 + int(min(11 + abs(radius) / 6.0, 59.0) * frac)
        w = extent / steps
        w2 = 0.5 * w
        length = 2.0 * radius * math.sin(math.radians(w2))
        if radius < 0:
            length, w, w2 = -length, -w, -w2
        self.left(w2)
        for _ in range(steps):
            self.forward(length)
            self.left(w)
        self.left(-w2)

    def dot(self, size=None, *color):
        if size is None:
            size = max(self._w + 4, self._w * 2)
        _ops.append(('dot', self._x, self._y, size, _color(*color) if color else self._pc))

    def write(self, arg, move=False, align='left', font=('Arial', 8, 'normal')):
        _ops.append(('text', self._x, self._y, str(arg), self._pc, font, align))

    def stamp(self):
        _ops.append(('turtle', self._x, self._y, self._h, self._pc, self._fc))
        return len(_ops)

    def penup(self):
        self._down = False

    def pendown(self):
        self._down = True

    def isdown(self):
        return self._down

    def pensize(self, width=None):
        if width is None:
            return self._w
        self._w = width

    def pencolor(self, *c):
        if not c:
            return self._pc
        self._pc = _color(*c)

    def fillcolor(self, *c):
        if not c:
            return self._fc
        self._fc = _color(*c)

    def color(self, *args):
        if not args:
            return self._pc, self._fc
        if len(args) == 2:
            self._pc, self._fc = _color(args[0]), _color(args[1])
        else:
            self._pc = self._fc = _color(*args)

    def begin_fill(self):
        self._fill = [(self._x, self._y)]
        self._fill_at = len(_ops)

    def end_fill(self):
        if self._fill and len(self._fill) > 2:
            _ops.insert(self._fill_at, ('poly', self._fill, self._fc))
        self._fill = None

    def filling(self):
        return self._fill is not None

    def speed(self, s=None):
        return 0

    def hideturtle(self):
        self._visible = False

    def showturtle(self):
        self._visible = True

    def isvisible(self):
        return self._visible

    def clear(self):
        pass

    def reset(self):
        self.__init__()
        _turtles.remove(self)

    def getscreen(self):
        return _screen

    def _noop(self, *a, **k):
        return None

    shape = shapesize = turtlesize = tilt = settiltangle = undo = degrees = radians = onclick = ondrag = onrelease = _noop
    fd = forward
    bk = back = backward
    rt = right
    lt = left
    setpos = setposition = goto
    seth = setheading
    pos = position
    pu = up = penup
    pd = down = pendown
    width = pensize
    ht = hideturtle
    st = showturtle


Pen = RawTurtle = RawPen = Turtle


def _get():
    global _default
    if _default is None:
        _default = Turtle()
    return _default


def _bind(name):
    def f(*a, **k):
        return getattr(_get(), name)(*a, **k)
    f.__name__ = name
    return f


for _n in [n for n in dir(Turtle) if not n.startswith('_')]:
    globals()[_n] = _bind(_n)

for _n in ['bgcolor', 'setup', 'screensize', 'colormode', 'title', 'tracer', 'update', 'listen', 'onkey',
           'onkeypress', 'onscreenclick', 'ontimer', 'delay', 'register_shape', 'addshape', 'turtles']:
    globals()[_n] = getattr(_screen, _n)


def done():
    _flush()


mainloop = exitonclick = bye = done


def _esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def _reset():
    global _default
    _ops.clear()
    _turtles.clear()
    _default = None
    _screen.__init__()


def _flush():
    visible = [t for t in _turtles if t._visible]
    if not _ops and not visible:
        return
    xs, ys = [0.0], [0.0]
    for op in _ops:
        if op[0] == 'line':
            xs += [op[1], op[3]]
            ys += [op[2], op[4]]
        elif op[0] == 'poly':
            xs += [p[0] for p in op[1]]
            ys += [p[1] for p in op[1]]
        elif op[0] == 'dot':
            xs += [op[1] - op[3], op[1] + op[3]]
            ys += [op[2] - op[3], op[2] + op[3]]
        else:
            xs += [op[1], op[1] + 8 * len(op[3]) if op[0] == 'text' else op[1]]
            ys += [op[2], op[2] + 14]
    for t in visible:
        xs.append(t._x)
        ys.append(t._y)
    pad = 24
    if _screen._size:
        w, h = _screen._size
        x0, y0 = -w / 2, -h / 2
    else:
        x0, y0 = min(xs) - pad, -max(ys) - pad
        w, h = max(xs) - min(xs) + 2 * pad, max(ys) - min(ys) + 2 * pad
    w, h = max(w, 80), max(h, 80)
    parts = []
    n = sum(1 for op in _ops if op[0] == 'line')
    step = min(0.04, 3.5 / max(n, 1))
    t = 0.0

    def anim(extra=''):
        return ' style="animation-delay:%.3fs%s"' % (t, extra)

    for op in _ops[:60000]:
        kind = op[0]
        if kind == 'line':
            _, a, b, c, d, color, width = op
            parts.append('<line class="d" pathLength="1" x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" stroke="%s" stroke-width="%s"%s/>'
                         % (a, -b, c, -d, _esc(color), width, anim(';animation-duration:%.3fs' % max(step, 0.001))))
            t += step
        elif kind == 'poly':
            pts = ' '.join('%.2f,%.2f' % (x, -y) for x, y in op[1])
            parts.append('<polygon class="f" points="%s" fill="%s"%s/>' % (pts, _esc(op[2]), anim()))
        elif kind == 'dot':
            parts.append('<circle class="f" cx="%.2f" cy="%.2f" r="%.2f" fill="%s"%s/>' % (op[1], -op[2], op[3] / 2, _esc(op[4]), anim()))
        elif kind == 'text':
            _, x, y, text, color, font, align = op
            size = font[1] if len(font) > 1 else 8
            anchor = {'left': 'start', 'center': 'middle', 'right': 'end'}.get(align, 'start')
            parts.append('<text class="f" x="%.2f" y="%.2f" fill="%s" font-family="%s" font-size="%s" text-anchor="%s"%s>%s</text>'
                         % (x, -y, _esc(color), _esc(str(font[0])), size * 1.35, anchor, anim(), _esc(text)))
        elif kind == 'turtle':
            parts.append(_arrow(op[1], op[2], op[3], op[4], op[5], anim()))
    for tt in visible:
        parts.append(_arrow(tt._x, tt._y, tt._h, tt._pc, tt._fc, anim()))
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%.2f %.2f %.2f %.2f" width="%d" height="%d" '
           'stroke-linecap="round" stroke-linejoin="round">'
           '<style>.d{stroke-dasharray:1;stroke-dashoffset:1;animation:d linear forwards}'
           '.f{opacity:0;animation:f .2s forwards}@keyframes d{to{stroke-dashoffset:0}}@keyframes f{to{opacity:1}}'
           '@media (prefers-reduced-motion:reduce){.d,.f{animation:none;stroke-dashoffset:0;opacity:1}}</style>'
           '<rect x="%.2f" y="%.2f" width="%.2f" height="%.2f" fill="%s"/>%s</svg>'
           % (x0, y0, w, h, round(w), round(h), x0, y0, w, h, _esc(_screen._bg), ''.join(parts)))
    js.barmajImage(svg, 'image/svg+xml')
    _ops.clear()
    for tt in _turtles:
        tt._visible = False


def _arrow(x, y, heading, pc, fc, extra):
    a = math.radians(heading)
    pts = []
    for dx, dy in ((0, 0), (-9, 5), (-6, 0), (-9, -5)):
        rx = dx * math.cos(a) - dy * math.sin(a)
        ry = dx * math.sin(a) + dy * math.cos(a)
        pts.append('%.2f,%.2f' % (x + rx, -(y + ry)))
    return '<polygon class="f" points="%s" fill="%s" stroke="%s"%s/>' % (' '.join(pts), _esc(fc), _esc(pc), extra)
`;

const writer = (type) => {
  const dec = new TextDecoder();
  return {
    write: (buf) => {
      post(type, { text: dec.decode(buf, { stream: true }) });
      return buf.length;
    },
  };
};

self.barmajImage = (data, mime) => {
  post('image', { src: mime === 'image/svg+xml' ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data)}` : `data:${mime};base64,${data}` });
};

const boot = async (cfg) => {
  post('loading', { what: 'python' });
  let loaded = false;
  for (const url of cfg.urls) {
    try {
      importScripts(url + 'pyodide.js');
      loaded = url;
      break;
    } catch { /* try the next mirror */ }
  }
  if (!loaded) throw new Error('could not download Python');
  const pyodide = await self.loadPyodide({
    indexURL: loaded,
    packageBaseUrl: cfg.packages,
    env: { PYTHONUNBUFFERED: '1', MPLBACKEND: 'Agg', HOME: '/home/pyodide' },
  });
  pyodide.setStdout(writer('out'));
  pyodide.setStderr(writer('err'));
  pyodide.setStdin({ stdin: () => barmajStdin.readLine() });
  pyodide.FS.mkdirTree('/barmaj');
  pyodide.FS.writeFile('/barmaj/_barmaj.py', RUNNER);
  pyodide.FS.writeFile('/barmaj/turtle.py', TURTLE);
  pyodide.runPython("import sys\nsys.path.insert(0, '/barmaj')\nimport _barmaj");
  post('ready', { version: pyodide.version });
  return pyodide;
};

const ensure = (cfg) => {
  if (!booting) {
    booting = boot(cfg).then((p) => { py = p; return p; }, (e) => { booting = null; throw e; });
  }
  return booting;
};

self.onmessage = async ({ data }) => {
  if (data.type === 'boot') {
    ensure(data.cfg).catch(() => {});
    return;
  }
  if (data.type !== 'run') return;
  const t0 = performance.now();
  try {
    await ensure(data.cfg);
  } catch (e) {
    post('done', { ok: false, time: 0, engineError: String(e.message || e) });
    return;
  }
  barmajStdin.reset(data);
  try {
    const shown = new Set();
    await py.loadPackagesFromImports(data.code, {
      messageCallback: (m) => {
        const pkgs = m.match(/^Loading (.+)/);
        if (pkgs && !shown.has(pkgs[1])) { shown.add(pkgs[1]); post('loading', { what: 'packages', list: pkgs[1] }); }
      },
      errorCallback: (m) => post('err', { text: m + '\n' }),
    });
  } catch (e) {
    post('err', { text: String(e.message || e) + '\n' });
  }
  post('running');
  const start = performance.now();
  let result;
  try {
    const run = py.pyimport('_barmaj').run;
    result = JSON.parse(await run(data.code));
    run.destroy?.();
  } catch (e) {
    post('err', { text: String(e.message || e) + '\n' });
    result = { code: 1, message: String(e.message || e) };
  }
  post('done', {
    ok: result.code === 0,
    exitCode: result.code,
    time: performance.now() - start,
    total: performance.now() - t0,
    error: result.code === 0 ? null : { name: result.name, message: result.message, line: result.line },
  });
};
