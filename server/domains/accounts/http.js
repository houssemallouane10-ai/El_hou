import { forbidden, unauthenticated } from '../../shared/errors.js';

const SESSION_COOKIE = 'kh_session';

const readCookie = (header, name) => {
  for (const part of String(header ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index === -1 || part.slice(0, index).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
};

export const createSessionCookie = ({ ttlMs }) => ({
  read: (req) => readCookie(req.get('cookie'), SESSION_COOKIE),
  write(req, res, token) {
    res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/', maxAge: ttlMs });
  },
  clear(req, res) {
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/' });
  },
});

// Attaches `req.user` (or null) and `req.sessionToken` for every API request.
export const authenticate = ({ accounts, cookie }) => (req, res, next) => {
  const token = cookie.read(req);
  const session = token ? accounts.authenticate(token) : null;
  req.user = session?.user ?? null;
  req.sessionToken = session ? token : null;
  if (session?.renewed) cookie.write(req, res, token);
  if (token && !session) cookie.clear(req, res);
  next();
};

export const requireUser = (req, res, next) => next(req.user ? undefined : unauthenticated());

export const requireAdmin = (req, res, next) => {
  if (!req.user) return next(unauthenticated());
  return next(req.user.isAdmin ? undefined : forbidden('ADMIN_ONLY'));
};
