// Typing effects: sparks from the cursor, a combo counter with a shake at
// milestones (power mode), and soft key sounds. All optional, see settings.
import { lang } from './i18n.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');

const CHEERS = {
  ar: ['رائع!', 'قاسح! 💪', 'نار 🔥', 'ما يتحبسش! ⚡', 'أسطورة 👑'],
  fr: ['Super !', 'Énorme ! 💪', 'En feu 🔥', 'Inarrêtable ! ⚡', 'Légendaire 👑'],
  en: ['Great!', 'Awesome! 💪', 'On fire 🔥', 'Unstoppable! ⚡', 'Legendary 👑'],
};
const MILESTONES = [20, 50, 100, 200, 400];
const SPARK_AREA = 240;
const SHAKE = [
  { transform: 'none' },
  { transform: 'translate(-3px, 2px) rotate(-.3deg)' },
  { transform: 'translate(4px, -2px) rotate(.3deg)' },
  { transform: 'translate(-3px, -1px)' },
  { transform: 'translate(2px, 2px)' },
  { transform: 'none' },
];

// Sparks are placed from the cursor position measured during the editor's own
// layout pass (measure), so typing never forces an extra layout
export class PowerMode {
  constructor(host, measure) {
    this.host = host;
    this.measure = measure;
    this.particles = [];
    this.queued = [];
    this.combo = 0;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fx-canvas';
    this.badge = document.createElement('div');
    this.badge.className = 'fx-combo';
    this.badge.setAttribute('aria-hidden', 'true');
    host.append(this.canvas, this.badge);
    // A small canvas that follows the cursor: a canvas as big as the editor
    // would be sent to the screen whole on every frame, which phones feel
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    this.canvas.width = this.canvas.height = SPARK_AREA * dpr;
    this.canvas.style.width = this.canvas.style.height = `${SPARK_AREA}px`;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ox = 0;
    this.oy = 0;
    this.readColors();
  }

  readColors() {
    const css = getComputedStyle(document.documentElement);
    this.colors = ['--accent', '--rb1', '--rb2', '--rb3', '--rb4', '--blue'].map((v) => css.getPropertyValue(v).trim()).filter(Boolean);
  }

  hit(kind) {
    if (kind === 'type') this.bump();
    this.queued.push(kind);
    // One measure per frame; ask again if an earlier one never came back
    if (this.queued.length > 1 && performance.now() - this.asked < 300) return;
    this.asked = performance.now();
    this.measure(
      (caret) => caret && { caret, box: this.host.getBoundingClientRect() },
      (at) => this.spawn(at),
    );
  }

  spawn(at) {
    const kinds = this.queued.slice(-6);
    this.queued = [];
    if (!at) return;
    const x = at.caret.left - at.box.left;
    const y = (at.caret.top + at.caret.bottom) / 2 - at.box.top;
    // Move the canvas to the cursor unless sparks are still flying close by
    const margin = SPARK_AREA / 4;
    const inside = x > this.ox + margin && x < this.ox + SPARK_AREA - margin && y > this.oy + margin && y < this.oy + SPARK_AREA - margin;
    if (!this.particles.length || !inside) {
      this.ox = Math.round(x - SPARK_AREA / 2);
      this.oy = Math.round(y - SPARK_AREA / 2);
      this.canvas.style.transform = `translate(${this.ox}px, ${this.oy}px)`;
    }
    for (const kind of kinds) {
      const n = kind === 'delete' ? 3 : reduced.matches ? 3 : 7;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 3.2;
        this.particles.push({
          x, y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed - 2.2,
          life: 1,
          size: 1.5 + Math.random() * 2.5,
          color: kind === 'delete' ? '#8d97a9' : this.colors[(Math.random() * this.colors.length) | 0],
        });
      }
    }
    if (this.particles.length > 160) this.particles.splice(0, this.particles.length - 160);
    if (!this.raf) this.raf = requestAnimationFrame(() => this.frame());
  }

  bump() {
    this.combo++;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.reset(), 2400);
    if (this.combo < 5) return;
    const level = MILESTONES.filter((m) => this.combo >= m).length;
    const hitMilestone = MILESTONES.includes(this.combo);
    const num = document.createElement('b');
    num.textContent = `×${this.combo}`;
    const label = document.createElement('span');
    label.textContent = level ? CHEERS[lang()][Math.min(level, 5) - 1] : 'combo';
    this.badge.replaceChildren(num, label);
    this.badge.className = `fx-combo on lvl${Math.min(level, 4)}`;
    // Web animations restart without forcing a layout (unlike toggling a class)
    this.badge.animate?.([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' });
    if (hitMilestone && !reduced.matches) {
      this.host.animate?.(SHAKE, { duration: 300, easing: 'cubic-bezier(.36, .07, .19, .97)' });
      navigator.vibrate?.(18);
    }
  }

  reset() {
    this.combo = 0;
    this.badge.className = 'fx-combo';
  }

  frame() {
    const { ctx, ox, oy } = this;
    ctx.clearRect(0, 0, SPARK_AREA, SPARK_AREA);
    this.particles = this.particles.filter((p) => p.life > 0.02);
    // A faint halo around each spark instead of shadowBlur, which is slow on phones
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.16;
      p.vx *= 0.98;
      p.life *= 0.93;
      const r = p.size * (0.5 + p.life / 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life * 0.3;
      ctx.beginPath();
      ctx.arc(p.x - ox, p.y - oy, r * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x - ox, p.y - oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    this.raf = this.particles.length ? requestAnimationFrame(() => this.frame()) : null;
    if (!this.raf) ctx.clearRect(0, 0, SPARK_AREA, SPARK_AREA);
  }
}

// Soft mechanical key sounds, generated with Web Audio (no files to download)
let audio = null;
let noise = null;
export const keySound = (kind) => {
  try {
    if (!audio) {
      audio = new AudioContext();
      noise = audio.createBuffer(1, audio.sampleRate * 0.05, audio.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length / 7));
    }
    if (audio.state === 'suspended') audio.resume();
    const src = audio.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = kind === 'delete' ? 0.7 : 0.9 + Math.random() * 0.3;
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = kind === 'enter' ? 900 : 1800 + Math.random() * 900;
    filter.Q.value = 1.4;
    const gain = audio.createGain();
    gain.gain.value = kind === 'enter' ? 0.5 : 0.28;
    src.connect(filter).connect(gain).connect(audio.destination);
    src.start();
  } catch { /* audio unavailable */ }
};

// A burst of sparks over an element, used when a program finishes well
export const celebrate = (el) => {
  if (reduced.matches || !el) return;
  el.classList.remove('fx-win');
  void el.offsetWidth;
  el.classList.add('fx-win');
};
