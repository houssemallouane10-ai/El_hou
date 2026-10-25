// Plays YouTube videos inside the site through the IFrame Player API, so a
// video that can't play here (embedding off, region block) reports an error
// we can act on instead of showing a "Watch on YouTube" link.

let apiReady = null;

function loadApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiReady ??= new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => {
      apiReady = null;
      reject(new Error('YouTube API unavailable'));
    };
    document.head.appendChild(s);
  });
  return apiReady;
}

/**
 * Mounts a player for videoId inside `host` (an empty element).
 * onError fires for unplayable videos (codes 2, 5, 100, 101, 150, 153).
 * Returns { destroy } synchronously; the player appears when the API loads.
 */
export function mountYouTube(host, videoId, { autoplay = true, onError, onPlaying } = {}) {
  let player = null;
  let destroyed = false;
  const slot = document.createElement('div');
  host.replaceChildren(slot);

  loadApi()
    .then((YT) => {
      if (destroyed) return;
      player = new YT.Player(slot, {
        host: 'https://www.youtube-nocookie.com',
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { autoplay: autoplay ? 1 : 0, playsinline: 1, rel: 0, modestbranding: 1, origin: location.origin },
        events: {
          onError: (e) => !destroyed && onError?.(e.data),
          onStateChange: (e) => e.data === YT.PlayerState.PLAYING && onPlaying?.(),
        },
      });
    })
    .catch(() => !destroyed && onError?.('api'));

  return {
    destroy() {
      destroyed = true;
      try {
        player?.destroy();
      } catch {
        /* already gone */
      }
      host.replaceChildren();
    },
  };
}
