// Adaptive HLS player: quality ladder, commentary-language tracks,
// automatic recovery and fail-over between servers.

import { t, languageName } from './i18n.js';
import { store } from './store.js';
import { icon } from './icons.js';
import { esc } from './util.js';

const Hls = () => window.Hls;

const HLS_CONFIG = {
  enableWorker: true,
  lowLatencyMode: false,
  startLevel: -1,
  capLevelToPlayerSize: true,
  testBandwidth: true,
  abrEwmaDefaultEstimate: 1_500_000,
  abrBandWidthFactor: 0.9,
  abrBandWidthUpFactor: 0.65,
  backBufferLength: 30,
  maxBufferLength: 45,
  maxMaxBufferLength: 120,
  maxBufferSize: 120 * 1000 * 1000,
  maxBufferHole: 0.5,
  nudgeMaxRetry: 8,
  liveSyncDurationCount: 4,
  liveMaxLatencyDurationCount: 12,
  maxLiveSyncPlaybackRate: 1.1,
  startFragPrefetch: true,
  manifestLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 10_000,
      maxLoadTimeMs: 20_000,
      timeoutRetry: { maxNumRetry: 2, retryDelayMs: 0, maxRetryDelayMs: 0 },
      errorRetry: { maxNumRetry: 2, retryDelayMs: 1000, maxRetryDelayMs: 4000 },
    },
  },
  playlistLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 10_000,
      maxLoadTimeMs: 20_000,
      timeoutRetry: { maxNumRetry: 3, retryDelayMs: 0, maxRetryDelayMs: 0 },
      errorRetry: { maxNumRetry: 5, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
    },
  },
  fragLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 10_000,
      maxLoadTimeMs: 120_000,
      timeoutRetry: { maxNumRetry: 4, retryDelayMs: 0, maxRetryDelayMs: 0 },
      errorRetry: { maxNumRetry: 6, retryDelayMs: 800, maxRetryDelayMs: 8000 },
    },
  },
};

const STALL_NUDGE_S = 4;
const STALL_FAILOVER_S = 14;

const fmtTime = (s) => {
  if (!Number.isFinite(s)) return '';
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

// iOS plays HLS natively with its own adaptive switching; hls.js on
// ManagedMediaSource there is less forgiving, so use the native path.
const preferNativeHls = (video) =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) && !!video.canPlayType('application/vnd.apple.mpegurl');

const qualityTag = (h) => (h >= 2160 ? '4K' : h >= 1440 ? '2K' : h >= 1080 ? 'FHD' : h >= 720 ? 'HD' : '');

export class StreamPlayer {
  constructor(container) {
    this.container = container;
    this.sources = [];
    this.index = -1;
    this.failed = new Set();
    this.hls = null;
    this.handlers = {};
    this.prefLang = store.get('commentaryLang', null);
    this.dataSaver = store.get('dataSaver', false);
    this.showStats = false;
    this.userPickedSubs = false;
    this.build();
    this.bind();
  }

  on(evt, fn) {
    (this.handlers[evt] ||= []).push(fn);
    return this;
  }

  emit(evt, ...args) {
    (this.handlers[evt] || []).forEach((fn) => fn(...args));
  }

  /* ---------- DOM ---------- */

  build() {
    this.container.innerHTML = `
      <div class="player" tabindex="0" data-state="idle">
        <video playsinline webkit-playsinline preload="auto" crossorigin="anonymous"></video>
        <iframe class="pl-frame" hidden allow="autoplay; fullscreen; picture-in-picture; encrypted-media" referrerpolicy="no-referrer"></iframe>
        <div class="pl-shade"></div>
        <div class="pl-badges">
          <span class="pl-live" hidden><i></i>${t('player.live')}</span>
          <span class="pl-q" hidden></span>
          <span class="pl-demo" hidden>DEMO</span>
        </div>
        <div class="pl-spinner" hidden><span></span></div>
        <button class="pl-big" type="button" aria-label="${t('player.play')}" hidden>${icon('play')}</button>
        <button class="pl-unmute" type="button" hidden>${icon('mute')}<span>${t('player.unmute')}</span></button>
        <div class="pl-msg" hidden><p></p><button type="button" class="btn btn-ghost pl-retry">${icon('retry')}<span>${t('player.retry')}</span></button></div>
        <div class="pl-stats" hidden></div>
        <div class="pl-toast" role="status" aria-live="polite"></div>
        <div class="pl-bar">
          <div class="pl-seek"><input type="range" min="0" max="1000" step="1" value="0" aria-label="seek"></div>
          <div class="pl-row">
            <button type="button" class="pl-btn pl-play" aria-label="${t('player.play')}">${icon('play')}</button>
            <button type="button" class="pl-btn pl-mute" aria-label="${t('player.mute')}">${icon('vol')}</button>
            <input class="pl-vol" type="range" min="0" max="1" step="0.05" aria-label="volume">
            <span class="pl-time"></span>
            <button type="button" class="pl-golive" hidden><i></i>${t('player.goLive')}</button>
            <span class="pl-spacer"></span>
            <button type="button" class="pl-btn pl-set" aria-label="${t('player.settings')}" aria-haspopup="menu">${icon('gear')}</button>
            <button type="button" class="pl-btn pl-pip" aria-label="${t('player.pip')}">${icon('pip')}</button>
            <button type="button" class="pl-btn pl-theater" aria-label="${t('player.theater')}">${icon('theater')}</button>
            <button type="button" class="pl-btn pl-fs" aria-label="${t('player.fullscreen')}">${icon('fs')}</button>
          </div>
        </div>
        <div class="pl-menu" role="menu" hidden></div>
      </div>`;
    const $ = (s) => this.container.querySelector(s);
    this.root = $('.player');
    this.video = $('video');
    this.frame = $('.pl-frame');
    this.ui = {
      live: $('.pl-live'), q: $('.pl-q'), demo: $('.pl-demo'), spinner: $('.pl-spinner'), big: $('.pl-big'),
      unmute: $('.pl-unmute'), msg: $('.pl-msg'), stats: $('.pl-stats'), toast: $('.pl-toast'),
      seek: $('.pl-seek input'), seekWrap: $('.pl-seek'), play: $('.pl-play'), mute: $('.pl-mute'), vol: $('.pl-vol'),
      time: $('.pl-time'), goLive: $('.pl-golive'), set: $('.pl-set'), pip: $('.pl-pip'), theater: $('.pl-theater'),
      fs: $('.pl-fs'), menu: $('.pl-menu'), retry: $('.pl-retry'),
    };
    const vol = store.get('volume', 1);
    this.video.volume = vol;
    this.ui.vol.value = vol;
    this.video.muted = store.get('muted', false);
    if (!document.pictureInPictureEnabled) this.ui.pip.hidden = true;
  }

  bind() {
    const v = this.video;
    const ui = this.ui;
    const togglePlay = () => (v.paused ? this.tryPlay() : v.pause());

    ui.play.onclick = togglePlay;
    ui.big.onclick = () => this.tryPlay();
    v.addEventListener('click', togglePlay);
    v.addEventListener('dblclick', () => this.toggleFullscreen());
    ui.mute.onclick = () => this.setMuted(!v.muted);
    ui.unmute.onclick = () => this.setMuted(false);
    ui.vol.oninput = () => {
      v.volume = Number(ui.vol.value);
      this.setMuted(v.volume === 0);
      store.set('volume', v.volume);
    };
    ui.seek.oninput = () => {
      if (Number.isFinite(v.duration)) v.currentTime = (Number(ui.seek.value) / 1000) * v.duration;
    };
    ui.goLive.onclick = () => this.goLive();
    ui.set.onclick = (e) => {
      e.stopPropagation();
      this.toggleMenu();
    };
    ui.pip.onclick = () => this.togglePip();
    ui.fs.onclick = () => this.toggleFullscreen();
    ui.theater.onclick = () => this.emit('theater');
    ui.retry.onclick = () => {
      this.failed.clear();
      this.select(this.index < 0 ? 0 : this.index);
    };

    const sync = () => this.syncUi();
    ['play', 'pause', 'volumechange', 'loadedmetadata', 'durationchange'].forEach((e) => v.addEventListener(e, sync));
    v.addEventListener('timeupdate', () => this.syncTime());
    v.addEventListener('progress', () => this.syncTime());
    v.addEventListener('waiting', () => this.spin(true));
    v.addEventListener('seeking', () => this.spin(true));
    ['playing', 'canplay', 'seeked'].forEach((e) => v.addEventListener(e, () => this.spin(false)));
    v.addEventListener('playing', () => {
      this.root.dataset.state = 'playing';
      ui.big.hidden = true;
      ui.msg.hidden = true;
    });
    v.addEventListener('error', () => {
      // hls.js reports its own errors; this catches native/mp4 playback
      if (!this.hls && this.current && this.current.type !== 'iframe') this.failover();
    });

    // Auto-hide controls while playing
    let hideTimer;
    const wake = () => {
      this.root.classList.add('show-ui');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (!v.paused && ui.menu.hidden) this.root.classList.remove('show-ui');
      }, 2800);
    };
    ['pointermove', 'pointerdown', 'focusin', 'keydown'].forEach((e) => this.root.addEventListener(e, wake));
    this.root.addEventListener('pointerleave', () => {
      if (!v.paused && ui.menu.hidden) this.root.classList.remove('show-ui');
    });
    wake();

    this.root.addEventListener('keydown', (e) => this.onKey(e));
    this.onDocClick = (e) => {
      if (!ui.menu.hidden && !ui.menu.contains(e.target) && e.target !== ui.set) this.closeMenu();
    };
    this.onFsChange = () => {
      const fs = document.fullscreenElement === this.root || document.webkitFullscreenElement === this.root;
      this.root.classList.toggle('is-fs', fs);
      ui.fs.innerHTML = icon(fs ? 'fsExit' : 'fs');
    };
    this.onOnline = () => {
      if (this.hls) this.hls.startLoad();
      else if (this.current && v.paused) this.tryPlay();
    };
    document.addEventListener('click', this.onDocClick);
    document.addEventListener('fullscreenchange', this.onFsChange);
    document.addEventListener('webkitfullscreenchange', this.onFsChange);
    window.addEventListener('online', this.onOnline);

    this.watchdog = setInterval(() => this.tick(), 1000);
  }

  onKey(e) {
    if (e.target.closest('input, select, textarea, .pl-menu')) return;
    const v = this.video;
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'k') v.paused ? this.tryPlay() : v.pause();
    else if (k === 'f') this.toggleFullscreen();
    else if (k === 'm') this.setMuted(!v.muted);
    else if (k === 't') this.emit('theater');
    else if (k === 'arrowup') v.volume = Math.min(1, v.volume + 0.1);
    else if (k === 'arrowdown') v.volume = Math.max(0, v.volume - 0.1);
    else if (k === 'arrowright' && Number.isFinite(v.duration)) v.currentTime += 5;
    else if (k === 'arrowleft' && Number.isFinite(v.duration)) v.currentTime -= 5;
    else return;
    e.preventDefault();
  }

  /* ---------- Loading ---------- */

  load(sources, { lang, start: forced } = {}) {
    this.sources = sources;
    this.failed.clear();
    if (lang) this.prefLang = lang;
    if (!sources.length) {
      this.teardown();
      this.message(t('player.failed'), false);
      return;
    }
    if (Number.isInteger(forced)) return this.select(forced);
    const pref = this.prefLang;
    let start = sources.findIndex((s) => s.lang === pref);
    if (start < 0) start = sources.findIndex((s) => s.lang === 'multi');
    this.select(Math.max(0, start));
  }

  select(i, { resumeAt = null, auto = false } = {}) {
    const src = this.sources[i];
    if (!src) return;
    this.teardown();
    this.index = i;
    this.current = src;
    this.netRetries = 0;
    this.mediaRecoveredAt = 0;
    this.codecSwapped = false;
    this.stallFor = 0;
    this.lastTime = -1;
    this.isLive = false;
    this.ui.msg.hidden = true;
    this.ui.demo.hidden = !src.demo;
    this.ui.q.hidden = true;
    this.ui.live.hidden = true;
    this.root.dataset.state = 'loading';
    this.root.classList.toggle('is-frame', src.type === 'iframe');
    this.spin(src.type !== 'iframe');
    this.emit('source', i, { auto });

    if (src.type === 'iframe') {
      this.frame.hidden = false;
      this.frame.src = src.url;
      this.spin(false);
      return;
    }
    this.frame.hidden = true;

    // Demo clips are short; loop them so the player never just stops
    this.video.loop = !!src.demo;
    const H = Hls();
    if (src.type === 'hls' && H?.isSupported() && !preferNativeHls(this.video)) {
      this.attachHls(src.url, resumeAt);
    } else if (src.type === 'hls' && this.video.canPlayType('application/vnd.apple.mpegurl')) {
      this.video.src = src.url;
      if (resumeAt) this.video.addEventListener('loadedmetadata', () => (this.video.currentTime = resumeAt), { once: true });
      this.video.addEventListener('loadedmetadata', () => this.emit('tracks'), { once: true });
    } else {
      this.video.src = src.url;
      if (resumeAt) this.video.addEventListener('loadedmetadata', () => (this.video.currentTime = resumeAt), { once: true });
    }
    this.tryPlay();
  }

  attachHls(url, resumeAt) {
    const H = Hls();
    const hls = new H({ ...HLS_CONFIG, startPosition: resumeAt ?? -1 });
    this.hls = hls;
    const E = H.Events;

    hls.on(E.MANIFEST_PARSED, () => {
      this.applyDataSaver();
      this.emit('tracks');
    });
    hls.on(E.LEVEL_LOADED, (_, data) => {
      const live = !!data.details?.live;
      if (live !== this.isLive) {
        this.isLive = live;
        this.syncUi();
      }
    });
    hls.on(E.LEVEL_SWITCHED, () => this.syncQualityBadge());
    hls.on(E.AUDIO_TRACKS_UPDATED, () => {
      this.applyPreferredAudio();
      this.emit('tracks');
    });
    hls.on(E.AUDIO_TRACK_SWITCHED, () => this.emit('tracks'));
    // Subtitles stay off unless the viewer picks a track
    hls.subtitleDisplay = false;
    hls.on(E.SUBTITLE_TRACKS_UPDATED, () => {
      if (!this.userPickedSubs) hls.subtitleTrack = -1;
    });
    hls.on(E.FRAG_BUFFERED, () => {
      this.netRetries = 0;
      this.spin(false);
    });
    hls.on(E.ERROR, (_, data) => this.onHlsError(data));

    hls.loadSource(url);
    hls.attachMedia(this.video);
  }

  onHlsError(data) {
    const H = Hls();
    if (!data.fatal) {
      if (data.details === H.ErrorDetails.BUFFER_STALLED_ERROR) this.spin(true);
      return;
    }
    if (data.type === H.ErrorTypes.MEDIA_ERROR) {
      const now = performance.now();
      if (now - this.mediaRecoveredAt > 3000) {
        this.mediaRecoveredAt = now;
        this.hls.recoverMediaError();
        return;
      }
      if (!this.codecSwapped) {
        this.codecSwapped = true;
        this.hls.swapAudioCodec();
        this.hls.recoverMediaError();
        return;
      }
    } else if (data.type === H.ErrorTypes.NETWORK_ERROR && !/manifest/i.test(data.details) && this.netRetries < 3) {
      this.netRetries += 1;
      this.toast(t('player.reconnecting'));
      this.spin(true);
      setTimeout(() => this.hls?.startLoad(), 1000 * this.netRetries);
      return;
    }
    this.failover();
  }

  failover() {
    this.failed.add(this.index);
    const cur = this.sources[this.index];
    const remaining = this.sources.map((s, i) => ({ s, i })).filter(({ i }) => !this.failed.has(i));
    const rank = ({ s }) => (s.lang === cur?.lang ? 0 : s.lang === 'multi' ? 1 : 2);
    remaining.sort((a, b) => rank(a) - rank(b));
    const next = remaining[0];
    if (!next) {
      this.teardown();
      this.message(t('player.failed'), true);
      this.emit('source', this.index, { failed: true });
      return;
    }
    const resumeAt = !this.isLive && this.video.currentTime > 1 ? this.video.currentTime : null;
    this.select(next.i, { resumeAt, auto: true });
    this.toast(t('player.switched', { s: next.s.label }));
  }

  teardown() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    this.video.removeAttribute('src');
    this.video.load();
    this.frame.removeAttribute('src');
    this.frame.hidden = true;
  }

  destroy() {
    clearInterval(this.watchdog);
    this.teardown();
    document.removeEventListener('click', this.onDocClick);
    document.removeEventListener('fullscreenchange', this.onFsChange);
    document.removeEventListener('webkitfullscreenchange', this.onFsChange);
    window.removeEventListener('online', this.onOnline);
    this.container.innerHTML = '';
  }

  /* ---------- Playback ---------- */

  tryPlay() {
    const v = this.video;
    const p = v.play();
    if (!p?.catch) return;
    p.then(() => {
      this.ui.big.hidden = true;
    }).catch(() => {
      // Autoplay with sound blocked: start muted and offer an unmute button
      if (!v.muted) {
        v.muted = true;
        v.play()
          .then(() => (this.ui.unmute.hidden = false))
          .catch(() => this.showBigPlay());
      } else {
        this.showBigPlay();
      }
    });
  }

  showBigPlay() {
    this.spin(false);
    this.ui.big.hidden = false;
    this.root.dataset.state = 'paused';
  }

  setMuted(m) {
    this.video.muted = m;
    if (!m && this.video.volume === 0) this.video.volume = 0.6;
    this.ui.unmute.hidden = true;
    store.set('muted', m);
  }

  goLive() {
    const target = this.hls?.liveSyncPosition;
    if (Number.isFinite(target)) this.video.currentTime = target;
    else if (this.video.seekable.length) this.video.currentTime = this.video.seekable.end(this.video.seekable.length - 1) - 2;
    this.tryPlay();
  }

  tick() {
    const v = this.video;
    if (!this.current || this.current.type === 'iframe' || v.paused || v.ended || v.seeking) {
      this.stallFor = 0;
      this.lastTime = v.currentTime;
      if (this.showStats) this.renderStats();
      return;
    }
    const moved = Math.abs(v.currentTime - this.lastTime) > 0.01;
    this.lastTime = v.currentTime;
    this.stallFor = moved ? 0 : this.stallFor + 1;

    if (this.stallFor === STALL_NUDGE_S) {
      this.spin(true);
      // Jump over a small gap in the buffer, then ask the loader to resume
      const b = v.buffered;
      for (let i = 0; i < b.length; i++) {
        if (b.start(i) > v.currentTime && b.start(i) - v.currentTime < 2) {
          v.currentTime = b.start(i) + 0.05;
          break;
        }
      }
      this.hls?.startLoad();
    } else if (this.stallFor >= STALL_FAILOVER_S) {
      this.stallFor = 0;
      this.failover();
    }
    if (this.showStats) this.renderStats();
  }

  spin(on) {
    this.ui.spinner.hidden = !on;
  }

  message(text, retry) {
    this.spin(false);
    this.ui.msg.hidden = false;
    this.ui.msg.querySelector('p').textContent = text;
    this.ui.retry.hidden = !retry;
    this.root.dataset.state = 'error';
  }

  toast(text) {
    const el = this.ui.toast;
    el.textContent = text;
    el.classList.add('on');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('on'), 3200);
  }

  /* ---------- UI sync ---------- */

  syncUi() {
    const v = this.video;
    const ui = this.ui;
    ui.play.innerHTML = icon(v.paused ? 'play' : 'pause');
    ui.play.setAttribute('aria-label', t(v.paused ? 'player.play' : 'player.pause'));
    ui.mute.innerHTML = icon(v.muted || v.volume === 0 ? 'mute' : 'vol');
    ui.vol.value = v.muted ? 0 : v.volume;
    const live = this.isLive || v.duration === Infinity;
    ui.live.hidden = !live;
    ui.seekWrap.hidden = live || !Number.isFinite(v.duration);
    this.root.classList.toggle('is-paused', v.paused);
    this.syncTime();
  }

  syncTime() {
    const v = this.video;
    const ui = this.ui;
    const live = this.isLive || v.duration === Infinity;
    if (live) {
      const edge = this.hls?.liveSyncPosition;
      const behind = Number.isFinite(edge) ? edge - v.currentTime : 0;
      ui.goLive.hidden = behind < 12;
      ui.live.classList.toggle('behind', behind >= 12);
      ui.time.textContent = '';
      return;
    }
    ui.goLive.hidden = true;
    if (!Number.isFinite(v.duration) || !v.duration) {
      ui.time.textContent = '';
      return;
    }
    ui.time.textContent = `${fmtTime(v.currentTime)} / ${fmtTime(v.duration)}`;
    ui.seek.value = String(Math.round((v.currentTime / v.duration) * 1000));
    let buffered = 0;
    for (let i = 0; i < v.buffered.length; i++) {
      if (v.buffered.start(i) <= v.currentTime + 0.5) buffered = Math.max(buffered, v.buffered.end(i));
    }
    ui.seekWrap.style.setProperty('--played', `${(v.currentTime / v.duration) * 100}%`);
    ui.seekWrap.style.setProperty('--buffered', `${(buffered / v.duration) * 100}%`);
  }

  syncQualityBadge() {
    const lvl = this.hls?.levels?.[this.hls.currentLevel];
    const h = lvl?.height || this.video.videoHeight;
    if (!h) return;
    const tag = qualityTag(h);
    this.ui.q.hidden = false;
    this.ui.q.textContent = `${h}p${lvl?.frameRate >= 50 ? '60' : ''}${tag ? ` · ${tag}` : ''}`;
    this.ui.q.classList.toggle('hd', h >= 720);
  }

  /* ---------- Tracks ---------- */

  qualityOptions() {
    const levels = this.hls?.levels || [];
    const audioGroup = this.hls?.audioTracks?.[this.hls.audioTrack]?.groupId;
    const byHeight = new Map();
    levels.forEach((l, i) => {
      if (!l.height) return;
      const key = `${l.height}-${l.frameRate >= 50 ? 60 : 30}`;
      const groups = l.audioGroups || l.audioGroupIds || [];
      const prev = byHeight.get(key);
      const inGroup = !audioGroup || groups.includes(audioGroup);
      if (!prev || (inGroup && !prev.inGroup) || (inGroup === prev.inGroup && l.bitrate > prev.bitrate)) {
        byHeight.set(key, { index: i, height: l.height, fps: l.frameRate, bitrate: l.bitrate, inGroup });
      }
    });
    return [...byHeight.values()].sort((a, b) => b.height - a.height || b.fps - a.fps);
  }

  setQuality(index) {
    if (!this.hls) return;
    this.hls.currentLevel = index;
    store.set('quality', index === -1 ? 'auto' : this.hls.levels[index]?.height);
  }

  applyDataSaver() {
    if (!this.hls) return;
    if (!this.dataSaver) {
      this.hls.autoLevelCapping = -1;
      return;
    }
    let cap = -1;
    this.hls.levels.forEach((l, i) => {
      if (l.height && l.height <= 480 && (cap < 0 || l.bitrate > this.hls.levels[cap].bitrate)) cap = i;
    });
    this.hls.autoLevelCapping = cap;
  }

  audioOptions() {
    if (this.hls) {
      return (this.hls.audioTracks || []).map((tr, i) => ({
        index: i,
        lang: tr.lang || '',
        label: `${languageName(tr.lang) || tr.name}${String(tr.channels || '') === '6' ? ' 5.1' : ''}`,
        active: i === this.hls.audioTrack,
      }));
    }
    const list = this.video.audioTracks;
    if (!list) return [];
    return Array.from(list).map((tr, i) => ({
      index: i, lang: tr.language, label: languageName(tr.language) || tr.label, active: tr.enabled,
    }));
  }

  setAudio(index) {
    const opt = this.audioOptions()[index];
    if (this.hls) this.hls.audioTrack = index;
    else if (this.video.audioTracks) Array.from(this.video.audioTracks).forEach((tr, i) => (tr.enabled = i === index));
    if (opt?.lang) {
      this.prefLang = opt.lang.slice(0, 2);
      store.set('commentaryLang', this.prefLang);
    }
    this.emit('tracks');
  }

  applyPreferredAudio() {
    if (!this.hls || !this.prefLang) return;
    const tracks = this.hls.audioTracks || [];
    const i = tracks.findIndex((tr) => (tr.lang || '').slice(0, 2) === this.prefLang);
    if (i >= 0 && i !== this.hls.audioTrack) this.hls.audioTrack = i;
  }

  subtitleOptions() {
    return (this.hls?.subtitleTracks || []).map((tr, i) => ({
      index: i, label: languageName(tr.lang) || tr.name, active: i === this.hls.subtitleTrack,
    }));
  }

  setSubtitle(index) {
    if (!this.hls) return;
    this.userPickedSubs = true;
    this.hls.subtitleDisplay = index >= 0;
    this.hls.subtitleTrack = index;
  }

  /* ---------- Settings menu ---------- */

  toggleMenu() {
    if (this.ui.menu.hidden) this.renderMenu('main');
    else this.closeMenu();
  }

  closeMenu() {
    this.ui.menu.hidden = true;
  }

  renderMenu(panel) {
    const menu = this.ui.menu;
    menu.hidden = false;
    const row = (action, label, value = '', extra = '') =>
      `<button type="button" role="menuitem" class="pm-row ${extra}" data-act="${action}"><span>${esc(label)}</span><b>${value}</b>${action.startsWith('open:') ? icon('next', 'pm-chev') : ''}</button>`;
    const opt = (action, label, active, hint = '') =>
      `<button type="button" role="menuitemradio" aria-checked="${active}" class="pm-opt ${active ? 'on' : ''}" data-act="${action}">${active ? icon('check') : '<span class="ic"></span>'}<span>${esc(label)}</span>${hint ? `<small>${esc(hint)}</small>` : ''}</button>`;
    const head = (title) =>
      `<button type="button" class="pm-head" data-act="open:main">${icon('back', 'pm-back')}<span>${esc(title)}</span></button>`;

    let html = '';
    if (panel === 'main') {
      const q = this.hls && this.hls.currentLevel >= 0 && !this.hls.autoLevelEnabled
        ? `${this.hls.levels[this.hls.currentLevel]?.height}p`
        : `${t('player.auto')}${this.hls?.levels?.[this.hls.currentLevel]?.height ? ` · ${this.hls.levels[this.hls.currentLevel].height}p` : ''}`;
      const audio = this.audioOptions();
      const aCur = audio.find((a) => a.active)?.label || '—';
      const subs = this.subtitleOptions();
      const sCur = subs.find((s) => s.active)?.label || t('player.off');
      html += row('open:quality', t('player.quality'), esc(q));
      if (audio.length > 1) html += row('open:audio', t('player.audio'), esc(aCur));
      if (subs.length) html += row('open:subs', t('player.subtitles'), esc(sCur));
      html += row('open:server', t('player.server'), esc(this.current?.label || ''));
      html += row('toggle:saver', t('player.datasaver'), `<span class="sw ${this.dataSaver ? 'on' : ''}"></span>`);
      html += row('toggle:stats', t('player.stats'), `<span class="sw ${this.showStats ? 'on' : ''}"></span>`);
    } else if (panel === 'quality') {
      html += head(t('player.quality'));
      html += opt('q:-1', t('player.auto'), !this.hls || this.hls.autoLevelEnabled, this.dataSaver ? '≤ 480p' : '');
      this.qualityOptions().forEach((o) => {
        const tag = qualityTag(o.height);
        html += opt(`q:${o.index}`, `${o.height}p${o.fps >= 50 ? '60' : ''}`, this.hls && !this.hls.autoLevelEnabled && this.hls.currentLevel === o.index, `${tag ? `${tag} · ` : ''}${(o.bitrate / 1e6).toFixed(1)} Mbps`);
      });
    } else if (panel === 'audio') {
      html += head(t('player.audio'));
      this.audioOptions().forEach((a) => (html += opt(`a:${a.index}`, a.label, a.active)));
    } else if (panel === 'subs') {
      html += head(t('player.subtitles'));
      html += opt('s:-1', t('player.off'), this.hls?.subtitleTrack === -1);
      this.subtitleOptions().forEach((s) => (html += opt(`s:${s.index}`, s.label, s.active)));
    } else if (panel === 'server') {
      html += head(t('player.server'));
      this.sources.forEach((s, i) => {
        const hint = `${languageName(s.lang)}${this.failed.has(i) ? ' · ✕' : ''}`;
        html += opt(`src:${i}`, s.label, i === this.index, hint);
      });
    }
    menu.innerHTML = html;
    menu.onclick = (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      e.stopPropagation();
      const [act, arg] = btn.dataset.act.split(':');
      if (act === 'open') return this.renderMenu(arg);
      if (act === 'q') this.setQuality(Number(arg));
      if (act === 'a') this.setAudio(Number(arg));
      if (act === 's') this.setSubtitle(Number(arg));
      if (act === 'src') {
        this.failed.delete(Number(arg));
        this.select(Number(arg));
      }
      if (act === 'toggle' && arg === 'saver') {
        this.dataSaver = !this.dataSaver;
        store.set('dataSaver', this.dataSaver);
        this.applyDataSaver();
        return this.renderMenu('main');
      }
      if (act === 'toggle' && arg === 'stats') {
        this.showStats = !this.showStats;
        this.ui.stats.hidden = !this.showStats;
        this.renderStats();
        return this.renderMenu('main');
      }
      this.closeMenu();
    };
    menu.querySelector('button')?.focus({ preventScroll: true });
  }

  renderStats() {
    if (!this.showStats) return;
    const v = this.video;
    const lvl = this.hls?.levels?.[this.hls.currentLevel];
    let ahead = 0;
    for (let i = 0; i < v.buffered.length; i++) {
      if (v.buffered.start(i) <= v.currentTime && v.buffered.end(i) >= v.currentTime) ahead = v.buffered.end(i) - v.currentTime;
    }
    const q = v.getVideoPlaybackQuality?.();
    const rows = [
      [t('player.resolution'), v.videoWidth ? `${v.videoWidth}×${v.videoHeight}${lvl?.frameRate ? ` @${Math.round(lvl.frameRate)}` : ''}` : '—'],
      ['Bitrate', lvl?.bitrate ? `${(lvl.bitrate / 1000).toFixed(0)} kbps` : '—'],
      [t('player.bandwidth'), this.hls?.bandwidthEstimate ? `${(this.hls.bandwidthEstimate / 1e6).toFixed(2)} Mbps` : '—'],
      [t('player.buffer'), `${ahead.toFixed(1)} s`],
      [t('player.dropped'), q ? `${q.droppedVideoFrames} / ${q.totalVideoFrames}` : '—'],
    ];
    if (this.isLive && Number.isFinite(this.hls?.latency)) rows.push([t('player.latency'), `${this.hls.latency.toFixed(1)} s`]);
    rows.push([t('player.server'), this.current?.label || '—']);
    this.ui.stats.innerHTML = rows.map(([k, val]) => `<div><span>${esc(k)}</span><b>${esc(val)}</b></div>`).join('');
  }

  /* ---------- Screen modes ---------- */

  async togglePip() {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await this.video.requestPictureInPicture();
    } catch {
      /* not allowed in this context */
    }
  }

  async toggleFullscreen() {
    const el = this.root;
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
        return;
      }
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (this.video.webkitEnterFullscreen) this.video.webkitEnterFullscreen();
      screen.orientation?.lock?.('landscape').catch(() => {});
    } catch {
      this.video.webkitEnterFullscreen?.();
    }
  }
}
