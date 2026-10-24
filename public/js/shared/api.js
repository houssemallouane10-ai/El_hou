export class ApiError extends Error {
  constructor(status, code, fields = null) {
    super(code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

const unauthorizedListeners = new Set();

export const onUnauthorized = (listener) => {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
};

const withQuery = (path, query) => {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== '' && value !== false) params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
};

const request = async (method, path, { body, query, signal } = {}) => {
  let response;
  try {
    response = await fetch(withQuery(path, query), {
      method,
      signal,
      credentials: 'same-origin',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, navigator.onLine ? 'NETWORK' : 'OFFLINE');
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new ApiError(response.status, data?.error?.code ?? 'INTERNAL_ERROR', data?.error?.fields ?? null);
    if (response.status === 401 && error.code === 'AUTH_REQUIRED') for (const listener of unauthorizedListeners) listener(error);
    throw error;
  }
  return data;
};

export const api = {
  get: (path, query, options) => request('GET', path, { ...options, query }),
  post: (path, body = {}, options) => request('POST', path, { ...options, body }),
  put: (path, body = {}, options) => request('PUT', path, { ...options, body }),
  patch: (path, body = {}, options) => request('PATCH', path, { ...options, body }),
  del: (path, options) => request('DELETE', path, options),
};

export const isAbort = (error) => error?.name === 'AbortError';
