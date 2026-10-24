import { rateLimited } from '../errors.js';

// Fixed-window, in-process limiter. It protects a single instance from bursts; it is not a
// distributed quota, so run one instance or put a shared limiter in front when scaling out.
export const createRateLimiter = ({ windowMs, max }) => {
  const windows = new Map();
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, window] of windows) if (window.resetAt <= now) windows.delete(key);
  }, Math.max(windowMs, 60_000));
  sweeper.unref();

  return {
    consume(key) {
      const now = Date.now();
      let window = windows.get(key);
      if (!window || window.resetAt <= now) {
        window = { count: 0, resetAt: now + windowMs };
        windows.set(key, window);
      }
      window.count += 1;
      return window.count <= max;
    },
  };
};

export const limitBy = (limiter, keyOf, { enabled = true } = {}) => (req, res, next) => {
  if (!enabled) return next();
  const key = keyOf(req);
  if (key === null || key === undefined || limiter.consume(key)) return next();
  return next(rateLimited());
};
