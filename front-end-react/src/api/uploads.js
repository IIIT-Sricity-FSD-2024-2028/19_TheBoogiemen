/**
 * uploads.js — document upload/download, ported from legacy state.js.
 *
 * Shared by every form with an attachment (leave, attendance request,
 * research milestone, assessment submission). The size and type rules are
 * stated once here; the server enforces them regardless.
 */

import { apiFetch } from './client';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // kept in step with back-end UPLOAD_MAX_BYTES

export async function uploadFile(file, context) {
  if (!file) return null;
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0);
    throw new Error(`File must be under ${mb}MB`);
  }
  const form = new FormData();
  form.append('file', file);
  const res = await apiFetch(`/uploads?context=${encodeURIComponent(context)}`, {
    method: 'POST',
    body: form,
  });
  return res && res.data ? res.data : null;
}

/**
 * The route is authenticated and ownership-checked, so this cannot be a
 * plain <a href> — fetch it with apiFetch and open the resulting blob.
 */
export const fileUrl = (fileId) => `/api/uploads/${encodeURIComponent(fileId)}`;
