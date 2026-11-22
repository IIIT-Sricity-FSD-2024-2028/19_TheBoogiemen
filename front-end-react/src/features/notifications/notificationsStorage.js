/**
 * notificationsStorage.js — the localStorage keys and pure helpers the
 * notifications feature is built on. Centralized here so the slice's
 * initial-state hydration (store/index.js), the cross-tab `storage`
 * listener (store/index.js), and the facade's read-side logic
 * (context/NotificationsContext.jsx) all agree on the same keys and the
 * same expiry/visibility rules — ported byte-for-byte from the pre-Redux
 * NotificationsContext.jsx so none of that behavior drifts.
 */

export const KEY = 'bp_notifications';
export const BKEY = 'bp_broadcasts';
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

export function notExpired(entry) {
  return !entry.timestamp || Date.now() - entry.timestamp < THIRTY_DAYS;
}

/** null (superadmin, who belongs to no single college) sees/reaches every
 *  college; otherwise only an exact match or a null-authored (platform-wide)
 *  broadcast is visible. Mirrors scope-to-college.ts's own null convention. */
export function visibleToViewer(broadcast, viewerCollegeId) {
  return viewerCollegeId === null || broadcast.collegeId == null || broadcast.collegeId === viewerCollegeId;
}

/**
 * The "read" marker for broadcasts is its own small id-list per role, never
 * part of the broadcasts array itself (so a broadcast you've read is still
 * there for history — just filtered out of "unread"). It was never part of
 * React state either, pre-Redux: read fresh from localStorage on every
 * getUnreadBC() call. Kept exactly that way here, not lifted into the
 * store, because nothing ever needs to react to it changing on its own —
 * only a fresh `broadcasts` read ever needs to re-check it.
 */
export const bcReadKey = (role) => `bp_bc_read_${role}`;
export const readBCReadIds = (role) => readJSON(bcReadKey(role), []);
export const writeBCReadIds = (role, ids) => localStorage.setItem(bcReadKey(role), JSON.stringify(ids));
