// Stroke icons on a 24px grid; paths with class "f" are filled.

const P = {
  play: '<path class="f" d="M7 4.5v15l12.5-7.5z"/>',
  pause: '<rect class="f" x="6" y="4.5" width="4" height="15" rx="1"/><rect class="f" x="14" y="4.5" width="4" height="15" rx="1"/>',
  vol: '<path class="f" d="M3.5 9.5h3.5l5-4.5v14l-5-4.5H3.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path class="f" d="M3.5 9.5h3.5l5-4.5v14l-5-4.5H3.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  pip: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><rect class="f" x="12" y="11" width="7" height="6" rx="1"/>',
  fs: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  fsExit: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  theater: '<rect x="2.5" y="6" width="19" height="12" rx="2"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  next: '<path d="M9 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  retry: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  tv: '<rect x="3" y="5.5" width="18" height="12" rx="2"/><path d="M8 21h8M9 2.5l3 3 3-3"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path class="f" d="M12 7.2l3.3 2.4-1.3 3.9h-4l-1.3-3.9z"/><path d="M12 7.2V3.5M15.3 9.6l3.5-1.2M14 13.5l2.2 3.2M10 13.5l-2.2 3.2M8.7 9.6L5.2 8.4"/>',
  card: '<rect class="f" x="7" y="3.5" width="10" height="15" rx="1.5" transform="rotate(8 12 11)"/>',
  swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
};

export const icon = (name, cls = '') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[name] || ''}</svg>`;
