import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Navbar from './components/Navbar';
import B2BLandingPage from './features/platform/B2BLandingPage';
import SaaSAdminPortal from './features/platform/SaaSAdminPortal';
import InstituteAdminPortal from './features/platform/InstituteAdminPortal';
import HODDashboard from './features/platform/HODDashboard';
import FacultyPortal from './features/platform/FacultyPortal';
import StudentPortal from './features/platform/StudentPortal';
import ParentPortal from './features/platform/ParentPortal';
import { removeNotification } from './features/ui/uiSlice';

export default function App() {
  const dispatch = useDispatch();
  const { activeView, notifications } = useSelector((state) => state.ui);
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const renderActiveView = () => {
    switch (activeView) {
      case 'saas-admin':
        return <SaaSAdminPortal />;
      case 'institute-admin':
        return <InstituteAdminPortal />;
      case 'hod':
        return <HODDashboard />;
      case 'faculty':
        return <FacultyPortal />;
      case 'student':
        return <StudentPortal />;
      case 'parent':
        return <ParentPortal />;
      case 'landing':
      default:
        if (isAuthenticated) {
          if (user?.role === 'PLATFORM_SUPER_ADMIN') return <SaaSAdminPortal />;
          if (user?.role === 'INSTITUTE_SUPER_ADMIN' || user?.role === 'superadmin' || user?.role === 'admin') return <InstituteAdminPortal />;
          if (user?.role === 'DEPARTMENT_ADMIN_HOD' || user?.role === 'head') return <HODDashboard />;
          if (user?.role === 'faculty') return <FacultyPortal />;
          if (user?.role === 'parent') return <ParentPortal />;
          return <StudentPortal />;
        }
        return <B2BLandingPage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Global Top Navbar */}
      <Navbar />

      {/* Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-md w-full px-4 pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl flex items-start justify-between backdrop-blur-md transition-all animate-bounce ${
              n.type === 'danger'
                ? 'bg-red-950/90 border-red-500/80 text-red-100'
                : n.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/80 text-amber-100'
                : 'bg-indigo-950/90 border-indigo-500/80 text-indigo-100'
            }`}
          >
            <div>
              <div className="font-bold text-xs">{n.title}</div>
              <div className="text-[11px] opacity-90 mt-0.5 leading-snug">{n.message}</div>
            </div>
            <button
              onClick={() => dispatch(removeNotification(n.id))}
              className="text-xs font-bold opacity-70 hover:opacity-100 ml-3"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Main View Area */}
      <main className="flex-1">{renderActiveView()}</main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 font-bold text-slate-400">
            <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px]">BP</span>
            <span>BarelyPassing B2B SaaS Enterprise EdTech</span>
          </div>
          <div>React 18 • Redux Toolkit • Custom Token Middleware • Multi-Tenant Engine</div>
        </div>
      </footer>
    </div>
  );
}
