// Business failures raised by domain services. The HTTP layer maps `kind` to a status code,
// so services never depend on transport details.

export class DomainError extends Error {
  constructor(kind, code, fields) {
    super(code);
    this.name = 'DomainError';
    this.kind = kind;
    this.code = code;
    this.fields = fields;
  }
}

export const invalid = (fields) => new DomainError('invalid', 'VALIDATION_FAILED', fields);
export const notFound = (code = 'NOT_FOUND') => new DomainError('not_found', code);
export const forbidden = (code = 'FORBIDDEN') => new DomainError('forbidden', code);
export const conflict = (code) => new DomainError('conflict', code);
export const unauthenticated = (code = 'AUTH_REQUIRED') => new DomainError('unauthenticated', code);
export const rateLimited = () => new DomainError('rate_limited', 'RATE_LIMITED');
