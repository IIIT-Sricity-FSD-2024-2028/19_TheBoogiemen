import React from 'react';
import { Check, FlaskConical } from 'lucide-react';
import PasswordField, { POLICY_TEXT } from '../auth/PasswordField';

export const MODULES = [
  { key: 'research', label: 'Research and BTP', text: 'Project tracking and submissions' },
  { key: 'analytics', label: 'OBE analytics', text: 'At-risk and outcome reports' },
  { key: 'fees', label: 'Fees and finance', text: 'Fee records, dues and receipts' },
  { key: 'forum', label: 'Discussion forum', text: 'Course discussions' },
];

export const rupees = (paise) =>
  typeof paise === 'number' ? (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }) : '';

const TYPE_LABEL = { government: 'Government', private: 'Private', deemed: 'Deemed university' };

function Field({ id, label, error, hint, children }) {
  return (
    <div className="sp-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <p className="sp-field-error" id={`${id}-error`}>{error}</p> : hint ? <p className="sp-hint">{hint}</p> : null}
    </div>
  );
}

export function InstituteStep({ value, onChange, errors, locked }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <fieldset className="sp-form" style={{ border: 0, padding: 0, margin: 0 }} disabled={locked}>
      <legend className="sp-visually-hidden">Institute details</legend>
      <Field id="ob-name" label="Institute name *" error={errors.name}>
        <input id="ob-name" className="sp-input" value={value.name} onChange={set('name')} maxLength={160} autoComplete="organization" aria-invalid={!!errors.name} />
      </Field>
      <div className="sp-form-row">
        <Field id="ob-code" label="Short code (optional)" error={errors.code} hint="2-10 letters or digits, e.g. SXCE. Used in IDs and reports; you can change it during setup.">
          <input id="ob-code" className="sp-input" value={value.code} onChange={set('code')} maxLength={10} style={{ textTransform: 'uppercase' }} aria-invalid={!!errors.code} />
        </Field>
        <Field id="ob-type" label="Type">
          <select id="ob-type" className="sp-select" value={value.type} onChange={set('type')}>
            <option value="">Select</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>
      <div className="sp-form-row">
        <Field id="ob-city" label="City">
          <input id="ob-city" className="sp-input" value={value.city} onChange={set('city')} maxLength={80} autoComplete="address-level2" />
        </Field>
        <Field id="ob-state" label="State">
          <input id="ob-state" className="sp-input" value={value.state} onChange={set('state')} maxLength={80} autoComplete="address-level1" />
        </Field>
      </div>
    </fieldset>
  );
}

export function AccountStep({ value, onChange, password, confirm, onPassword, onConfirm, errors, locked }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <fieldset className="sp-form" style={{ border: 0, padding: 0, margin: 0 }} disabled={locked}>
      <legend className="sp-visually-hidden">SPOC account</legend>
      <div className="sp-form-row">
        <Field id="ob-first" label="First name *" error={errors.first_name}>
          <input id="ob-first" className="sp-input" value={value.first_name} onChange={set('first_name')} maxLength={80} autoComplete="given-name" aria-invalid={!!errors.first_name} />
        </Field>
        <Field id="ob-last" label="Last name">
          <input id="ob-last" className="sp-input" value={value.last_name} onChange={set('last_name')} maxLength={80} autoComplete="family-name" />
        </Field>
      </div>
      <div className="sp-form-row">
        <Field id="ob-email" label="Work email *" error={errors.email} hint="This becomes the SPOC sign-in.">
          <input id="ob-email" type="email" className="sp-input" value={value.email} onChange={set('email')} autoComplete="username" aria-invalid={!!errors.email} />
        </Field>
        <Field id="ob-phone" label="Phone" error={errors.phone}>
          <input id="ob-phone" type="tel" className="sp-input" value={value.phone} onChange={set('phone')} maxLength={20} autoComplete="tel" aria-invalid={!!errors.phone} />
        </Field>
      </div>
      {!locked && (
        <div className="sp-form-row">
          <PasswordField id="ob-password" label="Password *" value={password} onChange={(e) => onPassword(e.target.value)} autoComplete="new-password" error={errors.password} hint={POLICY_TEXT} />
          <PasswordField id="ob-confirm" label="Confirm password *" value={confirm} onChange={(e) => onConfirm(e.target.value)} autoComplete="new-password" error={errors.confirm} />
        </div>
      )}
    </fieldset>
  );
}

export function SizeStep({ metrics, onChange, plans, presetKey, errors }) {
  const toggle = (key) => onChange({ ...metrics, modules: metrics.modules.includes(key) ? metrics.modules.filter((k) => k !== key) : [...metrics.modules, key] });
  const number = (k) => (e) => onChange({ ...metrics, [k]: e.target.value === '' ? '' : Number(e.target.value) });
  return (
    <div className="sp-form" style={{ gap: 20 }}>
      {plans.length > 0 && (
        <div className="sp-field">
          <span id="ob-presets" style={{ fontSize: 13, fontWeight: 600, color: 'var(--sp-text-2)' }}>Start from a plan</span>
          <div className="ob-presets" role="group" aria-labelledby="ob-presets">
            {plans.map((p) => (
              <button key={p.key} type="button" className="ob-preset" aria-pressed={presetKey === p.key} onClick={() => onChange({ ...p.metrics, modules: [...p.metrics.modules] })}>
                <strong>{p.name}</strong>
                <span>{p.audience}</span>
              </button>
            ))}
          </div>
          <p className="sp-hint">Plans are starting points. Adjust the numbers below to your college's size.</p>
        </div>
      )}
      <div className="sp-form-row">
        <Field id="ob-students" label="Student seats *" error={errors.student_count} hint="Active student accounts you can have.">
          <input id="ob-students" type="number" min={1} max={100000} className="sp-input" value={metrics.student_count} onChange={number('student_count')} aria-invalid={!!errors.student_count} />
        </Field>
        <Field id="ob-faculty" label="Faculty seats *" error={errors.faculty_count} hint="Faculty and HOD accounts.">
          <input id="ob-faculty" type="number" min={0} max={10000} className="sp-input" value={metrics.faculty_count} onChange={number('faculty_count')} aria-invalid={!!errors.faculty_count} />
        </Field>
      </div>
      <div className="sp-field">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sp-text-2)' }}>Add-on modules</span>
        <div className="sp-btn-row">
          {MODULES.map((m) => {
            const on = metrics.modules.includes(m.key);
            return (
              <label key={m.key} className={`sp-toggle-chip${on ? ' is-on' : ''}`} title={m.text}>
                <input type="checkbox" checked={on} onChange={() => toggle(m.key)} />
                {on && <Check size={14} aria-hidden="true" />} {m.label}
              </label>
            );
          })}
        </div>
        <p className="sp-hint">Core academics (attendance, courses, assessments, leave) are always included.</p>
      </div>
      <div className="sp-field">
        <span id="ob-term" style={{ fontSize: 13, fontWeight: 600, color: 'var(--sp-text-2)' }}>Contract term</span>
        <div className="sp-segmented" role="group" aria-labelledby="ob-term">
          {[1, 2, 3].map((t) => (
            <button key={t} type="button" aria-pressed={metrics.term_years === t} onClick={() => onChange({ ...metrics, term_years: t })}>
              {t} year{t > 1 ? 's' : ''}
            </button>
          ))}
        </div>
        <p className="sp-hint">Longer terms earn a discount, shown in the price breakdown.</p>
      </div>
    </div>
  );
}

export function ReviewStep({ institute, account, quote }) {
  const m = quote.metrics;
  return (
    <div className="sp-form" style={{ gap: 20 }}>
      <div>
        <h3 className="sp-section-title">Institute</h3>
        <dl className="sp-details">
          <div><dt>Name</dt><dd>{institute.name}</dd></div>
          <div><dt>Code</dt><dd>{institute.code ? institute.code.toUpperCase() : 'Generated from the name'}</dd></div>
          <div><dt>Location</dt><dd>{[institute.city, institute.state].filter(Boolean).join(', ') || 'Not provided'}</dd></div>
          <div><dt>Type</dt><dd>{TYPE_LABEL[institute.type] || 'Not provided'}</dd></div>
        </dl>
      </div>
      <div>
        <h3 className="sp-section-title">SPOC account</h3>
        <dl className="sp-details">
          <div><dt>Name</dt><dd>{[account.first_name, account.last_name].filter(Boolean).join(' ')}</dd></div>
          <div><dt>Sign-in email</dt><dd style={{ wordBreak: 'break-all' }}>{account.email}</dd></div>
          <div><dt>Phone</dt><dd>{account.phone || 'Not provided'}</dd></div>
        </dl>
      </div>
      <div>
        <h3 className="sp-section-title">Subscription</h3>
        <dl className="sp-details">
          <div><dt>Student seats</dt><dd>{m.student_count.toLocaleString('en-IN')}</dd></div>
          <div><dt>Faculty seats</dt><dd>{m.faculty_count.toLocaleString('en-IN')}</dd></div>
          <div><dt>Modules</dt><dd>{m.modules.length ? m.modules.map((k) => MODULES.find((x) => x.key === k)?.label || k).join(', ') : 'Core academics only'}</dd></div>
          <div><dt>Term</dt><dd>{m.term_years} year{m.term_years > 1 ? 's' : ''}</dd></div>
        </dl>
      </div>
    </div>
  );
}

export function PaymentStep({ order, amountPaise, failed }) {
  return (
    <div className="sp-form" style={{ gap: 18 }}>
      <div className="ob-test" role="note">
        <FlaskConical size={20} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Test mode</strong>
          No real payment is taken and no card or bank details are collected. The buttons below simulate the payment
          provider's response so the rest of the flow can be completed.
        </div>
      </div>
      <div className="ob-order">
        <span className="sp-muted" style={{ fontSize: 13 }}>
          {order ? <>Order <span className="sp-code">{order.order_id}</span></> : 'No open order'}
        </span>
        <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>{rupees(order ? order.amount_paise : amountPaise)}</span>
        <span className="sp-muted" style={{ fontSize: 13 }}>Annual amount including GST (test charge)</span>
      </div>
      {failed && (
        <div className="sp-alert is-error" role="alert">
          <span>The simulated payment failed. Your quote is still valid; nothing has been created. You can try again.</span>
        </div>
      )}
    </div>
  );
}

/** Navy price panel: live estimate while editing, committed quote afterwards. */
export function QuoteSummary({ quote, status, error, committed }) {
  return (
    <aside className="ob-summary" aria-live="polite" aria-label="Price">
      {status === 'failed' && <div className="sp-alert is-error" role="alert"><span>Could not calculate a price: {error}</span></div>}
      {!quote && status === 'loading' && <div className="sp-skeleton" style={{ height: 180, opacity: 0.3 }} />}
      {!quote && status === 'idle' && <p className="ob-summary-label" style={{ margin: 0 }}>Enter valid seat numbers to see a price.</p>}
      {quote && (
        <div style={{ opacity: status === 'loading' ? 0.6 : 1, transition: 'opacity 150ms' }}>
          <div className="ob-summary-label">{committed ? 'Your quote' : 'Estimate'} · per year, incl. GST</div>
          <div className="ob-summary-price">{rupees(quote.payable_paise)}</div>
          {quote.metrics.term_years > 1 && (
            <div className="ob-summary-label">{rupees(quote.payable_paise * quote.metrics.term_years)} over the {quote.metrics.term_years}-year term</div>
          )}
          <table className="sp-table" style={{ marginTop: 14 }}>
            <caption className="sp-visually-hidden">Price breakdown</caption>
            <tbody>
              {quote.lines.map((line) => (
                <tr key={line.label}>
                  <td>{line.label}</td>
                  <td className="sp-num">{rupees(line.amount_paise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ob-summary-label" style={{ margin: '12px 0 0' }}>
            {committed ? 'This quote is held for your onboarding session.' : 'The same pricing engine produces your final quote.'}
          </p>
        </div>
      )}
    </aside>
  );
}
