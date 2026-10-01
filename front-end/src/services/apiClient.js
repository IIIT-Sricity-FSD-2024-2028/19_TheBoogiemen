/**
 * apiClient — the single place the React app talks to the NestJS backend.
 *
 * Authentication: the backend sets an httpOnly `bp_session` cookie on
 * POST /api/auth/login, and JwtAuthGuard reads it on every request. The
 * browser attaches it automatically because of `credentials: 'include'`,
 * so no token is read or written here.
 *
 * Errors are never swallowed. Any non-2xx response or network failure is
 * thrown as an ApiError carrying the HTTP status, so a 401/403/500 reaches
 * the UI as an error state instead of being turned into [] or {}.
 */

export class ApiError extends Error {
  constructor(message, status = 0, code = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // 0 = network failure (backend unreachable)
    this.code = code;
  }
}

async function parseBody(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function messageFor(status, body) {
  // Validation errors carry the real reason per field in details.fields.
  const fields = body && typeof body === 'object' ? body.details?.fields : null;
  if (fields && typeof fields === 'object') {
    const first = Object.values(fields).flat().find((m) => typeof m === 'string' && m.trim());
    if (first) return first;
  }
  const fromBody = body && typeof body === 'object' ? body.message : null;
  if (typeof fromBody === 'string' && fromBody.trim()) return fromBody;
  if (Array.isArray(fromBody) && fromBody.length) return fromBody.join(', ');
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to view this.';
  if (status === 404) return 'The requested resource was not found.';
  if (status >= 500) return 'The server ran into a problem. Please try again.';
  return `Request failed with status ${status}.`;
}

export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      signal,
      credentials: 'include',
      headers: body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. Check that the backend is running.', 0);
  }

  const data = await parseBody(response);
  if (!response.ok) {
    throw new ApiError(messageFor(response.status, data), response.status, data?.code ?? null);
  }
  return data;
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
  /** multipart upload to POST /api/uploads?context=... ; returns { file_id, ... } */
  upload: (file, context) => {
    const form = new FormData();
    form.append('file', file);
    return apiRequest(`/uploads?context=${encodeURIComponent(context)}`, { method: 'POST', body: form });
  },
};

/** Downloads an authenticated file (e.g. a PDF) and saves it with the given name. */
export async function downloadFile(path, filename) {
  let response;
  try {
    response = await fetch(`/api${path}`, { credentials: 'include' });
  } catch {
    throw new ApiError('Cannot reach the server. Check that the backend is running.', 0);
  }
  if (!response.ok) {
    const data = await parseBody(response);
    throw new ApiError(messageFor(response.status, data), response.status, data?.code ?? null);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Plain, serializable error shape for Redux (rejectWithValue payloads). */
export function toErrorPayload(err) {
  return { message: err?.message || 'Something went wrong.', status: err?.status ?? 0 };
}
