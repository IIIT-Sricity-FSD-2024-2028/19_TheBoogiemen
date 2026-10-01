import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Trash2, Users, X } from 'lucide-react';
import { fetchFeeStructures, fetchFeeSummary, selectFinanceResource } from '../financeSlice';
import { useApiResource } from '../../../hooks/useApiResource';
import { useMutation } from '../../../hooks/useMutation';
import Modal, { ConfirmDialog } from '../../../shared/ui/Modal';
import { EmptyState, LoadingState } from '../../../shared/ui/StatusViews';
import { formatCurrency, formatDate } from '../../../shared/format';
import { FeesErrorState, FeesGate } from '../feesUi';

const blankComponent = () => ({ name: '', amount: '' });

/** POST /api/fees/structures {name, batch_id, semester, due_date, components:[{name, amount}]} */
function StructureForm({ settings, onClose, onCreated }) {
  const programmes = settings?.programmes || [];
  const batches = settings?.batches || [];
  const [form, setForm] = useState({
    name: '',
    programme_id: programmes.length === 1 ? programmes[0].programme_id : '',
    batch_id: '',
    semester: '',
    due_date: '',
    components: [blankComponent()],
  });
  const [submitted, setSubmitted] = useState(false);
  const [save, { loading, error }] = useMutation();

  const batchOptions = batches.filter((b) => !form.programme_id || b.programme_id === form.programme_id);
  const total = form.components.reduce((s, c) => s + (Number(c.amount) > 0 ? Math.round(Number(c.amount)) : 0), 0);

  const errors = {};
  if (!form.name.trim()) errors.name = 'Name is required.';
  if (!form.batch_id) errors.batch_id = 'Choose a batch.';
  const sem = Number(form.semester);
  if (!Number.isInteger(sem) || sem < 1 || sem > 12) errors.semester = 'Semester must be 1 to 12.';
  if (!form.due_date) errors.due_date = 'Choose a due date.';
  const componentErrors = form.components.map((c) => ({
    name: !c.name.trim() ? 'Name required.' : null,
    amount: !(Number(c.amount) > 0) ? 'Enter a positive amount.' : null,
  }));
  if (componentErrors.some((c) => c.name || c.amount)) errors.components = true;
  const show = (k) => submitted && errors[k];

  const set = (k) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: value };
      if (k === 'programme_id') next.batch_id = '';
      if (k === 'batch_id' && !f.semester) {
        const b = batches.find((x) => x.batch_id === value);
        if (b?.current_semester) next.semester = String(b.current_semester);
      }
      return next;
    });
  };
  const setComponent = (i, k) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, components: f.components.map((c, j) => (j === i ? { ...c, [k]: value } : c)) }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    const body = {
      name: form.name.trim(),
      batch_id: form.batch_id,
      semester: sem,
      due_date: form.due_date,
      components: form.components.map((c) => ({ name: c.name.trim(), amount: Math.round(Number(c.amount)) })),
    };
    const res = await save('post', '/fees/structures', body, { label: `Created fee structure "${body.name}"` });
    if (res.ok) onCreated(res.data);
  };

  return (
    <Modal
      title="New fee structure"
      onClose={onClose}
      width={640}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="fs-form" className="sp-btn" disabled={loading}>{loading ? 'Saving...' : 'Create structure'}</button>
        </>
      }
    >
      <form id="fs-form" className="sp-form" onSubmit={submit} noValidate>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
        <div className="sp-field">
          <label htmlFor="fs-name">Name</label>
          <input id="fs-name" className="sp-input" maxLength={80} value={form.name} onChange={set('name')} placeholder="For example: B.Tech semester 5 fees" aria-invalid={!!show('name')} />
          {show('name') && <p className="sp-field-error">{errors.name}</p>}
        </div>
        <div className="sp-form-row">
          <div className="sp-field">
            <label htmlFor="fs-prog">Programme</label>
            <select id="fs-prog" className="sp-select" value={form.programme_id} onChange={set('programme_id')}>
              <option value="">All programmes</option>
              {programmes.map((p) => <option key={p.programme_id} value={p.programme_id}>{p.name}</option>)}
            </select>
          </div>
          <div className="sp-field">
            <label htmlFor="fs-batch">Batch</label>
            <select id="fs-batch" className="sp-select" value={form.batch_id} onChange={set('batch_id')} aria-invalid={!!show('batch_id')}>
              <option value="">Choose a batch</option>
              {batchOptions.map((b) => <option key={b.batch_id} value={b.batch_id}>{b.label}</option>)}
            </select>
            {show('batch_id') && <p className="sp-field-error">{errors.batch_id}</p>}
            {batches.length === 0 && <p className="sp-hint">No batches are set up yet. Your SPOC adds them under college settings.</p>}
          </div>
          <div className="sp-field">
            <label htmlFor="fs-sem">Semester</label>
            <input id="fs-sem" type="number" min={1} max={12} className="sp-input" value={form.semester} onChange={set('semester')} aria-invalid={!!show('semester')} />
            {show('semester') && <p className="sp-field-error">{errors.semester}</p>}
          </div>
          <div className="sp-field">
            <label htmlFor="fs-due">Due date</label>
            <input id="fs-due" type="date" className="sp-input" value={form.due_date} onChange={set('due_date')} aria-invalid={!!show('due_date')} />
            {show('due_date') && <p className="sp-field-error">{errors.due_date}</p>}
          </div>
        </div>

        <fieldset className="fin-fieldset">
          <legend>Fee components</legend>
          {form.components.map((c, i) => (
            <div key={i} className="fin-component-row">
              <div className="sp-field">
                <label htmlFor={`fs-c-name-${i}`} className="sp-visually-hidden">Component {i + 1} name</label>
                <input id={`fs-c-name-${i}`} className="sp-input" maxLength={60} placeholder="Component (e.g. Tuition fee)" value={c.name} onChange={setComponent(i, 'name')} aria-invalid={submitted && !!componentErrors[i].name} />
                {submitted && componentErrors[i].name && <p className="sp-field-error">{componentErrors[i].name}</p>}
              </div>
              <div className="sp-field">
                <label htmlFor={`fs-c-amt-${i}`} className="sp-visually-hidden">Component {i + 1} amount in rupees</label>
                <input id={`fs-c-amt-${i}`} type="number" min={1} step={1} className="sp-input" placeholder="Amount (INR)" value={c.amount} onChange={setComponent(i, 'amount')} aria-invalid={submitted && !!componentErrors[i].amount} />
                {submitted && componentErrors[i].amount && <p className="sp-field-error">{componentErrors[i].amount}</p>}
              </div>
              <button
                type="button"
                className="sp-icon-btn"
                aria-label={`Remove component ${i + 1}`}
                disabled={form.components.length === 1}
                onClick={() => setForm((f) => ({ ...f, components: f.components.filter((_, j) => j !== i) }))}
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <div className="fin-component-foot">
            <button type="button" className="sp-btn is-secondary is-small" onClick={() => setForm((f) => ({ ...f, components: [...f.components, blankComponent()] }))}>
              <Plus size={14} /> Add component
            </button>
            <span>Total <strong>{formatCurrency(total)}</strong></span>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

function Structures() {
  const dispatch = useDispatch();
  const structures = useSelector(selectFinanceResource('structures'));
  const settings = useApiResource('/college/settings');
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState(null); // { kind: 'generate'|'delete', structure }
  const [notice, setNotice] = useState(null);
  const [act, { loading: acting, error: actError, reset }] = useMutation();

  useEffect(() => {
    dispatch(fetchFeeStructures());
  }, [dispatch]);

  const refresh = () => dispatch(fetchFeeStructures({ force: true }));
  const list = useMemo(() => (Array.isArray(structures.data) ? structures.data : []), [structures.data]);

  const closeConfirm = useCallback(() => {
    setConfirm(null);
    reset();
  }, [reset]);
  const closeForm = useCallback(() => setCreating(false), []);

  const runConfirm = async () => {
    const s = confirm.structure;
    if (confirm.kind === 'generate') {
      const res = await act('post', `/fees/structures/${encodeURIComponent(s.structure_id)}/generate`, undefined, { label: `Generated fees from "${s.name}"` });
      if (res.ok) {
        const { created = 0, skipped = 0 } = res.data || {};
        setNotice({
          tone: created > 0 ? 'is-success' : 'is-info',
          text: `${created} fee${created === 1 ? '' : 's'} created from "${s.name}".${skipped ? ` ${skipped} student${skipped === 1 ? '' : 's'} already had this fee and ${skipped === 1 ? 'was' : 'were'} skipped.` : ''}`,
        });
        setConfirm(null);
        refresh();
        dispatch(fetchFeeSummary({ force: true }));
      }
    } else {
      const res = await act('delete', `/fees/structures/${encodeURIComponent(s.structure_id)}`, undefined, { label: `Deleted fee structure "${s.name}"` });
      if (res.ok) {
        setNotice({ tone: 'is-success', text: `Deleted "${s.name}".` });
        setConfirm(null);
        refresh();
      }
    }
  };

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Fee structures</h1>
          <p className="sp-page-subtitle">Define the fee for a batch and semester, then generate a fee record for every active student in that batch.</p>
        </div>
        <button type="button" className="sp-btn" onClick={() => setCreating(true)} disabled={settings.status !== 'succeeded'}>
          <Plus size={15} /> New structure
        </button>
      </div>

      {notice && (
        <div className={`sp-alert ${notice.tone}`} role="status" style={{ marginBottom: 16 }}>
          <span>{notice.text}</span>
          <button type="button" className="sp-link-btn" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}
      {settings.status === 'failed' && (
        <div className="sp-alert is-error" role="alert" style={{ marginBottom: 16 }}>
          <span>Could not load programmes and batches: {settings.error?.message}</span>
          <button type="button" className="sp-link-btn" onClick={settings.reload}>Retry</button>
        </div>
      )}

      {(structures.status === 'idle' || structures.status === 'loading') && <LoadingState label="Loading fee structures..." />}
      {structures.status === 'failed' && <FeesErrorState error={structures.error} onRetry={refresh} />}
      {structures.status === 'succeeded' && list.length === 0 && (
        <div className="sp-card">
          <EmptyState title="No fee structures yet" message="Create a structure for a batch and semester to start billing students.">
            <button type="button" className="sp-btn is-small" onClick={() => setCreating(true)} disabled={settings.status !== 'succeeded'}>New structure</button>
          </EmptyState>
        </div>
      )}
      {list.length > 0 && (
        <div className="sp-grid-2 sp-grid">
          {list.map((s) => (
            <article key={s.structure_id} className="sp-card">
              <div className="sp-card-head">
                <div>
                  <h2 className="sp-card-title">{s.name}</h2>
                  <div className="sp-card-meta">
                    {[s.programme, s.batch && `Batch ${s.batch}`, `Semester ${s.semester}`].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span className={`sp-badge ${s.generated > 0 ? 'is-success' : 'is-neutral'}`}>
                  {s.generated > 0 ? `${s.generated} generated` : 'Not generated'}
                </span>
              </div>
              <div className="sp-table-wrap" style={{ marginTop: 10 }}>
                <table className="sp-table">
                  <thead><tr><th scope="col">Component</th><th scope="col" className="sp-num">Amount</th></tr></thead>
                  <tbody>
                    {(s.components || []).map((c) => (
                      <tr key={c.name}><td>{c.name}</td><td className="sp-num">{formatCurrency(c.amount)}</td></tr>
                    ))}
                    <tr><td><strong>Total</strong></td><td className="sp-num"><strong>{formatCurrency(s.total)}</strong></td></tr>
                  </tbody>
                </table>
              </div>
              <p className="sp-card-meta" style={{ margin: '10px 0' }}>Due {formatDate(s.due_date)}</p>
              <div className="sp-btn-row">
                <button type="button" className="sp-btn is-small" onClick={() => setConfirm({ kind: 'generate', structure: s })}>
                  <Users size={14} /> Generate fees
                </button>
                <button
                  type="button"
                  className="sp-btn is-small is-secondary"
                  onClick={() => setConfirm({ kind: 'delete', structure: s })}
                  disabled={s.generated > 0}
                  title={s.generated > 0 ? 'Fees were generated from this structure, so it cannot be deleted.' : undefined}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
              {s.generated > 0 && <p className="sp-hint" style={{ marginTop: 8 }}>Fees were generated from this structure, so it can no longer be deleted.</p>}
            </article>
          ))}
        </div>
      )}

      {creating && (
        <StructureForm
          settings={settings.data?.settings}
          onClose={closeForm}
          onCreated={(row) => {
            setCreating(false);
            setNotice({ tone: 'is-success', text: `Created "${row?.name || 'fee structure'}". Generate fees to bill the batch.` });
            refresh();
          }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.kind === 'generate' ? 'Generate fees' : 'Delete fee structure'}
          message={
            <>
              {confirm.kind === 'generate'
                ? `Create a ${formatCurrency(confirm.structure.total)} fee for every active student in batch ${confirm.structure.batch || ''} (semester ${confirm.structure.semester}), due ${formatDate(confirm.structure.due_date)}? Students who already have this fee are skipped.`
                : `Delete "${confirm.structure.name}"? This cannot be undone.`}
              {actError && <span className="sp-field-error" style={{ display: 'block', marginTop: 10 }}>{actError.message}</span>}
            </>
          }
          confirmLabel={confirm.kind === 'generate' ? 'Generate' : 'Delete'}
          danger={confirm.kind === 'delete'}
          busy={acting}
          onConfirm={runConfirm}
          onCancel={closeConfirm}
        />
      )}
    </>
  );
}

export default function FeeStructures() {
  return (
    <FeesGate>
      <Structures />
    </FeesGate>
  );
}
