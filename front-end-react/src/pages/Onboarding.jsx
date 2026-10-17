/**
 * Onboarding — ported from legacy front-end/onboarding.html's inline
 * <script>. A 5-step wizard: details → metrics (live price) → review →
 * mock payment → done. Public, no login required until the final step
 * (the billing session lives in its own httpOnly cookie, separate from the
 * dashboard login session — see resumeIfMidFlow below).
 *
 * Uses its own small `apiCall`, not the dashboard's `apiFetch`: the legacy
 * page deliberately only loaded state.js, never script.js/fixes.js, and
 * never Auth.apiFetch — this flow's 401 means "no draft in progress," not
 * "your dashboard session died," so it must not trigger apiFetch's
 * force-logout-and-redirect-to-login behavior.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useBodyClass from '../hooks/useBodyClass';
import '../styles/onboarding.css';

const STEPS = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Metrics' },
  { id: 3, label: 'Review' },
  { id: 4, label: 'Payment' },
  { id: 5, label: 'Done' },
];

const MODULES = [
  { value: 'research', name: 'Research', desc: 'Projects, milestones, supervisor review', weight: '+15%' },
  { value: 'fees', name: 'Fees', desc: 'Fee records and compliance', weight: '+10%' },
  { value: 'forum', name: 'Forum', desc: 'Discussion boards', weight: '+5%' },
  { value: 'analytics', name: 'Analytics', desc: 'Institutional reports, at-risk detection', weight: '+20%' },
];

async function apiCall(path, options = {}) {
  const res = await fetch('/api' + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (Array.isArray(data.message) ? data.message.join(', ') : data.message) || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

const formatRupees = (paise) => '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function Onboarding() {
  useBodyClass('onboard-body');
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  // Step 1 — details
  const [details, setDetails] = useState({
    first_name: '', last_name: '', email: '', password: '', phone: '',
    college_name: '', city: '', state: '', type: '',
  });
  const [detailsSubmitting, setDetailsSubmitting] = useState(false);

  // Step 2 — metrics
  const [students, setStudents] = useState(500);
  const [faculty, setFaculty] = useState(30);
  const [modules, setModules] = useState([]);
  const [termYears, setTermYears] = useState(1);
  const [livePrice, setLivePrice] = useState('—');
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const estimateTimer = useRef(null);

  // Step 3 — review
  const [quote, setQuote] = useState(null);
  const [acceptSubmitting, setAcceptSubmitting] = useState(false);

  // Step 4 — mock payment
  const [checkout, setCheckout] = useState(null); // { amount_paise, order_id }
  const [paymentFailed, setPaymentFailed] = useState(false);

  const currentMetrics = () => ({
    student_count: Number(students) || 0,
    faculty_count: Number(faculty) || 0,
    modules,
    term_years: Number(termYears),
  });

  const toggleModule = (value) => {
    setModules((prev) => (prev.includes(value) ? prev.filter((m) => m !== value) : [...prev, value]));
  };

  // Live price estimate, debounced — same 300ms as legacy.
  useEffect(() => {
    if (step !== 2) return;
    clearTimeout(estimateTimer.current);
    estimateTimer.current = setTimeout(async () => {
      try {
        const res = await apiCall('/billing/estimate', { method: 'POST', body: JSON.stringify(currentMetrics()) });
        setLivePrice(formatRupees(res.data.payable_paise) + '/yr');
      } catch {
        setLivePrice('—');
      }
    }, 300);
    return () => clearTimeout(estimateTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, students, faculty, modules, termYears]);

  // Resume a draft already in progress (the httpOnly billing-onboarding
  // cookie), on first mount only.
  useEffect(() => {
    (async () => {
      try {
        const res = await apiCall('/billing/onboarding/quote');
        if (res.data) {
          const m = res.data.metrics;
          setStudents(m.student_count);
          setFaculty(m.faculty_count);
          setTermYears(m.term_years);
          setModules(m.modules);
          setQuote(res.data);
          if (res.data.status === 'accepted') {
            const checkoutRes = await apiCall('/billing/onboarding/quote/accept', { method: 'POST' });
            setCheckout({ amount_paise: checkoutRes.data.amount_paise, order_id: checkoutRes.data.order_id });
            setStep(4);
          } else {
            setStep(3);
          }
        }
      } catch {
        // No active draft — start at step 1, the default.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitDetails = async (event) => {
    event.preventDefault();
    setDetailsSubmitting(true);
    try {
      await apiCall('/billing/onboarding/start', {
        method: 'POST',
        body: JSON.stringify({
          email: details.email.trim(),
          password: details.password,
          first_name: details.first_name.trim() || undefined,
          last_name: details.last_name.trim() || undefined,
          phone: details.phone.trim() || undefined,
          college: {
            name: details.college_name.trim(),
            city: details.city.trim() || undefined,
            state: details.state.trim() || undefined,
            type: details.type || undefined,
          },
        }),
      });
      setStep(2);
    } catch (e) {
      alert(e.message);
    } finally {
      setDetailsSubmitting(false);
    }
  };

  const submitMetrics = async () => {
    setQuoteSubmitting(true);
    try {
      const res = await apiCall('/billing/onboarding/quote', { method: 'POST', body: JSON.stringify(currentMetrics()) });
      setQuote(res.data);
      setStep(3);
    } catch (e) {
      alert(e.message);
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const openMockCheckout = async () => {
    const res = await apiCall('/billing/onboarding/quote/accept', { method: 'POST' });
    setCheckout({ amount_paise: res.data.amount_paise, order_id: res.data.order_id });
  };

  const submitAccept = async () => {
    setAcceptSubmitting(true);
    try {
      await openMockCheckout();
      setStep(4);
    } catch (e) {
      alert(e.message);
    } finally {
      setAcceptSubmitting(false);
    }
  };

  const submitFail = async () => {
    try {
      await apiCall('/billing/onboarding/payments/fail', { method: 'POST' });
      setPaymentFailed(true);
      // A fresh order on the SAME quote — the price never changes on a
      // simulated failure, only the order id does.
      await openMockCheckout();
    } catch (e) {
      alert(e.message);
    }
  };

  const submitConfirm = async () => {
    try {
      const res = await apiCall('/billing/onboarding/payments/confirm', { method: 'POST' });
      // The httpOnly bp_session cookie is already set by this response —
      // that's the real credential. The dashboard's own ProtectedRoute
      // reads the cached profile from localStorage, not the cookie it
      // cannot see, exactly like AuthContext.login() populates it.
      localStorage.setItem('bp_user', JSON.stringify(res.user));
      if (res.expires_at) localStorage.setItem('bp_expires_at', String(res.expires_at));
      setStep(5);
      setTimeout(() => navigate('/spoc'), 1600);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="onboard-shell">
      <div className="brand-header" style={{ justifyContent: 'center' }}>
        <div className="logo">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>
        <h1 style={{ fontSize: 22 }}>BarelyPassing</h1>
      </div>

      <div className="onboard-steps">
        {STEPS.map((s) => (
          <div key={s.id} className={`onboard-step-dot ${s.id < step ? 'done' : s.id === step ? 'active' : ''}`}>
            <div className="circle">{s.id < step ? '✓' : s.id}</div>
            <div className="label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="onboard-card">
        {step === 1 && (
          <div className="onboard-panel active">
            <h2>Your details</h2>
            <p className="sub">Tell us about you and your institution — nothing is charged yet.</p>
            <form onSubmit={submitDetails}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input type="text" value={details.first_name} onChange={(e) => setDetails({ ...details, first_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input type="text" value={details.last_name} onChange={(e) => setDetails({ ...details, last_name: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Email <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="email" required value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Password <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="password" required minLength={8} value={details.password} onChange={(e) => setDetails({ ...details, password: e.target.value })} />
                <span className="field-hint">8+ characters with uppercase, lowercase, a number and a special character (@$!%*?&amp;).</span>
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} />
              </div>
              <hr style={{ margin: '18px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
              <div className="form-group">
                <label>College Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. St. Xavier College of Engineering"
                  value={details.college_name}
                  onChange={(e) => setDetails({ ...details, college_name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input type="text" value={details.city} onChange={(e) => setDetails({ ...details, city: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input type="text" value={details.state} onChange={(e) => setDetails({ ...details, state: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={details.type} onChange={(e) => setDetails({ ...details, type: e.target.value })}>
                  <option value="">-- Select --</option>
                  <option value="government">Government</option>
                  <option value="private">Private</option>
                  <option value="deemed">Deemed</option>
                </select>
              </div>
              <button type="submit" className="submit-btn" disabled={detailsSubmitting}>
                {detailsSubmitting ? 'Continuing…' : 'Continue'}
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="onboard-panel active">
            <h2>Your metrics</h2>
            <p className="sub">The price updates as you go — this is an algorithm, not a fixed plan.</p>
            <div className="form-row">
              <div className="form-group">
                <label>Students</label>
                <input type="number" min={1} max={100000} value={students} onChange={(e) => setStudents(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Faculty</label>
                <input type="number" min={0} max={10000} value={faculty} onChange={(e) => setFaculty(e.target.value)} />
              </div>
            </div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', display: 'block', margin: '14px 0 8px' }}>Modules</label>
            {MODULES.map((m) => (
              <label className="module-row" key={m.value}>
                <input type="checkbox" checked={modules.includes(m.value)} onChange={() => toggleModule(m.value)} style={{ marginRight: 10 }} />
                <span className="name">{m.name}</span>
                <span className="desc">{m.desc}</span>
                <span className="weight">{m.weight}</span>
              </label>
            ))}
            <div className="form-group" style={{ marginTop: 14 }}>
              <label>Term Length</label>
              <select value={termYears} onChange={(e) => setTermYears(e.target.value)}>
                <option value="1">1 year</option>
                <option value="2">2 years — 5% off</option>
                <option value="3">3 years — 10% off</option>
              </select>
            </div>
            <div className="price-live">
              <div>
                <div className="amount">{livePrice}</div>
                <div className="caption">estimated, per year + GST</div>
              </div>
              <div className="caption">Updates as you change the fields above</div>
            </div>
            <button type="button" className="submit-btn" style={{ marginTop: 20 }} onClick={submitMetrics} disabled={quoteSubmitting}>
              {quoteSubmitting ? 'Pricing…' : 'Get Quote'}
            </button>
          </div>
        )}

        {step === 3 && quote && (
          <div className="onboard-panel active">
            <h2>Review your quote</h2>
            <p className="sub">Every line the algorithm priced — nothing hidden.</p>
            <div>
              {quote.lines.map((l, i) => {
                const neg = l.amount_paise < 0;
                return (
                  <div className={`breakdown-line ${neg ? 'negative' : ''}`} key={i}>
                    <span>{l.label}</span>
                    <span className="amt">{neg ? '−' : ''}{formatRupees(Math.abs(l.amount_paise))}</span>
                  </div>
                );
              })}
              <div className="breakdown-line total">
                <span>Payable</span>
                <span>{formatRupees(quote.payable_paise)}</span>
              </div>
            </div>
            <button type="button" className="submit-btn" style={{ marginTop: 22 }} onClick={submitAccept} disabled={acceptSubmitting}>
              {acceptSubmitting ? 'Opening checkout…' : 'Accept & Continue to Payment'}
            </button>
            <button type="button" className="btn-cancel" style={{ width: '100%', marginTop: 10 }} onClick={() => setStep(2)}>
              Back to metrics
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="onboard-panel active">
            <h2>Payment</h2>
            <p className="sub">This is a sandbox — no real payment method is used.</p>
            <div className="mock-checkout">
              <span className="badge">BarelyPassing Checkout · Test Mode</span>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{details.college_name.trim()}</div>
              <div className="amount">{checkout ? formatRupees(checkout.amount_paise) : '—'}</div>
              <div className="order-id">{checkout ? 'Order: ' + checkout.order_id : ''}</div>
              {paymentFailed && (
                <div style={{ color: '#991b1b', background: '#fef2f2', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, marginBottom: 16 }}>
                  Payment failed. Your quote is still valid — try again below.
                </div>
              )}
              <button type="button" className="submit-btn" style={{ width: '100%', marginBottom: 10 }} onClick={submitConfirm}>
                ✓ Simulate Successful Payment
              </button>
              <button type="button" className="btn-cancel" style={{ width: '100%', background: 'white' }} onClick={submitFail}>
                Simulate Failure
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="onboard-panel active">
            <h2>You're all set</h2>
            <p className="sub">Your college and SPOC account are live. Taking you to your dashboard…</p>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <p className="terms" style={{ textAlign: 'center', marginTop: 20 }}>
        Already onboarded? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
