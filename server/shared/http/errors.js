import { DomainError } from '../errors.js';

const STATUS_BY_KIND = {
  invalid: 422,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
};

export const sendError = (res, status, code, fields) => {
  res.status(status).json({ error: fields ? { code, fields } : { code } });
};

export const apiNotFound = (req, res) => sendError(res, 404, 'ROUTE_NOT_FOUND');

export const errorHandler = (logger) => (error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof DomainError) return sendError(res, STATUS_BY_KIND[error.kind] ?? 400, error.code, error.fields);
  if (error.type === 'entity.parse.failed') return sendError(res, 400, 'INVALID_JSON');
  if (error.type === 'entity.too.large') return sendError(res, 413, 'PAYLOAD_TOO_LARGE');
  logger.error(`[error] ${req.method} ${req.originalUrl}`, error);
  return sendError(res, 500, 'INTERNAL_ERROR');
};
