import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, PartyPopper } from 'lucide-react';
import { useApiResource } from '../../../hooks/useApiResource';
import { useMutation } from '../../../hooks/useMutation';
import { ErrorState, LoadingState } from '../../../shared/ui/StatusViews';
import { formatDate } from '../../../shared/format';
import ProfileForm from '../../college/ProfileForm';
import DepartmentsSection from '../../college/DepartmentsSection';
import StructureForm from '../../college/StructureForm';
import IdFormatBuilder from '../../college/IdFormatBuilder';
import GradingForm from '../../college/GradingForm';
import CustomFieldsForm from '../../college/CustomFieldsForm';
import CsvImport from '../../college/CsvImport';
import { api } from '../../../services/apiClient';
import { fetchSpocOverview } from '../spocSlice';

const STEPS = [
  { key: 'profile', flag: 'profile', title: 'Profile and code', intro: 'Confirm your college name and the short code used in IDs and reports.' },
  { key: 'structure', flag: 'structure', title: 'Departments and structure', intro: 'Add departments, then the programmes, batches and sections students belong to.' },
  { key: 'ids', flag: 'id_formats', title: 'ID formats', intro: 'Decide how roll numbers and employee IDs look. New accounts get the next ID automatically.' },
  { key: 'grading', flag: 'grading', title: 'Grading and attendance', intro: 'Set your grade bands, pass mark and the minimum attendance percentage.' },
  { key: 'fields', flag: 'custom_fields', title: 'Custom fields', intro: 'Optional: extra details you record for students or faculty.' },
  { key: 'people', flag: 'people', title: 'Add people', intro: 'Import students, faculty and staff from a CSV file, or add them one at a time later.' },
  { key: 'finish', flag: null, title: 'Finish', intro: 'Review what is ready and complete the setup.' },
];

/**
 * First-time college setup. Each step saves through the same endpoints as the
 * Configuration screen; the server records which steps are done
 * (settings.setup.steps), so the wizard resumes where it was left.
 */
export default function SetupWizard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const res = useApiResource('/college/settings');
  const [fresh, setFresh] = useState(null);
  const [version, setVersion] = useState(0);
  const [index, setIndex] = useState(null);
  const [complete, completion] = useMutation();

  const config = fresh || res.data;
  const setup = config?.settings?.setup || {};
  const flags = setup.steps || {};
  const isDone = (s) => (s.flag ? !!flags[s.flag] : !!setup.completed_at);

  // Resume at the first step the server has not recorded yet.
  useEffect(() => {
    if (index !== null || !res.data) return;
    const done = res.data.settings?.setup?.steps || {};
    const first = STEPS.findIndex((s) => s.flag && !done[s.flag]);
    setIndex(first === -1 ? STEPS.length - 1 : first);
  }, [res.data, index]);

  if (!config && res.status === 'failed') return <div className="sp-card"><ErrorState error={res.error} onRetry={res.reload} /></div>;
  if (!config || index === null) return <div className="sp-card"><LoadingState label="Loading setup" lines={6} /></div>;

  const step = STEPS[index];
  const go = (i) => {
    setIndex(Math.max(0, Math.min(STEPS.length - 1, i)));
    completion.reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const refreshOverview = () => dispatch(fetchSpocOverview({ force: true }));

  // Settings PUTs return the full settings payload; the profile PUT returns the college.
  const saved = (data, advance = true) => {
    setFresh(data?.settings ? data : { ...config, college: data, settings: { ...config.settings, setup: { ...setup, steps: { ...flags, profile: true } } } });
    refreshOverview();
    if (advance) {
      // Remount the forms on the server's normalised values (e.g. new batch ids).
      setVersion((v) => v + 1);
      go(index + 1);
    }
  };
  // Refetch after a change made outside the step forms (departments, CSV
  // import). The current settings stay on screen until the new ones arrive, so
  // the step is never unmounted mid-task (an import result holds one-time
  // passwords that must not disappear).
  const reloadSettings = async () => {
    refreshOverview();
    try {
      setFresh(await api.get('/college/settings'));
    } catch {
      setFresh(null);
      res.reload();
    }
  };

  const finish = async () => {
    const r = await complete('post', '/college/settings/complete-setup', undefined, { label: 'Completed college setup' });
    if (r.ok) {
      setFresh(r.data);
      refreshOverview();
    }
  };

  const formProps = { config, canEdit: true };
  const departments = config.departments || [];
  const required = [
    { label: 'At least one department', ok: departments.length > 0, step: 1 },
    { label: 'At least one programme', ok: (config.settings.programmes || []).length > 0, step: 1 },
    { label: 'At least one batch', ok: (config.settings.batches || []).length > 0, step: 1 },
  ];
  const ready = required.every((r) => r.ok);

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Set up your college</h1>
          <p className="sp-page-subtitle">
            {setup.completed_at ? `Setup completed on ${formatDate(setup.completed_at)}. You can revisit any step.` : `Step ${index + 1} of ${STEPS.length} · progress is saved as you go`}
          </p>
        </div>
      </div>

      <div className="spoc-wizard">
        <nav className="sp-card" aria-label="Setup steps" style={{ padding: 10 }}>
          <ol className="spoc-steps">
            {STEPS.map((s, i) => (
              <li key={s.key}>
                <button type="button" className={`spoc-step${isDone(s) ? ' is-done' : ''}`} aria-current={i === index ? 'step' : undefined} onClick={() => go(i)}>
                  <span className="spoc-step-num" aria-hidden="true">{isDone(s) ? <Check size={13} /> : i + 1}</span>
                  {s.title}
                  {isDone(s) && <span className="sp-visually-hidden"> (done)</span>}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <section className="sp-card" aria-labelledby="wiz-title">
          <h2 id="wiz-title" className="sp-section-title" style={{ fontSize: 18 }}>{step.title}</h2>
          <p className="sp-muted" style={{ margin: '4px 0 18px' }}>{step.intro}</p>

          <div key={`${step.key}-${version}`}>
            {step.key === 'profile' && <ProfileForm {...formProps} onSaved={(d) => saved(d)} submitLabel="Save and continue" />}

            {step.key === 'structure' && (
              <div className="sp-form" style={{ gap: 26 }}>
                <div>
                  <h3 className="sp-section-title">Departments</h3>
                  <DepartmentsSection canEdit onChanged={reloadSettings} />
                </div>
                <StructureForm {...formProps} onSaved={(d) => saved(d)} submitLabel="Save and continue" />
              </div>
            )}

            {step.key === 'ids' && <IdFormatBuilder {...formProps} onSaved={(d) => saved(d, false)} />}
            {step.key === 'grading' && <GradingForm {...formProps} onSaved={(d) => saved(d)} submitLabel="Save and continue" />}
            {step.key === 'fields' && <CustomFieldsForm {...formProps} onSaved={(d) => saved(d)} submitLabel="Save and continue" />}

            {step.key === 'people' && (
              ready ? (
                <div className="sp-form">
                  <CsvImport config={config} onImported={reloadSettings} />
                  <p className="sp-hint" style={{ margin: 0 }}>
                    Prefer to add people one at a time? Use <Link to="/spoc/people">People</Link> after finishing setup. You can also skip this step for now.
                  </p>
                </div>
              ) : (
                <div className="sp-alert is-warning" role="note">
                  <span>People need a department, and students need a batch. Add at least one department, programme and batch first.</span>
                  <button type="button" className="sp-link-btn" onClick={() => go(1)}>Go to structure</button>
                </div>
              )
            )}

            {step.key === 'finish' && (
              <div className="sp-form">
                {setup.completed_at ? (
                  <div className="sp-alert is-success" role="status">
                    <span><PartyPopper size={16} aria-hidden="true" /> Setup is complete. Your college is ready to use.</span>
                  </div>
                ) : (
                  <p style={{ margin: 0 }}>These are required before setup can be completed:</p>
                )}
                <ul className="spoc-checklist">
                  {required.map((r) => (
                    <li key={r.label}>
                      <span className={`spoc-check${r.ok ? ' is-done' : ''}`} aria-hidden="true"><Check size={13} /></span>
                      <span>{r.label}</span>
                      {!r.ok && <button type="button" className="sp-link-btn" onClick={() => go(r.step)}>Add now</button>}
                      <span className="sp-visually-hidden">{r.ok ? '(done)' : '(missing)'}</span>
                    </li>
                  ))}
                </ul>
                <dl className="sp-details">
                  <div><dt>College</dt><dd>{config.college?.name} ({config.college?.code})</dd></div>
                  <div><dt>Departments</dt><dd>{departments.length}</dd></div>
                  <div><dt>Programmes</dt><dd>{(config.settings.programmes || []).length}</dd></div>
                  <div><dt>Batches</dt><dd>{(config.settings.batches || []).length}</dd></div>
                  <div><dt>Sections</dt><dd>{(config.settings.sections || []).join(', ') || 'None'}</dd></div>
                  <div><dt>Student ID example</dt><dd><span className="sp-code">{config.previews?.student || 'Not available'}</span></dd></div>
                  <div><dt>Minimum attendance</dt><dd>{config.settings.attendance_min_pct}%</dd></div>
                  <div><dt>Custom fields</dt><dd>{(config.settings.custom_fields || []).length}</dd></div>
                </dl>
                {completion.error && <div className="sp-alert is-error" role="alert">{completion.error.message}</div>}
                <div className="sp-btn-row">
                  {setup.completed_at ? (
                    <button type="button" className="sp-btn" onClick={() => navigate('/spoc')}>Go to dashboard</button>
                  ) : (
                    <button type="button" className="sp-btn" onClick={finish} disabled={!ready || completion.loading}>
                      {completion.loading ? 'Finishing...' : 'Complete setup'}
                    </button>
                  )}
                  <Link to="/spoc/people" className="sp-btn is-secondary">Manage people</Link>
                </div>
              </div>
            )}
          </div>

          <div className="spoc-wizard-nav">
            <button type="button" className="sp-btn is-secondary" onClick={() => go(index - 1)} disabled={index === 0}><ArrowLeft size={15} /> Back</button>
            {index < STEPS.length - 1 && (
              <button type="button" className="sp-btn is-secondary" onClick={() => go(index + 1)}>
                {['ids', 'people'].includes(step.key) || isDone(step) ? 'Continue' : 'Skip for now'} <ArrowRight size={15} />
              </button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
