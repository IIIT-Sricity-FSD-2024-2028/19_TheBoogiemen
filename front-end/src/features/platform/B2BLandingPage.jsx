import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginThunk } from '../auth/authSlice';
import { setActiveView } from '../ui/uiSlice';
import OnboardingModal from './OnboardingModal';

export default function B2BLandingPage() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState('Free Trial');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantCode, setTenantCode] = useState('');

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 max-w-7xl mx-auto text-center flex flex-col items-center">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-8">
          <span>Enterprise Academic Governance Platform</span>
          <span>•</span>
          <span>Outcome-Based Education</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight max-w-4xl text-slate-900 mb-6">
          Enterprise Academic Performance &amp; Governance Platform
        </h1>

        <p className="text-lg md:text-xl text-slate-600 max-w-3xl mb-10 leading-relaxed font-normal">
          A unified institutional operating system for Outcome-Based Education (OBE), automated accreditation compliance, real-time attendance analytics, and multi-tier campus governance.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => {
              setSelectedTier('Free Trial');
              setShowOnboardModal(true);
            }}
            className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/25 hover:-translate-y-0.5 transition-all"
          >
            Onboard Your Institute
          </button>
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-8 py-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-base border border-slate-300 hover:border-slate-400 shadow-sm hover:-translate-y-0.5 transition-all"
          >
            Access Campus Portal
          </button>
          <a
            href="saas-login.html"
            className="px-6 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all"
          >
            Support Portal
          </a>
        </div>

        {/* 4 Enterprise Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 w-full max-w-5xl">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left">
            <div className="text-3xl font-extrabold text-blue-600">100%</div>
            <div className="text-xs text-slate-600 font-medium mt-1">Audited Data Privacy &amp; Security</div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left">
            <div className="text-3xl font-extrabold text-indigo-600">6 Roles</div>
            <div className="text-xs text-slate-600 font-medium mt-1">Dedicated Governance Portals</div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left">
            <div className="text-3xl font-extrabold text-slate-900">OBE Mapped</div>
            <div className="text-xs text-slate-600 font-medium mt-1">Accreditation &amp; Attainment Reporting</div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left">
            <div className="text-3xl font-extrabold text-blue-600">Real-Time</div>
            <div className="text-xs text-slate-600 font-medium mt-1">Attendance, Grading &amp; Fee Insights</div>
          </div>
        </div>
      </section>

      {/* 6 Dedicated Campus Portals Grid */}
      <section className="py-16 bg-white border-y border-slate-200 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Dedicated Institutional Portals</h2>
            <p className="text-sm text-slate-500 mt-2">Role-specific administrative workspaces engineered with strict domain authorization</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Student Portal */}
            <div className="bg-slate-50 hover:bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm mb-4">
                  STU
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Student Portal</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  Track enrolled courses, verified attendance records, CGPA progression, and official leave requisitions.
                </p>
              </div>
              <a
                href="student.html"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Access Portal &rarr;
              </a>
            </div>

            {/* Faculty Portal */}
            <div className="bg-slate-50 hover:bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm mb-4">
                  FAC
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Faculty Portal</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  Session-wise attendance tracking, continuous internal evaluation, syllabus delivery, and assignment grading.
                </p>
              </div>
              <a
                href="faculty.html"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Access Portal &rarr;
              </a>
            </div>

            {/* HOD Portal */}
            <div className="bg-slate-50 hover:bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm mb-4">
                  HOD
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">HOD / Academic Head</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  Course workload allocation, department syllabus progression, curriculum review, and approval pipelines.
                </p>
              </div>
              <a
                href="hod.html"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Access Portal &rarr;
              </a>
            </div>

            {/* Director Portal */}
            <div className="bg-slate-50 hover:bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm mb-4">
                  DIR
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Institute Director</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  Executive institutional governance, NBA/NAAC attainment matrices, institutional risk radars, and faculty analytics.
                </p>
              </div>
              <a
                href="director.html"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Access Portal &rarr;
              </a>
            </div>

            {/* Finance Portal */}
            <div className="bg-slate-50 hover:bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm mb-4">
                  FIN
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Finance Officer</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  Comprehensive fee collection, student dues reconciliations, transaction histories, and digital payment receipts.
                </p>
              </div>
              <a
                href="finance.html"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Access Portal &rarr;
              </a>
            </div>

            {/* Support Portal */}
            <div className="bg-slate-50 hover:bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-sm mb-4">
                  OPS
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Support Portal</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  Multi-tenant institution administration, platform health monitoring, subscription quotas, and system configuration.
                </p>
              </div>
              <a
                href="saas.html"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Access Portal &rarr;
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Pricing Tiers */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-slate-900">Institutional Subscription Packages</h2>
          <p className="text-slate-600 mt-2 text-sm max-w-xl mx-auto">
            Predictable licensing tailored for institutions of all sizes, from growing colleges to multi-campus universities.
          </p>
        </div>

        {/* Dynamic Interactive Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              id: 'starter',
              tierName: 'Free Trial',
              badge: 'Starter',
              name: 'Free Trial',
              price: '$0',
              period: '/ month',
              subtitle: 'Up to 50 Student Accounts • Core Academic Features',
              features: [
                'Academic Progress & Attendance',
                'Assessment & Marks Tracking',
                'Institutional Notice & Discussions',
                'Dedicated Institute Code',
              ],
              btnText: 'Start Free Trial',
            },
            {
              id: 'growth',
              tierName: 'Growth Campus',
              badge: 'Growth',
              name: 'Growth Campus',
              price: '$299',
              period: '/ month',
              popular: true,
              subtitle: 'Up to 250 Student Accounts • Department Operations',
              features: [
                'All Starter Features Included',
                'Department & HOD Governance',
                'Finance Dues & Receipt Tracking',
                'Multi-Level Leave Approval Pipeline',
                'Custom Institution Branding',
              ],
              btnText: 'Subscribe Growth Campus',
            },
            {
              id: 'enterprise',
              tierName: 'Enterprise University',
              badge: 'Enterprise',
              name: 'Enterprise University',
              price: '$799',
              period: '/ month',
              subtitle: 'Unlimited Student Accounts • Complete Governance',
              features: [
                'Complete Multi-Tier Actor Delegation',
                'Official Accreditation & NBA Reports',
                'Priority 24/7 Support Service Level',
                'Custom Domain & Institutional Isolation',
              ],
              btnText: 'Get Enterprise License',
            },
          ].map((plan) => {
            const isSelected = selectedTier === plan.tierName;
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedTier(plan.tierName)}
                className={`p-8 rounded-3xl flex flex-col justify-between relative cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-50/20 border-2 border-blue-600 shadow-md ring-1 ring-blue-500/20 -translate-y-1'
                    : 'bg-white border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full shadow-sm">
                    Most Popular
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{plan.badge}</span>
                    {isSelected && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        Active Selection
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{plan.name}</div>
                  <div className="text-4xl font-extrabold text-slate-900 mt-4">
                    {plan.price} <span className="text-xs text-slate-500 font-normal">{plan.period}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">{plan.subtitle}</div>

                  <ul className="mt-6 space-y-3 text-xs text-slate-700">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTier(plan.tierName);
                    setShowOnboardModal(true);
                  }}
                  className={`mt-8 w-full py-3 rounded-xl font-bold text-xs transition-all ${
                    isSelected
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                  }`}
                >
                  {plan.btnText}
                </button>
              </div>
            );
          })}
        </div>

        {/* Dynamic Selection Summary Panel */}
        <div className="mt-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Selected Package Tier</div>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {selectedTier}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Click any package card above to switch tier configuration dynamically.
            </div>
          </div>
          <button
            onClick={() => setShowOnboardModal(true)}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all shrink-0"
          >
            Continue with {selectedTier} &rarr;
          </button>
        </div>
      </section>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md p-6 rounded-3xl shadow-2xl relative text-slate-900">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold"
            >
              &times;
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1">Sign In to Campus</h3>
            <p className="text-xs text-slate-500 mb-6">Enter your institutional code, email address, and password</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Institute Code</label>
                <input
                  type="text"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value)}
                  placeholder="e.g. IIITS, IITM, STANFORD"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institute.edu"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboardModal}
        onClose={() => setShowOnboardModal(false)}
        initialTier={selectedTier}
      />
    </div>
  );
}
