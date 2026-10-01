import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Lock } from 'lucide-react';
import { api } from '../../services/apiClient';
import { useApiResource } from '../../hooks/useApiResource';
import { fetchSession, selectAuth } from '../auth/authSlice';
import { PASSWORD_POLICY } from '../auth/PasswordField';
import { homeForRole } from '../../app/roleRoutes';
import PublicNav, { PublicFooter } from '../public/PublicNav';
import { AccountStep, InstituteStep, PaymentStep, QuoteSummary, ReviewStep, SizeStep } from './OnboardingSteps';
import './onboarding.css';

const STEPS = ['Institute', 'SPOC account', 'Size and modules', 'Review', 'Payment'];
const STORAGE_KEY = 'bp_onboarding_draft';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_METRICS = { student_count: 500, faculty_count: 30, modules: [], term_years: 1 };

/** Non-sensitive progress only (never the password), so a refresh resumes the wizard. */
function loadDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}
function saveDraft(draft) {
  try {
    if (draft) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode): the wizard still works, just without resume.
  }
}

const sameMetrics = (a, b) =>
  a.student_count === b.student_count && a.faculty_count === b.faculty_count && a.term_years === b.term_years &&
  a.modules.length === b.modules.length && a.modules.every((m) => b.modules.includes(m));

function metricErrors(m) {
  const e = {};
  if (!Number.isInteger(m.student_count) || m.student_count < 1 || m.student_count > 100000) e.student_count = 'Enter a whole number from 1 to 1,00,000.';
  if (!Number.isInteger(m.faculty_count) || m.faculty_count < 0 || m.faculty_count > 10000) e.faculty_count = 'Enter a whole number from 0 to 10,000.';
  return e;
}

/**
 * Public self-service onboarding (/onboarding, optional ?plan=starter|growth|enterprise).
 *
 *   Institute + SPOC account  POST /billing/onboarding/start    (draft + bp_onboarding cookie)
 *   Size and modules          POST /billing/estimate (live)  →  POST /billing/onboarding/quote
 *   Review                    POST /billing/onboarding/accept   (opens a test-mode order)
 *   Payment (test mode)       POST /billing/onboarding/confirm | /fail
 *
 * Nothing durable exists until the payment is confirmed; the confirm response
 * sets the session cookie, so the new SPOC lands signed in on /spoc/setup.
 */
export default function OnboardingPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const auth = useSelector(selectAuth);
  const stored = useRef(loadDraft()).current;
  const plansRes = useApiResource('/billing/plans');
  const plans = useMemo(() => (Array.isArray(plansRes.data?.data) ? plansRes.data.data : []), [plansRes.data]);

  const [step, setStep] = useState(stored?.started ? 2 : 0);
  const [institute, setInstitute] = useState(stored?.institute || { name: '', code: '', city: '', state: '', type: '' });
  const [account, setAccount] = useState(stored?.account || { first_name: '', last_name: '', email: '', phone: '' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [metrics, setMetrics] = useState(stored?.metrics || DEFAULT_METRICS);
  const [started, setStarted] = useState(!!stored?.started);
  const [resume, setResume] = useState({ status: stored?.started ? 'checking' : 'done', error: null });
  const [quote, setQuote] = useState(null);
  const [order, setOrder] = useState(null);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [touched, setTouched] = useState({});
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [finished, setFinished] = useState(null); // null | 'signing-in' | 'sign-in-needed'
  const [estimate, setEstimate] = useState({ status: 'idle', data: null, error: null });
  const planApplied = useRef(!!stored?.metrics);
  const headingRef = useRef(null);

  useEffect(() => {
    document.title = 'Onboard your institute · BarelyPassing';
  }, []);

  // ?plan= preselects that plan's size and modules (once, unless a draft is being resumed).
  useEffect(() => {
    if (planApplied.current || !plans.length) return;
    planApplied.current = true;
    const plan = plans.find((p) => p.key === params.get('plan'));
    if (plan) setMetrics({ ...plan.metrics, modules: [...plan.metrics.modules] });
  }, [plans, params]);

  useEffect(() => {
    if (finished) return;
    saveDraft({ institute, account, metrics, started });
  }, [institute, account, metrics, started, finished]);

  const resetWizard = (message) => {
    saveDraft(null);
    setStarted(false);
    setQuote(null);
    setOrder(null);
    setPaymentFailed(false);
    setStep(0);
    setError(null);
    setNotice(message || null);
  };

  // After a refresh, ask the server whether the draft session (cookie) is still valid.
  const [resumeKey, setResumeKey] = useState(0);
  useEffect(() => {
    if (!stored?.started) return undefined;
    const controller = new AbortController();
    setResume({ status: 'checking', error: null });
    api
      .get('/billing/onboarding/quote', { signal: controller.signal })
      .then((res) => {
        const q = res?.data;
        if (q) {
          setQuote(q);
          setMetrics({ ...q.metrics, modules: [...q.metrics.modules] });
          setStep(3);
        } else setStep(2);
        setResume({ status: 'done', error: null });
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        if (err.status === 400 || err.status === 401) {
          resetWizard('Your earlier onboarding session has ended. Please start again.');
          setResume({ status: 'done', error: null });
        } else setResume({ status: 'failed', error: err.message });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeKey]);

  // Live price. A plan preset already carries its quote, so only custom sizes call the estimate endpoint.
  const mErrors = metricErrors(metrics);
  const metricsValid = Object.keys(mErrors).length === 0;
  const preset = useMemo(() => (metricsValid ? plans.find((p) => sameMetrics(p.metrics, metrics)) : null), [plans, metrics, metricsValid]);
  useEffect(() => {
    if (step !== 2) return undefined;
    if (!metricsValid) {
      setEstimate({ status: 'idle', data: null, error: null });
      return undefined;
    }
    if (preset) {
      setEstimate({ status: 'succeeded', data: preset.quote, error: null });
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setEstimate((s) => ({ ...s, status: 'loading' }));
      api
        .post('/billing/estimate', metrics, { signal: controller.signal })
        .then((res) => setEstimate({ status: 'succeeded', data: res.data, error: null }))
        .catch((err) => {
          if (err.name !== 'AbortError') setEstimate({ status: 'failed', data: null, error: err.message });
        });
    }, 600);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [metrics, metricsValid, preset, step]);

  const instituteErrors = {};
  if (!institute.name.trim()) instituteErrors.name = 'Enter the institute name.';
  if (institute.code.trim() && !/^[A-Za-z0-9]{2,10}$/.test(institute.code.trim())) instituteErrors.code = 'Use 2-10 letters or digits.';

  const accountErrors = {};
  if (!account.first_name.trim()) accountErrors.first_name = 'Enter your first name.';
  if (!EMAIL.test(account.email.trim())) accountErrors.email = 'Enter a valid email address.';
  if (account.phone.trim() && !/^[0-9+\-\s]{7,20}$/.test(account.phone.trim())) accountErrors.phone = 'Enter a valid phone number.';
  if (!started) {
    if (!PASSWORD_POLICY.test(password)) accountErrors.password = 'The password does not meet the rules below.';
    if (confirm !== password) accountErrors.confirm = 'The passwords do not match.';
    else if (!confirm) accountErrors.confirm = 'Confirm the password.';
  }

  const goTo = (n) => {
    setStep(n);
    setError(null);
    setNotice(null);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const call = async (name, fn) => {
    setBusy(name);
    setError(null);
    try {
      return { ok: true, data: await fn() };
    } catch (err) {
      if (err.status === 401) resetWizard('Your onboarding session has expired. Please start again.');
      else setError(err.status === 429 ? 'Too many requests from this network. Please wait a few minutes and try again.' : err.message);
      return { ok: false };
    } finally {
      setBusy(null);
    }
  };

  const next = async () => {
    if (step === 0) {
      setTouched((t) => ({ ...t, 0: true }));
      if (Object.keys(instituteErrors).length === 0) goTo(1);
      return;
    }
    if (step === 1) {
      setTouched((t) => ({ ...t, 1: true }));
      if (Object.keys(accountErrors).length) return;
      if (started) {
        goTo(2);
        return;
      }
      const college = { name: institute.name.trim() };
      if (institute.code.trim()) college.code = institute.code.trim().toUpperCase();
      if (institute.city.trim()) college.city = institute.city.trim();
      if (institute.state.trim()) college.state = institute.state.trim();
      if (institute.type) college.type = institute.type;
      const body = { email: account.email.trim().toLowerCase(), password, first_name: account.first_name.trim(), college };
      if (account.last_name.trim()) body.last_name = account.last_name.trim();
      if (account.phone.trim()) body.phone = account.phone.trim();
      const res = await call('start', () => api.post('/billing/onboarding/start', body));
      if (res.ok) {
        setStarted(true);
        setPassword('');
        setConfirm('');
        goTo(2);
      }
      return;
    }
    if (step === 2) {
      setTouched((t) => ({ ...t, 2: true }));
      if (!metricsValid) return;
      const res = await call('quote', () => api.post('/billing/onboarding/quote', metrics));
      if (res.ok) {
        setQuote(res.data.data);
        goTo(3);
      }
      return;
    }
    if (step === 3) {
      const res = await call('accept', () => api.post('/billing/onboarding/accept'));
      if (res.ok) {
        setOrder(res.data.data);
        setPaymentFailed(false);
        goTo(4);
      }
    }
  };

  const simulateFailure = async () => {
    const res = await call('fail', () => api.post('/billing/onboarding/fail'));
    if (res.ok) {
      setPaymentFailed(true);
      setOrder(null);
    }
  };

  const retryPayment = async () => {
    const res = await call('accept', () => api.post('/billing/onboarding/accept'));
    if (res.ok) {
      setOrder(res.data.data);
      setPaymentFailed(false);
    }
  };

  const confirmPayment = async () => {
    const res = await call('confirm', () => api.post('/billing/onboarding/confirm'));
    if (!res.ok) return;
    saveDraft(null);
    setFinished('signing-in');
    // The confirm response set the bp_session cookie; load the session from the server.
    const session = await dispatch(fetchSession());
    if (fetchSession.fulfilled.match(session)) navigate('/spoc/setup', { replace: true });
    else setFinished('sign-in-needed');
  };

  const alreadySignedIn = auth.status === 'authenticated' && auth.user && !finished;
  const locked = started;
  const accepted = quote?.status === 'accepted' || !!order || paymentFailed;

  let body;
  if (finished) {
    body = (
      <div className="ob-grid is-single">
        <section className="sp-card ob-card" aria-live="polite">
          <div className="sp-state">
            <CheckCircle2 size={44} color="var(--sp-success)" aria-hidden="true" />
            <p className="sp-state-title">Your institute is onboarded</p>
            {finished === 'signing-in' ? (
              <p>Signing you in and opening the setup wizard...</p>
            ) : (
              <>
                <p>The college and your SPOC account were created. Sign in with the email and password you chose to continue with setup.</p>
                <Link to="/login?role=spoc&next=/spoc/setup" className="sp-btn">Sign in as SPOC</Link>
              </>
            )}
          </div>
        </section>
      </div>
    );
  } else if (alreadySignedIn) {
    body = (
      <div className="ob-grid is-single">
        <section className="sp-card ob-card">
          <div className="sp-state">
            <p className="sp-state-title">You are already signed in</p>
            <p>Onboarding creates a new institute and SPOC account. Sign out first if you want to onboard another institute.</p>
            <Link to={homeForRole(auth.user.role)} className="sp-btn">Go to my portal</Link>
          </div>
        </section>
      </div>
    );
  } else if (resume.status === 'checking') {
    body = (
      <div className="ob-grid is-single">
        <section className="sp-card ob-card" role="status">
          <span className="sp-visually-hidden">Restoring your onboarding session</span>
          <div className="sp-skeleton" style={{ height: 220 }} />
        </section>
      </div>
    );
  } else if (resume.status === 'failed') {
    body = (
      <div className="ob-grid is-single">
        <section className="sp-card ob-card">
          <div className="sp-state" role="alert">
            <p className="sp-state-title" style={{ color: 'var(--sp-danger)' }}>Could not restore your onboarding session</p>
            <p>{resume.error}</p>
            <div className="sp-btn-row">
              <button type="button" className="sp-btn is-secondary is-small" onClick={() => setResumeKey((k) => k + 1)}>Try again</button>
              <button type="button" className="sp-btn is-secondary is-small" onClick={() => { resetWizard(); setResume({ status: 'done', error: null }); }}>Start over</button>
            </div>
          </div>
        </section>
      </div>
    );
  } else {
    const showSummary = step >= 2;
    const summaryQuote = step === 2 ? estimate.data : quote;
    body = (
      <>
        <ol className="ob-steps" aria-label="Onboarding steps">
          {STEPS.map((label, i) => (
            <li key={label} className={`ob-step${i === step ? ' is-current' : i < step ? ' is-done' : ''}`} aria-current={i === step ? 'step' : undefined}>
              <span className="ob-step-num" aria-hidden="true">{i < step ? <Check size={13} /> : i + 1}</span>
              {label}
              {i < step && <span className="sp-visually-hidden"> (done)</span>}
            </li>
          ))}
        </ol>

        <div className={`ob-grid${showSummary ? '' : ' is-single'}`}>
          <form className="sp-card ob-card sp-form" style={{ gap: 18 }} noValidate onSubmit={(e) => { e.preventDefault(); if (step < 4) next(); }}>
            <div>
              <h2 ref={headingRef} tabIndex={-1} style={{ outline: 'none' }}>
                {['Tell us about your institute', 'Create the SPOC account', 'Choose size and modules', 'Review your order', 'Payment'][step]}
              </h2>
              <p className="sp-muted" style={{ margin: 0 }}>
                {[
                  'The institute this subscription is for.',
                  'The single point of contact who sets the college up and manages people and the subscription.',
                  'Pricing depends on seats, add-on modules and the contract term.',
                  'Check the details before continuing to payment.',
                  'Complete the order to create your college and SPOC account.',
                ][step]}
              </p>
            </div>

            {notice && <div className="sp-alert is-warning" role="status"><span>{notice}</span></div>}
            {locked && step < 2 && (
              <div className="sp-alert is-info" role="note">
                <span><Lock size={14} aria-hidden="true" /> These details are saved for this onboarding session and can no longer be edited here. You can update the college profile during setup.</span>
              </div>
            )}

            {step === 0 && <InstituteStep value={institute} onChange={setInstitute} errors={touched[0] ? instituteErrors : {}} locked={locked} />}
            {step === 1 && (
              <AccountStep value={account} onChange={setAccount} password={password} confirm={confirm} onPassword={setPassword} onConfirm={setConfirm}
                errors={touched[1] ? accountErrors : {}} locked={locked} />
            )}
            {step === 2 && (
              plansRes.status === 'failed' ? (
                <>
                  <div className="sp-alert is-warning" role="status">
                    <span>Plan presets could not be loaded ({plansRes.error?.message}). You can still enter your size.</span>
                    <button type="button" className="sp-link-btn" onClick={plansRes.reload}>Retry</button>
                  </div>
                  <SizeStep metrics={metrics} onChange={setMetrics} plans={[]} presetKey={null} errors={mErrors} />
                </>
              ) : (
                <SizeStep metrics={metrics} onChange={setMetrics} plans={plans} presetKey={preset?.key || null} errors={mErrors} />
              )
            )}
            {step === 3 && quote && <ReviewStep institute={institute} account={account} quote={quote} />}
            {step === 4 && <PaymentStep order={order} amountPaise={quote?.payable_paise} failed={paymentFailed && !order} />}

            {error && <div className="sp-alert is-error" role="alert"><span>{error}</span></div>}

            <div className="ob-actions">
              {step === 4 ? (
                <span />
              ) : (
                <button type="button" className="sp-btn is-secondary" onClick={() => goTo(step - 1)} disabled={step === 0 || !!busy || (step === 3 && accepted)}>
                  <ArrowLeft size={15} /> Back
                </button>
              )}
              {step < 3 && (
                <button type="submit" className="sp-btn" disabled={!!busy}>
                  {busy === 'start' ? 'Saving...' : busy === 'quote' ? 'Preparing quote...' : 'Continue'} <ArrowRight size={15} />
                </button>
              )}
              {step === 3 && (
                <button type="submit" className="sp-btn" disabled={!!busy}>
                  {busy === 'accept' ? 'Opening order...' : 'Accept and continue to payment'} <ArrowRight size={15} />
                </button>
              )}
              {step === 4 && order && (
                <div className="sp-btn-row">
                  <button type="button" className="sp-btn is-secondary" onClick={simulateFailure} disabled={!!busy}>
                    {busy === 'fail' ? 'Working...' : 'Simulate failed payment'}
                  </button>
                  <button type="button" className="sp-btn" onClick={confirmPayment} disabled={!!busy}>
                    {busy === 'confirm' ? 'Creating your college...' : 'Simulate successful payment'}
                  </button>
                </div>
              )}
              {step === 4 && !order && (
                <button type="button" className="sp-btn" onClick={retryPayment} disabled={!!busy}>
                  {busy === 'accept' ? 'Opening order...' : 'Try payment again'}
                </button>
              )}
            </div>
          </form>

          {showSummary && (
            <QuoteSummary
              quote={summaryQuote}
              status={step === 2 ? estimate.status : 'succeeded'}
              error={estimate.error}
              committed={step > 2}
            />
          )}
        </div>
      </>
    );
  }

  return (
    <div className="ob-page">
      <PublicNav />
      <main id="main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="sp-hero-band ob-head">
          <div className="ob-head-inner">
            <span className="sp-eyebrow">Institute onboarding</span>
            <h1>Onboard your institute</h1>
            <p>Five short steps: your institute, the SPOC account, your size and modules, a review and a test-mode payment. Then set the college up in the SPOC portal.</p>
          </div>
        </div>
        <div className="ob-body">{body}</div>
      </main>
      <PublicFooter />
    </div>
  );
}
