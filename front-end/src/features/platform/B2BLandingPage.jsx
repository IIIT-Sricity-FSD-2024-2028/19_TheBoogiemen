import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginThunk } from '../features/auth/authSlice';
import { onboardInstituteThunk } from '../features/tenant/tenantSlice';
import { setActiveView } from '../features/ui/uiSlice';

export default function B2BLandingPage() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showOnboardModal, setShowOnboardModal] = useState(false);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Pass@123');
  const [tenantCode, setTenantCode] = useState('IIITS');

  // Onboard form state
  const [onboardData, setOnboardData] = useState({
    name: '',
    code: '',
    domain: '',
    subscription_tier: 'Growth Campus',
    contact_email: '',
  });
  const [onboardSuccess, setOnboardSuccess] = useState(null);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(loginThunk({ email, password, tenant_code: tenantCode }));
    if (loginThunk.fulfilled.match(result)) {
      setShowLoginModal(false);
      const role = result.payload.user?.role;
      if (role === 'PLATFORM_SUPER_ADMIN') dispatch(setActiveView('saas-admin'));
      else if (role === 'INSTITUTE_SUPER_ADMIN' || role === 'superadmin' || role === 'admin') dispatch(setActiveView('institute-admin'));
      else if (role === 'DEPARTMENT_ADMIN_HOD' || role === 'head') dispatch(setActiveView('hod'));
      else if (role === 'faculty') dispatch(setActiveView('faculty'));
      else if (role === 'parent') dispatch(setActiveView('parent'));
      else dispatch(setActiveView('student'));
    }
  };

  const handleQuickRoleLogin = async (roleEmail, code = 'IIITS') => {
    setEmail(roleEmail);
    const result = await dispatch(loginThunk({ email: roleEmail, password: 'Pass@123', tenant_code: code }));
    if (loginThunk.fulfilled.match(result)) {
      setShowLoginModal(false);
      const role = result.payload.user?.role;
      if (role === 'PLATFORM_SUPER_ADMIN') dispatch(setActiveView('saas-admin'));
      else if (role === 'INSTITUTE_SUPER_ADMIN' || role === 'superadmin' || role === 'admin') dispatch(setActiveView('institute-admin'));
      else if (role === 'DEPARTMENT_ADMIN_HOD' || role === 'head') dispatch(setActiveView('hod'));
      else if (role === 'faculty') dispatch(setActiveView('faculty'));
      else if (role === 'parent') dispatch(setActiveView('parent'));
      else dispatch(setActiveView('student'));
    }
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    const res = await dispatch(onboardInstituteThunk(onboardData));
    if (onboardInstituteThunk.fulfilled.match(res)) {
      setOnboardSuccess(res.payload);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-6 max-w-7xl mx-auto text-center flex flex-col items-center">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-8 animate-pulse">
          <span>✨ Enterprise B2B SaaS Edition 2.0</span>
          <span>•</span>
          <span>Multi-Tenant Token Engine</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight max-w-4xl bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-purple-300 mb-6">
          The Enterprise EdTech Platform for World-Class Institutions
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed font-light">
          Transform your university or college into a digital campus. Complete with multi-tenant data isolation, dual-tier admin hierarchies, real-time risk tracking, and API token quota management.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => setShowOnboardModal(true)}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-base shadow-xl shadow-indigo-600/30 hover:scale-105 transition-all"
          >
            🏢 Onboard Your Institute
          </button>
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-base border border-slate-800 hover:border-slate-700 transition-all hover:scale-105"
          >
            🔑 Access Campus Portal
          </button>
        </div>

        {/* Floating Stat Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 w-full max-w-5xl">
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 text-left">
            <div className="text-3xl font-extrabold text-indigo-400">100%</div>
            <div className="text-xs text-slate-400 font-medium mt-1">Tenant Isolation & Security</div>
          </div>
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 text-left">
            <div className="text-3xl font-extrabold text-purple-400">6 Roles</div>
            <div className="text-xs text-slate-400 font-medium mt-1">Dual-Tier Hierarchy</div>
          </div>
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 text-left">
            <div className="text-3xl font-extrabold text-emerald-400">JWT + API</div>
            <div className="text-xs text-slate-400 font-medium mt-1">Token Quota Engine</div>
          </div>
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 text-left">
            <div className="text-3xl font-extrabold text-pink-400">React Redux</div>
            <div className="text-xs text-slate-400 font-medium mt-1">Middleware Architecture</div>
          </div>
        </div>
      </section>

      {/* Demo Credentials Quick-Launch Grid */}
      <section className="py-12 bg-slate-900/40 border-y border-slate-800 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-100">Explore Demo Hierarchy Portals</h2>
            <p className="text-xs text-slate-400 mt-1">Click any role to log in instantly and test the B2B multi-tenant environment</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <button
              onClick={() => handleQuickRoleLogin('saasadmin@platform.com')}
              className="bg-purple-950/40 hover:bg-purple-900/60 p-4 rounded-xl border border-purple-700/50 text-left transition-all group"
            >
              <div className="text-xs font-bold text-purple-300 uppercase tracking-wider">Level 0: SaaS Admin</div>
              <div className="text-sm font-semibold text-white mt-1 group-hover:text-purple-200">Global Owner</div>
              <div className="text-[10px] text-purple-400/80 mt-1 font-mono">saasadmin@platform.com</div>
            </button>

            <button
              onClick={() => handleQuickRoleLogin('director@iiits.in')}
              className="bg-amber-950/40 hover:bg-amber-900/60 p-4 rounded-xl border border-amber-700/50 text-left transition-all group"
            >
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">Level 1: Campus Admin</div>
              <div className="text-sm font-semibold text-white mt-1 group-hover:text-amber-200">Institute Director</div>
              <div className="text-[10px] text-amber-400/80 mt-1 font-mono">director@iiits.in</div>
            </button>

            <button
              onClick={() => handleQuickRoleLogin('head@iiits.in')}
              className="bg-blue-950/40 hover:bg-blue-900/60 p-4 rounded-xl border border-blue-700/50 text-left transition-all group"
            >
              <div className="text-xs font-bold text-blue-300 uppercase tracking-wider">Level 2: Dept Head</div>
              <div className="text-sm font-semibold text-white mt-1 group-hover:text-blue-200">HOD (Computer Sci)</div>
              <div className="text-[10px] text-blue-400/80 mt-1 font-mono">head@iiits.in</div>
            </button>

            <button
              onClick={() => handleQuickRoleLogin('faculty@iiits.in')}
              className="bg-emerald-950/40 hover:bg-emerald-900/60 p-4 rounded-xl border border-emerald-700/50 text-left transition-all group"
            >
              <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Level 3: Faculty</div>
              <div className="text-sm font-semibold text-white mt-1 group-hover:text-emerald-200">Prof. Jane Smith</div>
              <div className="text-[10px] text-emerald-400/80 mt-1 font-mono">faculty@iiits.in</div>
            </button>

            <button
              onClick={() => handleQuickRoleLogin('student@iiits.in')}
              className="bg-indigo-950/40 hover:bg-indigo-900/60 p-4 rounded-xl border border-indigo-700/50 text-left transition-all group"
            >
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Level 4: Student</div>
              <div className="text-sm font-semibold text-white mt-1 group-hover:text-indigo-200">John Doe</div>
              <div className="text-[10px] text-indigo-400/80 mt-1 font-mono">student@iiits.in</div>
            </button>

            <button
              onClick={() => handleQuickRoleLogin('parent.john@gmail.com')}
              className="bg-pink-950/40 hover:bg-pink-900/60 p-4 rounded-xl border border-pink-700/50 text-left transition-all group"
            >
              <div className="text-xs font-bold text-pink-300 uppercase tracking-wider">Level 5: Parent</div>
              <div className="text-sm font-semibold text-white mt-1 group-hover:text-pink-200">Mr. Mark Doe</div>
              <div className="text-[10px] text-pink-400/80 mt-1 font-mono">parent.john@gmail.com</div>
            </button>
          </div>
        </div>
      </section>

      {/* Subscription Pricing Tiers */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-white">B2B Institute Subscription Packages</h2>
          <p className="text-slate-400 mt-2 text-sm max-w-xl mx-auto">
            Transparent pricing tailored for institutions of all sizes — from growing colleges to enterprise universities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Plan 1 */}
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Starter</div>
              <div className="text-2xl font-black text-white mt-1">Free Trial</div>
              <div className="text-4xl font-extrabold text-indigo-400 mt-4">$0 <span className="text-xs text-slate-400 font-normal">/ month</span></div>
              <div className="text-xs text-slate-400 mt-2">Up to 50 Student Seats • 50k API Tokens</div>

              <ul className="mt-6 space-y-3 text-xs text-slate-300">
                <li className="flex items-center space-x-2"><span>✅</span><span>Basic Progress & Attendance</span></li>
                <li className="flex items-center space-x-2"><span>✅</span><span>Assessment & Grade Tracking</span></li>
                <li className="flex items-center space-x-2"><span>✅</span><span>Discussion Forums</span></li>
              </ul>
            </div>
            <button
              onClick={() => {
                setOnboardData({ ...onboardData, subscription_tier: 'Free Trial' });
                setShowOnboardModal(true);
              }}
              className="mt-8 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all"
            >
              Start Free Trial
            </button>
          </div>

          {/* Plan 2 */}
          <div className="bg-gradient-to-b from-indigo-950/60 to-slate-900 p-8 rounded-3xl border-2 border-indigo-500/80 flex flex-col justify-between relative shadow-2xl shadow-indigo-500/20">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
              Most Popular
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-300">Growth</div>
              <div className="text-2xl font-black text-white mt-1">Growth Campus</div>
              <div className="text-4xl font-extrabold text-purple-400 mt-4">$299 <span className="text-xs text-slate-400 font-normal">/ month</span></div>
              <div className="text-xs text-slate-400 mt-2">Up to 250 Student Seats • 500k API Tokens</div>

              <ul className="mt-6 space-y-3 text-xs text-slate-200">
                <li className="flex items-center space-x-2"><span>✅</span><span>All Starter Features</span></li>
                <li className="flex items-center space-x-2"><span>✅</span><span>HOD & Department Hierarchies</span></li>
                <li className="flex items-center space-x-2"><span>✅</span><span>BTP Milestone Review Workflow</span></li>
                <li className="flex items-center space-x-2"><span>✅</span><span>Custom Institute Branding & Logo</span></li>
              </ul>
            </div>
            <button
              onClick={() => {
                setOnboardData({ ...onboardData, subscription_tier: 'Growth Campus' });
                setShowOnboardModal(true);
              }}
              className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
            >
              Subscribe Growth Campus
            </button>
          </div>

          {/* Plan 3 */}
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-purple-400">Enterprise</div>
              <div className="text-2xl font-black text-white mt-1">Enterprise University</div>
              <div className="text-4xl font-extrabold text-pink-400 mt-4">$799 <span className="text-xs text-slate-400 font-normal">/ month</span></div>
              <div className="text-xs text-slate-400 mt-2">5,000 Student Seats • 5M API Tokens</div>

              <ul className="mt-6 space-y-3 text-xs text-slate-300">
                <li className="flex items-center space-x-2"><span>✅</span><span>Unlimited Campus Capacity</span></li>
                <li className="flex items-center space-x-2"><span>✅</span><span>API Key & ERP Integration Access</span></li>
                <li className="flex items-center space-x-2"><span>✅</span><span>Audit Compliance & Logging</span></li>
                <li className="flex items-center space-x-2"><span>✅</span><span>24/7 Dedicated Account Manager</span></li>
              </ul>
            </div>
            <button
              onClick={() => {
                setOnboardData({ ...onboardData, subscription_tier: 'Enterprise University' });
                setShowOnboardModal(true);
              }}
              className="mt-8 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all"
            >
              Get Enterprise License
            </button>
          </div>
        </div>
      </section>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-6 rounded-3xl shadow-2xl relative">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-white mb-1">Sign In to Campus</h3>
            <p className="text-xs text-slate-400 mb-6">Enter your email, password, and institutional code</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Institute Code</label>
                <input
                  type="text"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value)}
                  placeholder="e.g. IIITS, IITM, STANFORD"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institute.edu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Onboard Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg p-6 rounded-3xl shadow-2xl relative">
            <button
              onClick={() => {
                setShowOnboardModal(false);
                setOnboardSuccess(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            {onboardSuccess ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">🎉</div>
                <h3 className="text-2xl font-bold text-white mb-2">Onboarding Successful!</h3>
                <p className="text-xs text-slate-300 mb-6">{onboardSuccess.message}</p>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left text-xs space-y-2 mb-6 font-mono">
                  <div><span className="text-slate-400">Institute:</span> <span className="text-indigo-300 font-bold">{onboardSuccess.tenant?.name}</span></div>
                  <div><span className="text-slate-400">Code:</span> <span className="text-purple-300 font-bold">{onboardSuccess.tenant?.code}</span></div>
                  <div><span className="text-slate-400">Director Email:</span> <span className="text-emerald-300">{onboardSuccess.admin_credentials?.email}</span></div>
                  <div><span className="text-slate-400">Password:</span> <span className="text-amber-300">{onboardSuccess.admin_credentials?.password}</span></div>
                </div>

                <button
                  onClick={() => {
                    setEmail(onboardSuccess.admin_credentials.email);
                    setTenantCode(onboardSuccess.tenant.code);
                    setShowOnboardModal(false);
                    setShowLoginModal(true);
                  }}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  Proceed to Login as Director
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white mb-1">Onboard Your Institute</h3>
                <p className="text-xs text-slate-400 mb-6">Register your college/university to get instant workspace access</p>

                <form onSubmit={handleOnboardSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Institute Full Name</label>
                    <input
                      type="text"
                      value={onboardData.name}
                      onChange={(e) => setOnboardData({ ...onboardData, name: e.target.value })}
                      placeholder="e.g. National Institute of Technology"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Unique Code</label>
                      <input
                        type="text"
                        value={onboardData.code}
                        onChange={(e) => setOnboardData({ ...onboardData, code: e.target.value })}
                        placeholder="e.g. NITK"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 uppercase font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Domain</label>
                      <input
                        type="text"
                        value={onboardData.domain}
                        onChange={(e) => setOnboardData({ ...onboardData, domain: e.target.value })}
                        placeholder="nitk.ac.in"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Director / Contact Email</label>
                    <input
                      type="email"
                      value={onboardData.contact_email}
                      onChange={(e) => setOnboardData({ ...onboardData, contact_email: e.target.value })}
                      placeholder="director@nitk.ac.in"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Selected Plan</label>
                    <select
                      value={onboardData.subscription_tier}
                      onChange={(e) => setOnboardData({ ...onboardData, subscription_tier: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Free Trial">Free Trial ($0/mo)</option>
                      <option value="Growth Campus">Growth Campus ($299/mo)</option>
                      <option value="Enterprise University">Enterprise University ($799/mo)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all mt-2"
                  >
                    Complete Onboarding & Activate Workspace
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
