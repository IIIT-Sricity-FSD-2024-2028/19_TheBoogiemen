import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  theme: localStorage.getItem('theme') || 'dark',
  activeView: 'landing', // 'landing' | 'saas-admin' | 'institute-admin' | 'hod' | 'faculty' | 'student' | 'parent'
  notifications: [],
  sidebarOpen: true,
  modalState: { isOpen: false, type: null, data: null },
  quotaAlert80Shown: false,
  quotaAlert95Shown: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },
    setActiveView: (state, action) => {
      state.activeView = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    openModal: (state, action) => {
      state.modalState = { isOpen: true, type: action.payload.type, data: action.payload.data };
    },
    closeModal: (state) => {
      state.modalState = { isOpen: false, type: null, data: null };
    },
  },
});

export const { setTheme, setActiveView, toggleSidebar, addNotification, removeNotification, openModal, closeModal } = uiSlice.actions;
export default uiSlice.reducer;
