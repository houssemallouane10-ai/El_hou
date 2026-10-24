import { forbidden } from '../errors.js';
import { sendError } from './errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export const securityHeaders = ({ isProduction }) => (req, res, next) => {
  res.set({
    'Content-Security-Policy': CONTENT_SECURITY_POLICY,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
  });
  if (isProduction && req.secure) res.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
};

// Cookie-authenticated mutations must come from this site: browsers always send Origin on
// cross-site POST/PUT/PATCH/DELETE, and SameSite=Lax keeps the session cookie off them as well.
export const sameOriginOnly = ({ publicUrl }) => {
  const allowedHosts = new Set();
  if (publicUrl) allowedHosts.add(new URL(publicUrl).host);
  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.get('origin');
    if (!origin) return next();
    let originHost;
    try {
      originHost = new URL(origin).host;
    } catch {
      return next(forbidden('BAD_ORIGIN'));
    }
    if (originHost === req.get('host') || originHost === req.get('x-forwarded-host') || allowedHosts.has(originHost)) return next();
    return next(forbidden('BAD_ORIGIN'));
  };
};

export const requireJsonBody = (req, res, next) => {
  if (SAFE_METHODS.has(req.method) || req.method === 'DELETE') return next();
  const hasBody = Number(req.get('content-length') || 0) > 0 || req.get('transfer-encoding');
  if (hasBody && !req.is('application/json')) return sendError(res, 415, 'UNSUPPORTED_MEDIA_TYPE');
  return next();
};
