import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, BookOpen, Building2, CalendarCheck, Check, ClipboardCheck, GraduationCap, Headphones, Landmark, MessagesSquare,
  ShieldCheck, Users, Wallet,
} from 'lucide-react';
import { api } from '../../services/apiClient';
import { useApiResource } from '../../hooks/useApiResource';
import { ErrorState } from '../../shared/ui/StatusViews';
import PublicNav, { PublicFooter } from './PublicNav';

const FEATURES = [
  { icon: CalendarCheck, title: 'Attendance', text: 'Section-wise marking, course-wise percentages and shortage alerts at your institute\'s own threshold.' },
  { icon: ClipboardCheck, title: 'Assessments and marks', text: 'Create assessments, enter marks and publish results that students see immediately.' },
  { icon: BarChart3, title: 'OBE and reports', text: 'At-risk lists, cohort reports and NBA/NAAC-ready PDF exports for heads and directors.' },
  { icon: MessagesSquare, title: 'Discussions and announcements', text: 'Course discussions with replies, plus announcements from faculty and administration.' },
  { icon: Wallet, title: 'Fees', text: 'Fee records, dues, receipts and compliance reports for the finance office.' },
  { icon: ShieldCheck, title: 'Secure by design', text: 'Role-based access enforced by the server, http-only sessions and audited changes.' },
];

const ROLES = [
  { icon: GraduationCap, title: 'Students', text: 'Courses, attendance, timetable, leave, research and results.', role: 'student' },
  { icon: BookOpen, title: 'Faculty', text: 'Attendance, assessments, students and research supervision.', role: 'faculty' },
  { icon: Users, title: 'Heads of department', text: 'Approvals, events, resources, people and department reports.', role: 'hod' },
  { icon: Landmark, title: 'Directors', text: 'Institute-wide reports, announcements and administration.', role: 'director' },
  { icon: Wallet, title: 'Finance', text: 'Fee records, dues, receipts and compliance.', role: 'finance' },
  { icon: Building2, title: 'Institute SPOC', text: 'College setup, ID formats, people and subscription.', role: 'spoc' },
];

const MODULES = [
  { key: 'research', label: 'Research' },
  { key: 'fees', label: 'Fees' },
  { key: 'forum', label: 'Forum' },
  { key: 'analytics', label: 'Analytics' },
];

const rupees = (paise) => (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** Illustrative preview of the student dashboard (static, decorative). */
function HeroPreview() {
  const bars = [82, 100, 94, 100, 88];
  return (
    <div className="sp-hero-preview" aria-hidden="true">
      <div className="sp-preview-window">
        <div className="sp-preview-top"><span /><span /><span /></div>
        <div className="sp-preview-body">
          <div className="sp-preview-side">
            <i className="on" /><i /><i /><i /><i />
          </div>
          <div className="sp-preview-main">
            <div className="sp-preview-title">Welcome back</div>
            <div className="sp-preview-tiles">
              <div className="is-navy"><small>CGPA</small><b>8.5</b></div>
              <div><small>Attendance</small><b>96%</b></div>
              <div><small>Courses</small><b>4</b></div>
            </div>
            <div className="sp-preview-chart">
              {bars.map((h, i) => <span key={i} style={{ height: `${h}%`, animationDelay: `${i * 90}ms` }} />)}
            </div>
          </div>
        </div>
      </div>
      <div className="sp-preview-float">
        <small>Leave request</small>
        <b>Approved by HOD</b>
      </div>
    </div>
  );
}

function PlanCards() {
  const plans = useApiResource('/billing/plans');
  if (plans.status === 'failed') return <ErrorState error={plans.error} onRetry={plans.reload} />;
  const list = plans.data?.data || [];

  if (plans.status === 'loading' && !list.length) {
    return (
      <div className="sp-plans" aria-busy="true">
        {[0, 1, 2].map((i) => <div key={i} className="sp-skeleton" style={{ height: 420, borderRadius: 16 }} />)}
      </div>
    );
  }

  return (
    <div className="sp-plans">
      {list.map((plan) => (
        <article key={plan.key} className={`sp-plan${plan.highlighted ? ' is-featured' : ''}`} aria-label={`${plan.name} plan`}>
          {plan.highlighted && <span className="sp-plan-badge">Most popular</span>}
          <div>
            <h3 className="sp-plan-name">{plan.name}</h3>
            <p className="sp-muted" style={{ margin: '4px 0 0' }}>{plan.tagline}</p>
          </div>
          <div>
            <div className="sp-plan-price">{rupees(plan.per_year_paise)}<small>/ year</small></div>
            <div className="sp-plan-note">
              {plan.audience} · about {rupees(plan.per_student_month_paise)} per student per month
              {plan.metrics.term_years > 1 ? ` · ${plan.metrics.term_years}-year term (${rupees(plan.contract_total_paise)} total)` : ''} · incl. GST
            </div>
          </div>
          <ul>
            {plan.features.map((f) => (
              <li key={f}><Check size={16} aria-hidden="true" /> {f}</li>
            ))}
          </ul>
          <Link to={`/onboarding?plan=${plan.key}`} className={`sp-btn${plan.highlighted ? ' is-light' : ''}`}>
            Choose {plan.name}
          </Link>
        </article>
      ))}
    </div>
  );
}

function RangeField({ id, label, value, min, max, step, onChange, suffix }) {
  const fill = `${((value - min) / (max - min)) * 100}%`;
  return (
    <div className="sp-field">
      <label htmlFor={id}>{label}</label>
      <div className="sp-range-row">
        <input id={id} type="range" className="sp-range" min={min} max={max} step={step} value={Math.min(value, max)}
          style={{ '--fill': fill }} onChange={(e) => onChange(Number(e.target.value))} aria-describedby={`${id}-num`} />
        <input id={`${id}-num`} type="number" className="sp-input" min={min} max={100000} value={value}
          aria-label={`${label} (number)`} onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))} />
      </div>
      {suffix && <p className="sp-hint">{suffix}</p>}
    </div>
  );
}

/** Live estimate from the real pricing engine (POST /api/billing/estimate). */
function PriceCalculator() {
  const [metrics, setMetrics] = useState({ student_count: 1000, faculty_count: 60, modules: ['analytics'], term_years: 1 });
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState((s) => ({ ...s, status: 'loading' }));
      api
        .post('/billing/estimate', metrics, { signal: controller.signal })
        .then((res) => setState({ status: 'succeeded', data: res.data, error: null }))
        .catch((err) => {
          if (err.name !== 'AbortError') setState({ status: 'failed', data: null, error: err.message });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [metrics]);

  const toggleModule = (key) =>
    setMetrics((m) => ({ ...m, modules: m.modules.includes(key) ? m.modules.filter((k) => k !== key) : [...m.modules, key] }));

  const q = state.data;

  return (
    <div className="sp-calc">
      <div className="sp-card sp-form" style={{ padding: 24, gap: 20 }}>
        <div>
          <h3 className="sp-card-title" style={{ fontSize: 17 }}>Estimate for your college</h3>
          <p className="sp-muted" style={{ margin: '4px 0 0' }}>Move the sliders or type exact numbers. Core academics are always included.</p>
        </div>
        <RangeField id="calc-students" label="Students" value={metrics.student_count} min={50} max={10000} step={50}
          onChange={(v) => setMetrics((m) => ({ ...m, student_count: v }))} suffix="Pricing is tiered: the more students, the lower the per-student rate." />
        <RangeField id="calc-faculty" label="Faculty" value={metrics.faculty_count} min={0} max={800} step={5}
          onChange={(v) => setMetrics((m) => ({ ...m, faculty_count: v }))} />
        <div className="sp-field">
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sp-text-2)' }}>Add-on modules</span>
          <div className="sp-btn-row">
            {MODULES.map((m) => {
              const on = metrics.modules.includes(m.key);
              return (
                <label key={m.key} className={`sp-toggle-chip${on ? ' is-on' : ''}`}>
                  <input type="checkbox" checked={on} onChange={() => toggleModule(m.key)} />
                  {on && <Check size={14} aria-hidden="true" />} {m.label}
                </label>
              );
            })}
          </div>
        </div>
        <div className="sp-field">
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sp-text-2)' }} id="calc-term-label">Contract term</span>
          <div className="sp-segmented" role="group" aria-labelledby="calc-term-label">
            {[1, 2, 3].map((t) => (
              <button key={t} type="button" aria-pressed={metrics.term_years === t} onClick={() => setMetrics((m) => ({ ...m, term_years: t }))}>
                {t} year{t > 1 ? 's' : ''}{t === 2 ? ' · 5% off' : t === 3 ? ' · 10% off' : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      <aside className="sp-calc-summary" aria-live="polite">
        {state.status === 'failed' && <div className="sp-alert is-error" role="alert">Could not calculate a price: {state.error}</div>}
        {!q && state.status === 'loading' && <div className="sp-skeleton" style={{ height: 180, opacity: 0.3 }} />}
        {q && (
          <div style={{ opacity: state.status === 'loading' ? 0.6 : 1, transition: 'opacity 150ms' }}>
            <div style={{ fontSize: 13, color: '#c7d2ea' }}>Estimated per year (incl. 18% GST)</div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em' }}>{rupees(q.payable_paise)}</div>
            {metrics.term_years > 1 && <div style={{ fontSize: 13, color: '#c7d2ea' }}>{rupees(q.payable_paise * metrics.term_years)} over the {metrics.term_years}-year term</div>}
            <table className="sp-table" style={{ marginTop: 14 }}>
              <tbody>
                {q.lines.map((line, i) => (
                  <tr key={`${line.label}-${i}`}>
                    <td>{line.label}</td>
                    <td className="sp-num">{rupees(line.amount_paise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link to="/onboarding" className="sp-btn is-light" style={{ width: '100%', marginTop: 16 }}>Start onboarding</Link>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function LandingPage() {
  useEffect(() => {
    document.title = 'BarelyPassing — Academic progress and outcome tracking';
  }, []);

  return (
    <>
      <PublicNav />
      <main>
        <div className="sp-hero-band">
          <section className="sp-hero sp-hero-split">
            <div className="sp-hero-copy">
              <span className="sp-eyebrow">Outcome-Based Education platform for institutes</span>
              <h1>Run your campus on one reliable academic platform</h1>
              <p>Attendance, assessments, approvals, fees and accreditation reports — with a dedicated portal for every role, configured to your college's own rules.</p>
              <div className="sp-btn-row">
                <Link to="/login" className="sp-btn is-light">Sign in to your portal</Link>
                <Link to="/onboarding" className="sp-btn is-outline-light">Onboard your institute</Link>
              </div>
            </div>
            <HeroPreview />
          </section>
          <div className="sp-hero-strip">
            <span><strong>7</strong> role-based portals</span>
            <span><strong>Your rules</strong> ID formats, grading, attendance</span>
            <span><strong>4-level</strong> platform support</span>
            <span><strong>Secure</strong> server-enforced access</span>
          </div>
        </div>

        <section className="sp-public-section" id="features" aria-labelledby="features-title">
          <div className="sp-section-intro">
            <h2 id="features-title">Everything an academic year needs</h2>
            <p>Built around the records your institute already keeps.</p>
          </div>
          <div className="sp-grid sp-grid-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="sp-card is-hover" style={{ padding: 24 }}>
                <div className="sp-feature-icon"><Icon size={19} /></div>
                <h3 className="sp-card-title">{title}</h3>
                <p className="sp-muted" style={{ margin: '6px 0 0' }}>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="sp-public-section" id="roles" aria-labelledby="roles-title" style={{ paddingTop: 0 }}>
          <div className="sp-section-intro">
            <h2 id="roles-title">A portal for every role</h2>
            <p>Everyone signs in at one place and lands in the portal for their role.</p>
          </div>
          <div className="sp-grid sp-grid-3">
            {ROLES.map(({ icon: Icon, title, text, role }) => (
              <Link key={title} to={`/login?role=${role}`} className="sp-card is-interactive is-hover" style={{ display: 'flex', gap: 14, textDecoration: 'none', color: 'inherit' }}>
                <div className="sp-feature-icon" style={{ flexShrink: 0, marginBottom: 0 }}><Icon size={19} /></div>
                <div>
                  <h3 className="sp-card-title">{title}</h3>
                  <p className="sp-muted" style={{ margin: '4px 0 0' }}>{text}</p>
                </div>
              </Link>
            ))}
          </div>
          <p className="sp-muted" style={{ textAlign: 'center', marginTop: 20 }}>
            <Headphones size={14} style={{ verticalAlign: -2 }} /> Platform support staff sign in <Link to="/login?role=support">here</Link>.
          </p>
        </section>

        <section className="sp-public-section" id="pricing" aria-labelledby="pricing-title" style={{ paddingTop: 0 }}>
          <div className="sp-section-intro">
            <h2 id="pricing-title">Simple, transparent pricing</h2>
            <p>Priced by your institute's size and the modules you choose. The same engine produces your onboarding quote.</p>
          </div>
          <PlanCards />
          <PriceCalculator />
        </section>

        <section className="sp-public-section" style={{ paddingTop: 0 }}>
          <div className="sp-cta-band">
            <div>
              <h2>Ready to bring your college on board?</h2>
              <p>Set up your institute, ID formats and people in one guided flow.</p>
            </div>
            <div className="sp-btn-row">
              <Link to="/onboarding" className="sp-btn is-light">Start onboarding</Link>
              <Link to="/login" className="sp-btn is-outline-light">Sign in</Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
