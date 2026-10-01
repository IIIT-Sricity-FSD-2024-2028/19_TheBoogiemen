import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Plus } from 'lucide-react';
import { fetchFeeSummary } from '../financeSlice';
import { useApiResource } from '../../../hooks/useApiResource';
import { useMutation } from '../../../hooks/useMutation';
import DataTable from '../../../shared/ui/DataTable';
import Modal from '../../../shared/ui/Modal';
import { LoadingState } from '../../../shared/ui/StatusViews';
import { formatCurrency, formatDate } from '../../../shared/format';
import { FeeStatusBadge, FeesErrorState, FeesGate, PAYMENT_MODES, ReceiptModal, modeLabel, toQuery } from '../feesUi';

const today = () => new Date().toISOString().slice(0, 10);

/** POST /api/fees/:id/payments {amount, mode, reference} — amount must not exceed the balance. */
function PaymentForm({ fee, onClose, onRecorded }) {
  const [form, setForm] = useState({ amount: String(fee.balance), mode: 'cash', reference: '' });
  const [submitted, setSubmitted] = useState(false);
  const [save, { loading, error }] = useMutation();
  const amount = Number(form.amount);

  const errors = {};
  if (!(amount > 0)) errors.amount = 'Enter a positive amount.';
  else if (amount > fee.balance) errors.amount = `Amount cannot exceed the balance of ${formatCurrency(fee.balance)}.`;
  if (!PAYMENT_MODES.some((m) => m.value === form.mode)) errors.mode = 'Choose a payment mode.';
  if (form.mode !== 'cash' && !form.reference.trim()) errors.reference = 'Enter the transaction or cheque reference.';
  const show = (k) => submitted && errors[k];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    const body = { amount: Math.round(amount), mode: form.mode, reference: form.reference.trim() || undefined };
    const res = await save('post', `/fees/${encodeURIComponent(fee.fee_id)}/payments`, body, {
      label: `Recorded ${formatCurrency(body.amount)} from ${fee.student_name || 'a student'}`,
    });
    if (res.ok) onRecorded(res.data);
  };

  return (
    <Modal
      title="Record payment"
      onClose={onClose}
      width={520}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="pay-form" className="sp-btn" disabled={loading}>{loading ? 'Saving...' : 'Record payment'}</button>
        </>
      }
    >
      <form id="pay-form" className="sp-form" onSubmit={submit} noValidate>
        <dl className="sp-details">
          <div><dt>Student</dt><dd>{fee.student_name} <span className="sp-muted">{fee.roll_no}</span></dd></div>
          <div><dt>Fee</dt><dd>{fee.fee_type}</dd></div>
          <div><dt>Total / paid</dt><dd>{formatCurrency(fee.amount)} / {formatCurrency(fee.paid_amount || 0)}</dd></div>
          <div><dt>Balance</dt><dd>{formatCurrency(fee.balance)}</dd></div>
        </dl>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
        <div className="sp-form-row">
          <div className="sp-field">
            <label htmlFor="pay-amount">Amount (INR)</label>
            <input id="pay-amount" type="number" min={1} max={fee.balance} step={1} className="sp-input" value={form.amount} onChange={set('amount')} aria-invalid={!!show('amount')} />
            {show('amount') && <p className="sp-field-error">{errors.amount}</p>}
          </div>
          <div className="sp-field">
            <label htmlFor="pay-mode">Mode</label>
            <select id="pay-mode" className="sp-select" value={form.mode} onChange={set('mode')} aria-invalid={!!show('mode')}>
              {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            {show('mode') && <p className="sp-field-error">{errors.mode}</p>}
          </div>
        </div>
        <div className="sp-field">
          <label htmlFor="pay-ref">Reference {form.mode === 'cash' ? '(optional)' : ''}</label>
          <input id="pay-ref" className="sp-input" maxLength={60} value={form.reference} onChange={set('reference')} placeholder={form.mode === 'cheque' ? 'Cheque number' : 'Transaction ID'} aria-invalid={!!show('reference')} />
          {show('reference') && <p className="sp-field-error">{errors.reference}</p>}
        </div>
      </form>
    </Modal>
  );
}

/** POST /api/fees {student_id, fee_type, amount, due_date, semester?} — student from GET /college/people?role=student. */
function AdHocFeeForm({ onClose, onCreated }) {
  const people = useApiResource('/college/people?role=student');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ student_id: '', fee_type: '', amount: '', due_date: '', semester: '' });
  const [submitted, setSubmitted] = useState(false);
  const [save, { loading, error }] = useMutation();

  const students = useMemo(() => {
    const all = Array.isArray(people.data) ? people.data.filter((p) => p.status !== 'inactive') : [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((p) => [p.name, p.display_id, p.email, p.department_code].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [people.data, search]);
  const chosen = Array.isArray(people.data) ? people.data.find((p) => p.user_id === form.student_id) : null;

  const errors = {};
  if (!form.student_id) errors.student_id = 'Choose a student.';
  if (!form.fee_type.trim()) errors.fee_type = 'Fee type is required.';
  if (!(Number(form.amount) > 0)) errors.amount = 'Enter a positive amount.';
  if (!form.due_date) errors.due_date = 'Choose a due date.';
  if (form.semester && !(Number.isInteger(Number(form.semester)) && Number(form.semester) >= 1 && Number(form.semester) <= 12)) errors.semester = 'Semester must be 1 to 12.';
  const show = (k) => submitted && errors[k];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    const body = {
      student_id: form.student_id,
      fee_type: form.fee_type.trim(),
      amount: Math.round(Number(form.amount)),
      due_date: form.due_date,
      semester: form.semester ? Number(form.semester) : undefined,
    };
    const res = await save('post', '/fees', body, { label: `Added ${body.fee_type} fee for ${chosen?.name || 'a student'}` });
    if (res.ok) onCreated(res.data);
  };

  return (
    <Modal
      title="Add a fee for a student"
      onClose={onClose}
      width={560}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="adhoc-form" className="sp-btn" disabled={loading || people.status !== 'succeeded'}>{loading ? 'Saving...' : 'Add fee'}</button>
        </>
      }
    >
      <form id="adhoc-form" className="sp-form" onSubmit={submit} noValidate>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
        {people.status === 'loading' && <LoadingState label="Loading students..." lines={2} />}
        {people.status === 'failed' && <FeesErrorState error={people.error} onRetry={people.reload} />}
        {people.status === 'succeeded' && (
          <div className="sp-field">
            <label htmlFor="adhoc-student">Student</label>
            <input type="search" className="sp-input" placeholder="Filter by name, roll number or department" aria-label="Filter students" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select id="adhoc-student" className="sp-select" size={6} value={form.student_id} onChange={set('student_id')} aria-invalid={!!show('student_id')}>
              {students.map((p) => (
                <option key={p.user_id} value={p.user_id}>
                  {p.name} · {p.display_id || 'No roll no.'}{p.department_code ? ` · ${p.department_code}` : ''}{p.batch ? ` · ${p.batch}` : ''}
                </option>
              ))}
            </select>
            {students.length === 0 && <p className="sp-hint">No students match that filter.</p>}
            {chosen && <p className="sp-hint">Selected: {chosen.name} ({chosen.display_id}){chosen.semester ? `, semester ${chosen.semester}` : ''}</p>}
            {show('student_id') && <p className="sp-field-error">{errors.student_id}</p>}
          </div>
        )}
        <div className="sp-field">
          <label htmlFor="adhoc-type">Fee type</label>
          <input id="adhoc-type" className="sp-input" maxLength={60} value={form.fee_type} onChange={set('fee_type')} placeholder="For example: Hostel fee, Late fine" aria-invalid={!!show('fee_type')} />
          {show('fee_type') && <p className="sp-field-error">{errors.fee_type}</p>}
        </div>
        <div className="sp-form-row">
          <div className="sp-field">
            <label htmlFor="adhoc-amount">Amount (INR)</label>
            <input id="adhoc-amount" type="number" min={1} step={1} className="sp-input" value={form.amount} onChange={set('amount')} aria-invalid={!!show('amount')} />
            {show('amount') && <p className="sp-field-error">{errors.amount}</p>}
          </div>
          <div className="sp-field">
            <label htmlFor="adhoc-due">Due date</label>
            <input id="adhoc-due" type="date" min={today()} className="sp-input" value={form.due_date} onChange={set('due_date')} aria-invalid={!!show('due_date')} />
            {show('due_date') && <p className="sp-field-error">{errors.due_date}</p>}
          </div>
          <div className="sp-field">
            <label htmlFor="adhoc-sem">Semester (optional)</label>
            <input id="adhoc-sem" type="number" min={1} max={12} className="sp-input" value={form.semester} onChange={set('semester')} placeholder={chosen?.semester ? String(chosen.semester) : ''} aria-invalid={!!show('semester')} />
            {show('semester') && <p className="sp-field-error">{errors.semester}</p>}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function Records() {
  const dispatch = useDispatch();
  const [filters, setFilters] = useState({ status: '', department_id: '', overdue: false });
  const fees = useApiResource(`/fees${toQuery({ status: filters.status, department_id: filters.department_id, overdue: filters.overdue ? 'true' : '' })}`);
  const departments = useApiResource('/college/departments');
  const [paying, setPaying] = useState(null);
  const [adding, setAdding] = useState(false);
  const [receiptId, setReceiptId] = useState(null);
  const [notice, setNotice] = useState(null);

  const closePay = useCallback(() => setPaying(null), []);
  const closeAdd = useCallback(() => setAdding(false), []);
  const closeReceipt = useCallback(() => setReceiptId(null), []);
  const setFilter = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const columns = useMemo(
    () => [
      {
        key: 'student_name',
        header: 'Student',
        value: (r) => `${r.student_name} ${r.roll_no || ''}`,
        render: (r) => (
          <>
            {r.student_name}
            <div className="sp-card-meta">{r.roll_no}{r.department_code ? ` · ${r.department_code}` : ''}{r.section ? ` · Sec ${r.section}` : ''}</div>
          </>
        ),
        csv: (r) => `${r.student_name} (${r.roll_no || '-'})`,
      },
      { key: 'fee_type', header: 'Fee', render: (r) => <>{r.fee_type}{r.semester ? <div className="sp-card-meta">Semester {r.semester}</div> : null}</> },
      { key: 'amount', header: 'Amount', align: 'right', render: (r) => formatCurrency(r.amount) },
      { key: 'paid_amount', header: 'Paid', align: 'right', value: (r) => r.paid_amount || 0, render: (r) => formatCurrency(r.paid_amount || 0) },
      { key: 'balance', header: 'Balance', align: 'right', render: (r) => formatCurrency(r.balance) },
      { key: 'due_date', header: 'Due', render: (r) => formatDate(r.due_date) },
      { key: 'status', header: 'Status', value: (r) => (r.status !== 'paid' && r.overdue ? 'overdue' : r.status), render: (r) => <FeeStatusBadge fee={r} /> },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        value: () => '',
        render: (r) => (
          <div className="sp-btn-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
            {r.balance > 0 && <button type="button" className="sp-btn is-small" onClick={() => setPaying(r)}>Record payment</button>}
            {Array.isArray(r.payments) && r.payments.length > 0 && (
              <button type="button" className="sp-btn is-small is-secondary" onClick={() => setReceiptId(r.payments[r.payments.length - 1].payment_id)}>
                Receipt
              </button>
            )}
          </div>
        ),
      },
    ],
    []
  );

  const deptList = Array.isArray(departments.data) ? departments.data : [];

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Fee records</h1>
          <p className="sp-page-subtitle">Every fee billed to a student, with what has been paid. Record counter payments here.</p>
        </div>
        <button type="button" className="sp-btn" onClick={() => setAdding(true)}><Plus size={15} /> Add fee</button>
      </div>

      {notice && (
        <div className="sp-alert is-success" role="status" style={{ marginBottom: 16 }}>
          <span>{notice.text}</span>
          {notice.paymentId && <button type="button" className="sp-link-btn" onClick={() => setReceiptId(notice.paymentId)}>View receipt</button>}
          <button type="button" className="sp-link-btn" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      <div className="fin-filters" role="group" aria-label="Filter fee records">
        <div className="sp-field">
          <label htmlFor="fr-status">Status</label>
          <select id="fr-status" className="sp-select" value={filters.status} onChange={setFilter('status')}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partly paid</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div className="sp-field">
          <label htmlFor="fr-dept">Department</label>
          <select id="fr-dept" className="sp-select" value={filters.department_id} onChange={setFilter('department_id')} disabled={departments.status !== 'succeeded'}>
            <option value="">All departments</option>
            {deptList.map((d) => <option key={d.department_id} value={d.department_id}>{d.department_code} · {d.department_name}</option>)}
          </select>
          {departments.status === 'failed' && <p className="sp-field-error">Could not load departments. <button type="button" className="sp-link-btn" onClick={departments.reload}>Retry</button></p>}
        </div>
        <label className="sp-checkbox" style={{ alignSelf: 'end', paddingBottom: 10 }}>
          <input type="checkbox" checked={filters.overdue} onChange={setFilter('overdue')} /> Overdue only
        </label>
      </div>

      {fees.status === 'loading' && <LoadingState label="Loading fee records..." lines={5} />}
      {fees.status === 'failed' && <FeesErrorState error={fees.error} onRetry={fees.reload} />}
      {fees.status === 'succeeded' && (
        <DataTable
          columns={columns}
          rows={Array.isArray(fees.data) ? fees.data : []}
          rowKey={(r) => r.fee_id}
          searchPlaceholder="Search student, roll no. or fee"
          csvName="fee-records"
          emptyTitle="No fee records"
          emptyMessage={filters.status || filters.department_id || filters.overdue ? 'No fees match these filters.' : 'Generate fees from a fee structure, or add a fee for a student.'}
          caption="Fee records"
        />
      )}

      {paying && (
        <PaymentForm
          fee={paying}
          onClose={closePay}
          onRecorded={(data) => {
            setPaying(null);
            setNotice({ text: `Recorded ${formatCurrency(data?.payment?.amount)} (${modeLabel(data?.payment?.mode)}), receipt ${data?.payment?.receipt_no}.`, paymentId: data?.payment?.payment_id });
            fees.reload();
            dispatch(fetchFeeSummary({ force: true }));
          }}
        />
      )}
      {adding && (
        <AdHocFeeForm
          onClose={closeAdd}
          onCreated={(row) => {
            setAdding(false);
            setNotice({ text: `Added ${row?.fee_type || 'fee'} of ${formatCurrency(row?.amount)} for ${row?.student_name || 'the student'}.` });
            fees.reload();
            dispatch(fetchFeeSummary({ force: true }));
          }}
        />
      )}
      {receiptId && <ReceiptModal paymentId={receiptId} onClose={closeReceipt} />}
    </>
  );
}

export default function FeeRecords() {
  return (
    <FeesGate>
      <Records />
    </FeesGate>
  );
}
