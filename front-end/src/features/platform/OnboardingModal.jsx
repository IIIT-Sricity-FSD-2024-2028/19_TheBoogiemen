import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { addNotification } from '../ui/uiSlice';
import { setCredentials } from '../auth/authSlice';
import { setActiveTenant } from '../tenant/tenantSlice';

const STEPS = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Metrics' },
  { id: 3, label: 'Review' },
  { id: 4, label: 'Payment' },
  { id: 5, label: 'Done' },
];

export default function OnboardingModal({ isOpen, onClose }) {
  const dispatch = useDispatch();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Step 1: Details
  const [details, setDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    collegeName: '',
    city: '',
    state: '',
    type: '',
  });

  // Step 2: Metrics
  const [metrics, setMetrics] = useState({
    studentCount: 500,
    facultyCount: 30,
    modules: ['research', 'analytics'],
    termYears: 1,
  });

  // Live estimate
  const [livePrice, setLivePrice] = useState(null);

  // Step 3: Quote Breakdown
  const [quote, setQuote] = useState(null);

  // Step 4: Mock Checkout
  const [checkoutData, setCheckoutData] = useState(null);
  const [paymentFailed, setPaymentFailed] = useState(false);

  // Step 5: Fulfillment user
  const [fulfilledUser, setFulfilledUser] = useState(null);

  const formatRupees = (paise) => {
    if (typeof paise !== 'number') return '—';
    return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  // Live Estimate debounced fetch
  useEffect(() => {
    if (!isOpen || step !== 2) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/billing/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_count: Number(metrics.studentCount) || 0,
            faculty_count: Number(metrics.facultyCount) || 0,
            modules: metrics.modules,
            term_years: Number(metrics.termYears) || 1,
          }),
        });
        const data = await res.json();
        if (res.ok && data.data) {
          setLivePrice(data.data.payable_paise);
        }
      } catch {
        setLivePrice(null);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [isOpen, step, metrics]);

  if (!isOpen) return null;

  // ── Step 1 Submit ──────────────────────────────────────────────────────────
  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const payload = {
      email: details.email.trim(),
      password: details.password,
      first_name: details.firstName.trim() || undefined,
      last_name: details.lastName.trim() || undefined,
      phone: details.phone.trim() || undefined,
      college: {
        name: details.collegeName.trim(),
        city: details.city.trim() || undefined,
        state: details.state.trim() || undefined,
        type: details.type || undefined,
      },
    };

    try {
      const res = await fetch('/api/billing/onboarding/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Validation failed';
        throw new Error(msg);
      }
      setStep(2);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2 Submit ──────────────────────────────────────────────────────────
  const handleMetricsSubmit = async () => {
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/billing/onboarding/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          student_count: Number(metrics.studentCount),
          faculty_count: Number(metrics.facultyCount),
          modules: metrics.modules,
          term_years: Number(metrics.termYears),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to generate quote');
      }
      setQuote(data.data);
      setStep(3);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3 Submit (Accept Quote) ───────────────────────────────────────────
  const handleAcceptQuote = async () => {
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/billing/onboarding/quote/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to accept quote');
      setCheckoutData(data.data);
      setPaymentFailed(false);
      setStep(4);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 4: Simulate Failure ───────────────────────────────────────────────
  const handleSimulateFailure = async () => {
    setErrorMessage('');
    try {
      await fetch('/api/billing/onboarding/payments/fail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      });
      setPaymentFailed(true);
      // Refresh order ID
      const res = await fetch('/api/billing/onboarding/quote/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (res.ok && data.data) setCheckoutData(data.data);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // ── Step 4: Simulate Success ───────────────────────────────────────────────
  const handleSimulateSuccess = async () => {
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/billing/onboarding/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment confirmation failed');

      setFulfilledUser(data.user);
      localStorage.setItem('bp_user', JSON.stringify(data.user));

      // Update Redux state
      dispatch(
        setCredentials({
          user: data.user,
          accessToken: 'cookie-session',
        })
      );
      dispatch(
        setActiveTenant({
          name: details.collegeName,
          code: details.collegeName.slice(0, 5).toUpperCase(),
        })
      );

      dispatch(
        addNotification({
          id: `onboard-success-${Date.now()}`,
          type: 'success',
          title: 'Institution Onboarded Successfully!',
          message: `${details.collegeName} and SPOC account (${data.user?.email}) are now active.`,
        })
      );

      setStep(5);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (mod) => {
    setMetrics((prev) => ({
      ...prev,
      modules: prev.modules.includes(mod)
        ? prev.modules.filter((m) => m !== mod)
        : [...prev.modules, mod],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col overflow-hidden text-slate-100 max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-600/30">
              BP
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Onboard Your Institute</h2>
              <p className="text-xs text-slate-400">Algorithmic pricing &amp; instant workspace provisioning</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-8 py-3 bg-slate-950/60 border-b border-slate-800/80">
          {STEPS.map((s) => {
            const isDone = s.id < step;
            const isActive = s.id === step;
            return (
              <div key={s.id} className="flex items-center space-x-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isActive
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isDone ? (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  ) : s.id}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    isActive ? 'text-indigo-300 font-bold' : isDone ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-center justify-between">
            <span>[Error] {errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="ml-2 font-bold opacity-70 hover:opacity-100" aria-label="Close">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: Details */}
          {step === 1 && (
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Your Details &amp; Institution</h3>
                <p className="text-xs text-slate-400">Tell us about your campus. Nothing is charged in this step.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">First Name</label>
                  <input
                    type="text"
                    value={details.firstName}
                    onChange={(e) => setDetails({ ...details, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Ramesh"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Last Name</label>
                  <input
                    type="text"
                    value={details.lastName}
                    onChange={(e) => setDetails({ ...details, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Sharma"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={details.email}
                  onChange={(e) => setDetails({ ...details, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="spoc@institution.edu"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={details.password}
                  onChange={(e) => setDetails({ ...details, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Min 8 characters with upper, lower, number, special char"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Must be 8+ characters with uppercase, lowercase, a number and special char (@$!%*?&amp;).
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={details.phone}
                    onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Institution Type</label>
                  <select
                    value={details.type}
                    onChange={(e) => setDetails({ ...details, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Select --</option>
                    <option value="government">Government</option>
                    <option value="private">Private</option>
                    <option value="deemed">Deemed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  College Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={details.collegeName}
                  onChange={(e) => setDetails({ ...details, collegeName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. St. Xavier College of Engineering"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">City</label>
                  <input
                    type="text"
                    value={details.city}
                    onChange={(e) => setDetails({ ...details, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Mumbai"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">State</label>
                  <input
                    type="text"
                    value={details.state}
                    onChange={(e) => setDetails({ ...details, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Maharashtra"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {loading ? 'Validating Details…' : 'Continue to Metrics →'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Metrics */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Your Metrics &amp; Modular Plan</h3>
                <p className="text-xs text-slate-400">The pricing updates dynamically based on the formula algorithm.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Student Strength</label>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={metrics.studentCount}
                    onChange={(e) => setMetrics({ ...metrics, studentCount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Faculty Count</label>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={metrics.facultyCount}
                    onChange={(e) => setMetrics({ ...metrics, facultyCount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">Select Functional Modules</label>
                <div className="space-y-2">
                  {[
                    { id: 'research', name: 'Research Portal', desc: 'Projects, milestones, supervisor review', weight: '+15%' },
                    { id: 'fees', name: 'Fees & Finance', desc: 'Fee collections, dues, challans', weight: '+10%' },
                    { id: 'forum', name: 'Campus Forum', desc: 'Student-faculty academic discussion boards', weight: '+5%' },
                    { id: 'analytics', name: 'At-Risk Analytics', desc: 'OBE calculation, NAAC reports, dropout alerts', weight: '+20%' },
                  ].map((m) => {
                    const checked = metrics.modules.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleModule(m.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          checked
                            ? 'bg-indigo-950/60 border-indigo-500 text-white'
                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-200">{m.name}</div>
                            <div className="text-[11px] text-slate-400">{m.desc}</div>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-indigo-400">{m.weight}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Contract Term Length</label>
                <select
                  value={metrics.termYears}
                  onChange={(e) => setMetrics({ ...metrics, termYears: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="1">1 Year — Standard Billing</option>
                  <option value="2">2 Years — 5% Multi-Year Discount</option>
                  <option value="3">3 Years — 10% Multi-Year Discount</option>
                </select>
              </div>

              {/* Dynamic Live Price Preview */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-900/60 flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Estimated Pricing</div>
                  <div className="text-2xl font-black text-indigo-400">{formatRupees(livePrice)} / yr</div>
                  <div className="text-[10px] text-slate-500">+ 18% GST • Calculated algorithmically</div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                    Live Estimate
                  </span>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleMetricsSubmit}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {loading ? 'Calculating Quote…' : 'Generate Formal Quote →'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Review Quote */}
          {step === 3 && quote && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Review Your Quote</h3>
                <p className="text-xs text-slate-400">Complete itemized breakdown computed by the pricing engine.</p>
              </div>

              <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-2">
                {quote.lines?.map((line, idx) => {
                  const isNegative = line.amount_paise < 0;
                  return (
                    <div key={idx} className="flex justify-between text-xs py-1 border-b border-slate-800/60 last:border-0">
                      <span className="text-slate-300">{line.label}</span>
                      <span className={isNegative ? 'text-emerald-400 font-bold' : 'text-slate-100 font-semibold'}>
                        {isNegative ? '−' : ''}
                        {formatRupees(Math.abs(line.amount_paise))}
                      </span>
                    </div>
                  );
                })}
                <div className="flex justify-between text-sm pt-3 border-t-2 border-indigo-500/40 font-bold">
                  <span className="text-white">Total Annual Payable</span>
                  <span className="text-indigo-400 font-black">{formatRupees(quote.payable_paise)}</span>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  ← Edit Metrics
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleAcceptQuote}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {loading ? 'Opening Checkout…' : 'Accept Quote &amp; Proceed to Sandbox Payment →'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Sandbox Mock Payment */}
          {step === 4 && checkoutData && (
            <div className="space-y-4">
              <div className="text-center p-5 rounded-2xl border-2 border-dashed border-amber-500/60 bg-amber-950/20">
                <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] tracking-wider uppercase mb-2">
                  Sandbox Checkout • Test Mode
                </span>
                <div className="text-xs text-slate-400">{details.collegeName}</div>
                <div className="text-3xl font-black text-white my-1">{formatRupees(checkoutData.amount_paise)}</div>
                <div className="font-mono text-[11px] text-slate-500">Order ID: {checkoutData.order_id}</div>

                {paymentFailed && (
                  <div className="mt-3 p-2.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs text-left">
                    [Alert] Payment simulation failed. Your quote is still valid. Try again below.
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSimulateSuccess}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {loading ? 'Fulfilling Order…' : 'Simulate Successful Payment'}
                </button>
                <button
                  type="button"
                  onClick={handleSimulateFailure}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition-all"
                >
                  Simulate Payment Failure
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Success & Done */}
          {step === 5 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-600/20 border border-emerald-500 text-emerald-400 flex items-center justify-center text-3xl mx-auto shadow-xl shadow-emerald-500/20">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Your Campus is Live!</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Institution workspace and SPOC administrator account ({fulfilledUser?.email}) have been provisioned.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs max-w-md mx-auto space-y-1 font-mono text-slate-300">
                <div>Campus: <span className="text-indigo-400">{details.collegeName}</span></div>
                <div>Admin: <span className="text-indigo-400">{fulfilledUser?.email}</span></div>
                <div>Role: <span className="text-emerald-400">{fulfilledUser?.role || 'spoc'}</span></div>
                <div>Status: <span className="text-emerald-400">ACTIVE</span></div>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    window.location.href = 'spoc.html';
                  }}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-xl"
                >
                  Launch SPOC Portal →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
