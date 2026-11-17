/**
* NotificationsContext — toasts, the notification bell's data, and the
* localStorage-backed broadcast/personal notification log.
*
* Ported from legacy fixes.js's `window.Notifications` IIFE and
* `showToast()`. Still backed by the same localStorage keys (so data a user
* already has from the legacy app keeps working), just exposed through
* context + a hook instead of a global.
*
* CROSS-TAB NOTE (broadcast bug fix):
* The legacy app re-read localStorage fresh on every page load and every
* bell render. In the React SPA the provider mounts ONCE and initializes
* state from localStorage a single time, so a broadcast written by another
* tab (faculty) would never reach an already-open tab (student) until a
* full reload. A `storage` event listener now re-syncs state whenever
* another tab writes to the notification keys. The `storage` event only
* fires in OTHER tabs than the one that wrote, so local writes still flow
* through setState as before — no double-handling.
*
* CROSS-COLLEGE NOTE (broadcast tenant-leak fix):
* A broadcast was keyed only by role ('student', 'all', ...), never by
* college — localStorage is shared per browser ORIGIN, not per logged-in
* user, so a student at College B who ever shares that origin with a
* College A session (a shared/public machine, or simply two different
* logins over time in the same browser) saw College A's "all students"
* announcements too. Every broadcast now carries the SENDER's own
* college_id (read from AuthContext right here, not passed in by any of
* the ~9 call sites, so none of them had to change and none can forget
* to) and every read is filtered to the VIEWER's own college_id the same
* way. A null college_id (superadmin, who belongs to no single college —
* see scope-to-college.ts's own docstring for this exact convention) is
* treated as "every college": a superadmin-sent broadcast reaches
* everyone, and a superadmin viewer sees every college's broadcasts.
*/
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

const KEY = 'bp_notifications';
const BKEY = 'bp_broadcasts';
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function readJSON(key, fallback) {
try {
return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
} catch {
return fallback;
}
}

function notExpired(entry) {
return !entry.timestamp || Date.now() - entry.timestamp < THIRTY_DAYS;
}

const NotificationsContext = createContext(null);

/** null (superadmin, who belongs to no single college) sees/reaches every
 *  college; otherwise only an exact match or a null-authored (platform-wide)
 *  broadcast is visible. Mirrors scope-to-college.ts's own null convention. */
function visibleToViewer(broadcast, viewerCollegeId) {
return viewerCollegeId === null || broadcast.collegeId == null || broadcast.collegeId === viewerCollegeId;
}

export function NotificationsProvider({ children }) {
const { user } = useAuth();
const collegeId = user?.college_id ?? null;
const [personal, setPersonal] = useState(() => readJSON(KEY, []).filter(notExpired));
const [broadcasts, setBroadcasts] = useState(() => readJSON(BKEY, []).filter(notExpired));
const [toast, setToast] = useState(null);
const toastTimer = useRef(null);

useEffect(() => {
localStorage.setItem(KEY, JSON.stringify(personal));
}, [personal]);

useEffect(() => {
localStorage.setItem(BKEY, JSON.stringify(broadcasts));
}, [broadcasts]);

// Re-sync from localStorage when ANOTHER tab writes. This is what lets a
// faculty broadcast (sent from the faculty tab) appear on an open student
// tab without a reload. The event never fires in the writing tab itself,
// so this only ever applies external changes.
useEffect(() => {
const onStorage = (e) => {
if (!e || !e.key) return;
if (e.key === KEY) {
setPersonal(readJSON(KEY, []).filter(notExpired));
} else if (e.key === BKEY) {
setBroadcasts(readJSON(BKEY, []).filter(notExpired));
}
};
window.addEventListener('storage', onStorage);
return () => window.removeEventListener('storage', onStorage);
}, []);

const showToast = useCallback((msg, type = 'success') => {
clearTimeout(toastTimer.current);
setToast({ id: Date.now(), msg, type });
toastTimer.current = setTimeout(() => setToast(null), 3500);
}, []);

const forUser = useCallback((uid) => personal.filter((n) => n.to === uid), [personal]);

const getUnreadBC = useCallback(
(role) => {
const readIds = readJSON(`bp_bc_read_${role}`, []);
return broadcasts.filter(
(b) =>
(b.forRole === 'all' || b.forRole === role) &&
visibleToViewer(b, collegeId) &&
!readIds.includes(b.id),
);
},
[broadcasts, collegeId],
);

const unread = useCallback((uid) => forUser(uid).filter((n) => !n.read).length, [forUser]);

const timeLabel = () =>
new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const send = useCallback((toUserId, fromName, message, type = 'alert') => {
const ts = Date.now();
setPersonal((all) =>
[{ id: ts, to: toUserId, from: fromName, message, type, read: false, time: timeLabel(), timestamp: ts }, ...all].slice(0, 200),
);
}, []);

const broadcast = useCallback((targetRole, fromName, message, type = 'info') => {
const ts = Date.now();
setBroadcasts((bc) =>
[{ id: ts, forRole: targetRole, collegeId, from: fromName, message, type, time: timeLabel(), timestamp: ts }, ...bc].slice(0, 500),
);
}, [collegeId]);

const broadcastAll = useCallback((fromName, message, type = 'info') => broadcast('all', fromName, message, type), [broadcast]);

const markRead = useCallback((uid) => {
setPersonal((all) => all.map((n) => (n.to === uid ? { ...n, read: true } : n)));
}, []);

const markBCRead = useCallback(
(role) => {
const ids = broadcasts
.filter((b) => (b.forRole === 'all' || b.forRole === role) && visibleToViewer(b, collegeId))
.map((b) => b.id);
localStorage.setItem(`bp_bc_read_${role}`, JSON.stringify(ids));
},
[broadcasts, collegeId],
);

const clearAll = useCallback(
(role) => {
setPersonal([]);
const ids = broadcasts
.filter((b) => (b.forRole === 'all' || b.forRole === role) && visibleToViewer(b, collegeId))
.map((b) => b.id);
localStorage.setItem(`bp_bc_read_${role}`, JSON.stringify(ids));
},
[broadcasts, collegeId],
);

const value = {
toast,
showToast,
forUser,
getUnreadBC,
unread,
send,
broadcast,
broadcastAll,
markRead,
markBCRead,
clearAll,
};

return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
const ctx = useContext(NotificationsContext);
if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
return ctx;
}