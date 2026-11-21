import { createSlice } from '@reduxjs/toolkit';

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

function notExpired(entry) {
  return !entry.timestamp || Date.now() - entry.timestamp < THIRTY_DAYS;
}

export const readPersonal = () => readJSON(KEY, []).filter(notExpired);
export const readBroadcasts = () => readJSON(BKEY, []).filter(notExpired);

// Used by store/index.js as preloadedState, same idea as auth's getUser().
export const loadNotifications = () => ({
  personal: readPersonal(),
  broadcasts: readBroadcasts(),
  toast: null,
});

// null college (superadmin) sees everything; a null-authored broadcast reaches everyone.
export function visibleToViewer(broadcast, viewerCollegeId) {
  return viewerCollegeId === null || broadcast.collegeId == null || broadcast.collegeId === viewerCollegeId;
}

const timeLabel = () =>
  new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { personal: [], broadcasts: [], toast: null },
  reducers: {
    send: {
      reducer(state, action) {
        state.personal = [action.payload, ...state.personal].slice(0, 200);
      },
      prepare(toUserId, fromName, message, type = 'alert') {
        const ts = Date.now();
        return {
          payload: { id: ts, to: toUserId, from: fromName, message, type, read: false, time: timeLabel(), timestamp: ts },
        };
      },
    },
    broadcast: {
      reducer(state, action) {
        state.broadcasts = [action.payload, ...state.broadcasts].slice(0, 500);
      },
      prepare(targetRole, collegeId, fromName, message, type = 'info') {
        const ts = Date.now();
        return {
          payload: { id: ts, forRole: targetRole, collegeId, from: fromName, message, type, time: timeLabel(), timestamp: ts },
        };
      },
    },
    markRead(state, action) {
      state.personal.forEach((n) => {
        if (n.to === action.payload) n.read = true;
      });
    },
    clearPersonal(state) {
      state.personal = [];
    },
    syncFromStorage(state, action) {
      if (action.payload.personal) state.personal = action.payload.personal;
      if (action.payload.broadcasts) state.broadcasts = action.payload.broadcasts;
    },
    setToast(state, action) {
      state.toast = action.payload;
    },
    hideToast(state) {
      state.toast = null;
    },
  },
});

export const { send, broadcast, markRead, clearPersonal, syncFromStorage, setToast, hideToast } =
  notificationsSlice.actions;

let toastTimer = null;

export const showToast = (msg, type = 'success') => (dispatch) => {
  clearTimeout(toastTimer);
  dispatch(setToast({ id: Date.now(), msg, type }));
  toastTimer = setTimeout(() => dispatch(hideToast()), 3500);
};

export default notificationsSlice.reducer;
