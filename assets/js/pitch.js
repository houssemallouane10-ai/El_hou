// Canvas renderers for MatchSim: a top-down tactical view for the match page
// and a floodlit broadcast-angle view for the home hero.

import { PITCH_W, PITCH_H } from './sim.js';
import { prefersReducedMotion } from './util.js';

const hexToRgb = (hex) => {
  const h = (hex || '').replace('#', '');
  if (h.length !== 6) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

const colorDistance = (a, b) => {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  if (!x || !y) return 999;
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};

const luminance = (hex) => {
  const c = hexToRgb(hex);
  return c ? (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 : 0.5;
};

/** Picks two kit colours that read apart from each other and from the grass. */
export function kitColors(home, away) {
  const grass = '#2f7a46';
  let h = home?.color || '#f4b740';
  let a = away?.color || '#eef3ef';
  if (colorDistance(h, grass) < 90 || luminance(h) < 0.12) h = home?.alt && colorDistance(home.alt, grass) > 90 ? home.alt : '#f4b740';
  if (colorDistance(a, grass) < 90 || luminance(a) < 0.12) a = away?.alt && colorDistance(away.alt, grass) > 90 ? away.alt : '#eef3ef';
  if (colorDistance(h, a) < 110) a = colorDistance(h, '#eef3ef') > 110 ? '#eef3ef' : '#1c2a4a';
  return [h, a];
}

export class PitchView {
  constructor(canvas, sim, { mode = 'top', mirror = false, colors = ['#f4b740', '#eef3ef'] } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sim = sim;
    this.mode = mode;
    this.mirror = mirror;
    this.colors = colors;
    this.flash = 0;
    this.goalText = '';
    this.running = false;
    this.visible = true;
    this.last = 0;
    this.crowd = Array.from({ length: 220 }, () => ({ x: Math.random(), y: Math.random(), p: Math.random() * 6.28 }));
    this.loop = this.loop.bind(this);

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas);
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible && this.running) this.kick();
    });
    this.io.observe(canvas);
    this.onVis = () => this.running && !document.hidden && this.kick();
    document.addEventListener('visibilitychange', this.onVis);
    sim.on('goal', ({ label }) => {
      this.flash = 1;
      this.goalText = label;
    });
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.mode === 'persp') this.setupCamera();
    this.draw();
  }

  start() {
    this.running = true;
    if (prefersReducedMotion()) {
      // One settled frame instead of continuous motion
      for (let i = 0; i < 90; i++) this.sim.step(1 / 30);
      this.draw();
      return;
    }
    this.kick();
  }

  kick() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  destroy() {
    this.stop();
    this.resizeObs.disconnect();
    this.io.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
  }

  loop(now) {
    this.raf = null;
    if (!this.running || !this.visible || document.hidden) return;
    const dt = (now - this.last) / 1000;
    this.last = now;
    this.sim.step(dt);
    this.flash = Math.max(0, this.flash - dt * 0.45);
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  }

  draw() {
    if (this.mode === 'persp') this.drawPerspective();
    else this.drawTop();
  }

  /* ---------- Top-down ---------- */

  drawTop() {
    const { ctx, w, h, sim } = this;
    const pad = 4;
    const s = Math.min((w - pad * 2) / (PITCH_W + 4), (h - pad * 2) / (PITCH_H + 2));
    const ox = (w - PITCH_W * s) / 2;
    const oy = (h - PITCH_H * s) / 2;
    const X = (x) => ox + (this.mirror ? PITCH_W - x : x) * s;
    const Y = (y) => oy + y * s;

    ctx.clearRect(0, 0, w, h);
    // Mowing stripes
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = i % 2 ? '#2c7443' : '#327e4a';
      const x0 = (i * PITCH_W) / 14;
      const xa = X(x0);
      const xb = X(x0 + PITCH_W / 14);
      ctx.fillRect(Math.min(xa, xb), oy - 1 * s, Math.abs(xb - xa) + 0.5, PITCH_H * s + 2 * s);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.82)';
    ctx.lineWidth = Math.max(1, s * 0.14);
    const rect = (x, y, rw, rh) => {
      const xa = X(x);
      const xb = X(x + rw);
      ctx.strokeRect(Math.min(xa, xb), Y(y), Math.abs(xb - xa), rh * s);
    };
    rect(0, 0, PITCH_W, PITCH_H);
    ctx.beginPath();
    ctx.moveTo(X(PITCH_W / 2), Y(0));
    ctx.lineTo(X(PITCH_W / 2), Y(PITCH_H));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(X(PITCH_W / 2), Y(PITCH_H / 2), 9.15 * s, 0, Math.PI * 2);
    ctx.stroke();
    [0, 1].forEach((side) => {
      const gx = side ? PITCH_W : 0;
      const dir = side ? -1 : 1;
      rect(side ? PITCH_W - 16.5 : 0, PITCH_H / 2 - 20.16, 16.5, 40.32);
      rect(side ? PITCH_W - 5.5 : 0, PITCH_H / 2 - 9.16, 5.5, 18.32);
      ctx.beginPath();
      ctx.arc(X(gx + dir * 11), Y(PITCH_H / 2), Math.max(1.2, s * 0.25), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fill();
      // Goal frame
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      const xa = X(gx);
      const xb = X(gx - dir * 1.8);
      ctx.fillRect(Math.min(xa, xb), Y(PITCH_H / 2 - 3.66), Math.abs(xb - xa), 7.32 * s);
      ctx.strokeRect(Math.min(xa, xb), Y(PITCH_H / 2 - 3.66), Math.abs(xb - xa), 7.32 * s);
    });

    // Danger zone glow on the attacked third
    if (sim.danger) {
      const goalX = sim.owner === 0 ? PITCH_W : 0;
      const g = ctx.createRadialGradient(X(goalX), Y(PITCH_H / 2), 0, X(goalX), Y(PITCH_H / 2), 32 * s);
      g.addColorStop(0, 'rgba(255,90,90,0.28)');
      g.addColorStop(1, 'rgba(255,90,90,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    // Ball trail
    ctx.lineCap = 'round';
    sim.trail.forEach((p, i) => {
      if (!i) return;
      const q = sim.trail[i - 1];
      ctx.strokeStyle = `rgba(255,255,255,${(i / sim.trail.length) * 0.45})`;
      ctx.lineWidth = Math.max(1, s * 0.35 * (i / sim.trail.length));
      ctx.beginPath();
      ctx.moveTo(X(q.x), Y(q.y));
      ctx.lineTo(X(p.x), Y(p.y));
      ctx.stroke();
    });

    // Players
    const r = Math.max(3.5, s * 1.25);
    sim.players.forEach((p) => {
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y) + r * 0.25, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), r, 0, Math.PI * 2);
      ctx.fillStyle = p.gk ? (p.team ? '#ff7aa8' : '#33c2b0') : this.colors[p.team];
      ctx.fill();
      ctx.lineWidth = Math.max(1, r * 0.22);
      ctx.strokeStyle = luminance(this.colors[p.team]) > 0.6 && !p.gk ? 'rgba(10,20,15,0.65)' : 'rgba(255,255,255,0.85)';
      ctx.stroke();
      if (p === sim.carrier && sim.phase === 'dribble') {
        ctx.beginPath();
        ctx.arc(X(p.x), Y(p.y), r * 1.9, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    });

    // Ball with height shadow
    const b = sim.ball;
    const br = Math.max(2.4, s * 0.62) * (1 + b.z * 0.12);
    ctx.beginPath();
    ctx.arc(X(b.x) + b.z * s * 0.4, Y(b.y) + b.z * s * 0.4, br * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(X(b.x), Y(b.y), br, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(244,183,64,${this.flash * 0.35})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  /* ---------- Broadcast perspective ---------- */

  setupCamera() {
    const { w, h } = this;
    this.cam = { d0: 30, height: 24 };
    this.f = Math.max(0.33 * w, 0.62 * h);
    this.cx = w / 2;
    this.hy = h * 0.985 - (this.f * this.cam.height) / this.cam.d0;
  }

  project(x, y, z = 0) {
    const Z = this.cam.d0 + (PITCH_H - y);
    return {
      x: this.cx + (this.f * (x - PITCH_W / 2)) / Z,
      y: this.hy + (this.f * (this.cam.height - z)) / Z,
      k: this.f / Z,
    };
  }

  drawPerspective() {
    const { ctx, w, h, sim } = this;
    const t = sim.time;
    ctx.clearRect(0, 0, w, h);

    // Night sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#060b0c');
    sky.addColorStop(0.55, '#0b1513');
    sky.addColorStop(1, '#0c1a14');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const farL = this.project(-6, -4);
    const farR = this.project(PITCH_W + 6, -4);
    const standTop = farL.y - Math.min(h * 0.22, 140);

    // Stands with crowd phone lights
    ctx.fillStyle = '#0a1311';
    ctx.beginPath();
    ctx.moveTo(-20, standTop + 30);
    ctx.lineTo(w + 20, standTop + 30);
    ctx.lineTo(w + 20, farR.y);
    ctx.lineTo(-20, farL.y);
    ctx.closePath();
    ctx.fill();
    this.crowd.forEach((c) => {
      const cy = standTop + 34 + c.y * (farL.y - standTop - 38);
      const tw = 0.25 + 0.75 * Math.max(0, Math.sin(t * 1.3 + c.p));
      ctx.fillStyle = `rgba(255,236,200,${0.06 + tw * 0.14})`;
      ctx.fillRect(c.x * w, cy, 1.4, 1.4);
    });

    // Floodlight towers and cones
    [[0.08, 1], [0.92, -1]].forEach(([fx, side]) => {
      const lx = fx * w;
      const ly = standTop - 8;
      const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.min(w, h) * 0.5);
      glow.addColorStop(0, 'rgba(255,240,205,0.55)');
      glow.addColorStop(0.08, 'rgba(255,226,170,0.18)');
      glow.addColorStop(1, 'rgba(255,226,170,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      const sweep = Math.sin(t * 0.25 + side) * 0.08;
      const cone = ctx.createLinearGradient(lx, ly, w / 2, h);
      cone.addColorStop(0, 'rgba(255,236,190,0.16)');
      cone.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(w * (0.5 + side * (0.05 + sweep)), h);
      ctx.lineTo(w * (0.5 - side * (0.55 - sweep)), h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,248,230,0.9)';
      for (let i = 0; i < 4; i++) ctx.fillRect(lx - 9 + i * 5, ly - 3, 3, 3);
    });

    // Grass with mowing stripes
    for (let i = 0; i < 16; i++) {
      const x0 = -6 + (i * (PITCH_W + 12)) / 16;
      const x1 = x0 + (PITCH_W + 12) / 16;
      const a = this.project(x0, -4);
      const b = this.project(x1, -4);
      const c = this.project(x1, PITCH_H + 6);
      const d = this.project(x0, PITCH_H + 6);
      ctx.fillStyle = i % 2 ? '#1f5a33' : '#246539';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();
    }
    // Light pool on the grass
    const pool = ctx.createRadialGradient(w / 2, this.project(0, PITCH_H / 2).y, 10, w / 2, this.project(0, PITCH_H / 2).y, w * 0.6);
    pool.addColorStop(0, 'rgba(255,240,200,0.10)');
    pool.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = pool;
    ctx.fillRect(0, farL.y, w, h - farL.y);

    // Lines
    ctx.strokeStyle = 'rgba(240,248,240,0.72)';
    ctx.lineWidth = 1.3;
    const path = (pts, close = false) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        const p = this.project(x, y);
        if (i) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      });
      if (close) ctx.closePath();
      ctx.stroke();
    };
    path([[0, 0], [PITCH_W, 0], [PITCH_W, PITCH_H], [0, PITCH_H]], true);
    path([[PITCH_W / 2, 0], [PITCH_W / 2, PITCH_H]]);
    path(Array.from({ length: 41 }, (_, i) => {
      const a = (i / 40) * Math.PI * 2;
      return [PITCH_W / 2 + Math.cos(a) * 9.15, PITCH_H / 2 + Math.sin(a) * 9.15];
    }));
    [0, 1].forEach((side) => {
      const gx = side ? PITCH_W : 0;
      const d = side ? -1 : 1;
      path([[gx, PITCH_H / 2 - 20.16], [gx + d * 16.5, PITCH_H / 2 - 20.16], [gx + d * 16.5, PITCH_H / 2 + 20.16], [gx, PITCH_H / 2 + 20.16]]);
      path([[gx, PITCH_H / 2 - 9.16], [gx + d * 5.5, PITCH_H / 2 - 9.16], [gx + d * 5.5, PITCH_H / 2 + 9.16], [gx, PITCH_H / 2 + 9.16]]);
      // Goal posts
      const p1 = this.project(gx, PITCH_H / 2 - 3.66);
      const p2 = this.project(gx, PITCH_H / 2 + 3.66);
      const t1 = this.project(gx, PITCH_H / 2 - 3.66, 2.44);
      const t2 = this.project(gx, PITCH_H / 2 + 3.66, 2.44);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(t1.x, t1.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fill();
      ctx.restore();
    });

    // Players, far to near so nearer figures overlap
    const sorted = [...sim.players].sort((a, b) => a.y - b.y);
    sorted.forEach((p) => {
      const base = this.project(p.x, p.y);
      const k = base.k;
      const bodyH = k * 1.85;
      const bodyW = k * 0.62;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(base.x, base.y, bodyW * 0.9, bodyW * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.gk ? (p.team ? '#ff7aa8' : '#33c2b0') : this.colors[p.team];
      ctx.beginPath();
      ctx.roundRect?.(base.x - bodyW / 2, base.y - bodyH, bodyW, bodyH * 0.78, bodyW * 0.4);
      ctx.fill();
      ctx.fillStyle = '#e9c9a8';
      ctx.beginPath();
      ctx.arc(base.x, base.y - bodyH - bodyW * 0.2, bodyW * 0.36, 0, Math.PI * 2);
      ctx.fill();
    });

    // Ball
    const b = sim.ball;
    const bs = this.project(b.x, b.y);
    const bp = this.project(b.x, b.y, b.z + 0.22);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(bs.x, bs.y, bs.k * 0.32, bs.k * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(bp.x, bp.y, Math.max(1.6, bp.k * 0.24), 0, Math.PI * 2);
    ctx.fill();

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,214,130,${this.flash * 0.18})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
