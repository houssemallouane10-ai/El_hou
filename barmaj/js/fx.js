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

export class PowerMode {
  constructor(host, getCaret) {
    this.host = host;
    this.getCaret = getCaret;
    this.particles = [];
    this.combo = 0;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fx-canvas';
    this.badge = document.createElement('div');
    this.badge.className = 'fx-combo';
    this.badge.setAttribute('aria-hidden', 'true');
    host.append(this.canvas, this.badge);
    this.ctx = this.canvas.getContext('2d');
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
    this.readColors();
  }

  resize() {
    const r = this.host.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.canvas.width = Math.max(1, r.width * dpr);
    this.canvas.height = Math.max(1, r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  readColors() {
    const css = getComputedStyle(document.documentElement);
    this.colors = ['--accent', '--rb1', '--rb2', '--rb3', '--rb4', '--blue'].map((v) => css.getPropertyValue(v).trim()).filter(Boolean);
  }

  hit(kind) {
    const caret = this.getCaret();
    if (caret) {
      const box = this.host.getBoundingClientRect();
      const x = caret.left - box.left;
      const y = (caret.top + caret.bottom) / 2 - box.top;
      const n = kind === 'delete' ? 4 : reduced.matches ? 3 : 9;
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
      if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
      if (!this.raf) this.raf = requestAnimationFrame(() => this.frame());
    }
    if (kind === 'type') this.bump();
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
    this.badge.style.animation = 'none';
    void this.badge.offsetWidth;
    this.badge.style.animation = '';
    if (hitMilestone && !reduced.matches) {
      this.host.classList.remove('fx-shake');
      void this.host.offsetWidth;
      this.host.classList.add('fx-shake');
      setTimeout(() => this.host.classList.remove('fx-shake'), 320);
      navigator.vibrate?.(18);
    }
  }

  reset() {
    this.combo = 0;
    this.badge.className = 'fx-combo';
  }

  frame() {
    const { ctx } = this;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    this.particles = this.particles.filter((p) => p.life > 0.02);
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.16;
      p.vx *= 0.98;
      p.life *= 0.93;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + p.life / 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    this.raf = this.particles.length ? requestAnimationFrame(() => this.frame()) : null;
    if (!this.raf) ctx.clearRect(0, 0, w, h);
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
