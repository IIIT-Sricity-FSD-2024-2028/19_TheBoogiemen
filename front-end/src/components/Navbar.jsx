import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { setActiveView, setTheme } from '../features/ui/uiSlice';

export default function Navbar() {
  const dispatch = useDispatch();
  const { isAuthenticated, user, tenant } = useSelector((state) => state.auth);
  const { activeView, theme } = useSelector((state) => state.ui);
  const { tokenMeter } = useSelector((state) => state.subscription);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(setActiveView('landing'));
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'PLATFORM_SUPER_ADMIN':
        return 'bg-purple-950/80 text-purple-300 border-purple-700/50';
      case 'INSTITUTE_SUPER_ADMIN':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/50';
      case 'DEPARTMENT_ADMIN_HOD':
        return 'bg-blue-950/80 text-blue-300 border-blue-700/50';
      case 'faculty':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50';
      default:
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-700/50';
    }
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/90 border-b border-slate-800 text-slate-100 px-6 py-3.5 flex items-center justify-between shadow-xl">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-4 cursor-pointer" onClick={() => dispatch(setActiveView('landing'))}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/30 text-white">
          BP
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-purple-300">
              BarelyPassing
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              B2B Enterprise
            </span>
          </div>
          {tenant && (
            <div className="text-xs text-slate-400 flex items-center space-x-1.5 font-medium">
              <span>{tenant.logo || '🏫'}</span>
              <span className="text-indigo-300 font-semibold">{tenant.name}</span>
              <span>•</span>
              <span className="text-slate-400">{tenant.subscription_tier}</span>
            </div>
          )}
        </div>
      </div>

      {/* Center Navigation Tabs */}
      {isAuthenticated && (
        <div className="hidden md:flex items-center space-x-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80 text-xs font-semibold">
          {user?.role === 'PLATFORM_SUPER_ADMIN' && (
            <button
              onClick={() => dispatch(setActiveView('saas-admin'))}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'saas-admin' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🌐 SaaS Platform Admin
            </button>
          )}

          {(user?.role === 'INSTITUTE_SUPER_ADMIN' || user?.role === 'superadmin' || user?.role === 'admin') && (
            <button
              onClick={() => dispatch(setActiveView('institute-admin'))}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'institute-admin' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🏛️ Campus Director
            </button>
          )}

          {(user?.role === 'DEPARTMENT_ADMIN_HOD' || user?.role === 'head') && (
            <button
              onClick={() => dispatch(setActiveView('hod'))}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'hod' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🎓 HOD Control
            </button>
          )}

          {user?.role === 'faculty' && (
            <button
              onClick={() => dispatch(setActiveView('faculty'))}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'faculty' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              👨‍🏫 Faculty Portal
            </button>
          )}

          {user?.role === 'student' && (
            <button
              onClick={() => dispatch(setActiveView('student'))}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'student' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              👨‍🎓 Student Hub
            </button>
          )}

          {user?.role === 'parent' && (
            <button
              onClick={() => dispatch(setActiveView('parent'))}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'parent' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              👪 Parent View
            </button>
          )}
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* Token Meter Status Badge */}
        {tenant && tokenMeter && (
          <div className="hidden lg:flex items-center space-x-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-amber-400 font-bold">⚡ Token Meter:</span>
            <span className="text-slate-200 font-mono">
              {tokenMeter.used_tokens?.toLocaleString()} / {tokenMeter.monthly_quota?.toLocaleString()}
            </span>
            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  tokenMeter.usage_percentage >= 90 ? 'bg-red-500' : tokenMeter.usage_percentage >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${tokenMeter.usage_percentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* User Info / Auth State */}
        {isAuthenticated ? (
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-100">{user?.name || user?.username}</div>
              <div className="text-[10px] text-slate-400">{user?.email}</div>
            </div>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg border ${getRoleBadgeColor(user?.role)}`}>
              {user?.role?.replace(/_/g, ' ')}
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/80 transition-all hover:text-white"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={() => dispatch(setActiveView('landing'))}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all"
          >
            Institute Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
