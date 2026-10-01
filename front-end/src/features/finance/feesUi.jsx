import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Download, Lock } from 'lucide-react';
import { selectCurrentUser } from '../auth/authSlice';
import { useApiResource } from '../../hooks/useApiResource';
import { downloadFile } from '../../services/apiClient';
import { apiRequestFailed } from '../../app/apiActions';
import Modal from '../../shared/ui/Modal';
import { ErrorState, LoadingState } from '../../shared/ui/StatusViews';
import { capitalize, formatCurrency, formatDate, formatDateTime } from '../../shared/format';

/**
 * Building blocks shared by the Finance Portal sections and the student Fees
 * section: module gating, status badges, currency count-up and the receipt
 * viewer (JSON receipt + PDF download).
 */

export const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
];

export function modeLabel(mode) {
  if (mode === 'online_test') return 'Online (test mode)';
  return PAYMENT_MODES.find((m) => m.value === mode)?.label || capitalize(String(mode || '').replace(/_/g, ' '));
}

/** True unless the signed-in user's college is known not to have the fees module. */
export function useFeesLicensed() {
  const user = useSelector(selectCurrentUser);
  const modules = user?.modules;
  return !Array.isArray(modules) || modules.includes('fees');
}

/** A 403 from @RequiresModule('fees') (code MODULE_NOT_LICENSED; message names the plan). */
export function isModuleError(error) {
  return error?.status === 403 && /plan/i.test(String(error?.message || ''));
}

export function NotInPlan({ module = 'Fees' }) {
  return (
    <div className="sp-card">
      <div className="sp-state">
        <div className="sp-tile-icon" aria-hidden="true" style={{ margin: '0 auto 12px' }}><Lock size={19} /></div>
        <p className="sp-state-title">{module} module not in your plan</p>
        <p>
          Your institution&apos;s subscription does not include the {module.toLowerCase()} module, so fee structures,
          fee records and payments are not available. Your college SPOC can add it to the plan.
        </p>
      </div>
    </div>
  );
}

/** Renders children only when the fees module is licensed. */
export function FeesGate({ children }) {
  const licensed = useFeesLicensed();
  if (!licensed) return <NotInPlan />;
  return children;
}

/** ErrorState, except a module-not-licensed 403 shows the plan message instead. */
export function FeesErrorState({ error, onRetry }) {
  if (isModuleError(error)) return <NotInPlan />;
  return <ErrorState error={error} onRetry={onRetry} />;
}

export function FeeStatusBadge({ fee }) {
  if (fee.status !== 'paid' && fee.overdue) return <span className="sp-badge is-danger">Overdue</span>;
  if (fee.status === 'paid') return <span className="sp-badge is-success">Paid</span>;
  if (fee.status === 'partial') return <span className="sp-badge is-warning">Partly paid</span>;
  return <span className="sp-badge is-neutral">{capitalize(fee.status || 'pending')}</span>;
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** CountUp for rupee amounts: animates the number, formats with formatCurrency. */
export function CurrencyCountUp({ value, duration = 700 }) {
  const numeric = typeof value === 'number' && Number.isFinite(value);
  const [shown, setShown] = useState(numeric && !reducedMotion() ? 0 : value);
  const frame = useRef(null);
  useEffect(() => {
    if (!numeric || reducedMotion()) {
      setShown(value);
      return undefined;
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, numeric, duration]);
  if (!numeric) return <>{formatCurrency(value)}</>;
  return <span aria-label={formatCurrency(value)}>{formatCurrency(shown)}</span>;
}

/** Downloads the PDF receipt; returns [download, { busy, error }]. */
export function useReceiptPdf() {
  const dispatch = useDispatch();
  const [state, setState] = useState({ busy: null, error: null });
  const download = useCallback(
    async (payment) => {
      const path = `/fees/payments/${encodeURIComponent(payment.payment_id)}/receipt?format=pdf`;
      setState({ busy: payment.payment_id, error: null });
      try {
        await downloadFile(path, `${payment.receipt_no || payment.payment_id}.pdf`);
        setState({ busy: null, error: null });
      } catch (err) {
        setState({ busy: null, error: err.message });
        dispatch(apiRequestFailed({ status: err.status ?? 0, message: err.message, path, method: 'GET' }));
      }
    },
    [dispatch]
  );
  return [download, state];
}

/** Receipt viewer: GET /api/fees/payments/:id/receipt (JSON), with PDF download. */
export function ReceiptModal({ paymentId, onClose }) {
  const receipt = useApiResource(`/fees/payments/${encodeURIComponent(paymentId)}/receipt`);
  const [download, pdf] = useReceiptPdf();
  const r = receipt.data;
  const balance = r?.fee ? Math.max(0, (r.fee.amount || 0) - (r.fee.paid_amount || 0)) : null;

  return (
    <Modal
      title={r?.payment?.receipt_no ? `Receipt ${r.payment.receipt_no}` : 'Fee receipt'}
      onClose={onClose}
      width={560}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose}>Close</button>
          <button type="button" className="sp-btn" disabled={!r || !!pdf.busy} onClick={() => download(r.payment)}>
            <Download size={15} /> {pdf.busy ? 'Preparing PDF...' : 'Download PDF'}
          </button>
        </>
      }
    >
      {receipt.status === 'loading' && <LoadingState label="Loading receipt..." lines={5} />}
      {receipt.status === 'failed' && <FeesErrorState error={receipt.error} onRetry={receipt.reload} />}
      {receipt.status === 'succeeded' && r && (
        <div className="fin-receipt">
          <div className="fin-receipt-head">
            <div>
              <strong>{r.college?.name || 'College'}</strong>
              {(r.college?.city || r.college?.state) && (
                <div className="sp-muted">{[r.college?.city, r.college?.state].filter(Boolean).join(', ')}</div>
              )}
            </div>
            <span className="sp-badge is-success">Payment received</span>
          </div>
          <dl className="sp-details">
            <div><dt>Receipt no.</dt><dd>{r.payment.receipt_no}</dd></div>
            <div><dt>Paid on</dt><dd>{formatDateTime(r.payment.paid_at)}</dd></div>
            <div><dt>Student</dt><dd>{r.student?.name || 'Not available'}</dd></div>
            <div><dt>Roll no.</dt><dd>{r.student?.roll_no || 'Not available'}</dd></div>
            <div><dt>Batch / section</dt><dd>{[r.student?.batch, r.student?.section].filter(Boolean).join(' / ') || 'Not available'}</dd></div>
            <div><dt>Mode</dt><dd>{modeLabel(r.payment.mode)}</dd></div>
            <div><dt>Reference</dt><dd>{r.payment.reference || 'None'}</dd></div>
            <div><dt>Fee</dt><dd>{r.fee?.fee_type || 'Not available'}{r.fee?.semester ? ` (semester ${r.fee.semester})` : ''}</dd></div>
            {r.fee?.due_date && <div><dt>Due date</dt><dd>{formatDate(r.fee.due_date)}</dd></div>}
          </dl>
          {Array.isArray(r.fee?.components) && r.fee.components.length > 0 && (
            <div className="sp-table-wrap" style={{ marginTop: 14 }}>
              <table className="sp-table">
                <thead><tr><th scope="col">Item</th><th scope="col" className="sp-num">Amount</th></tr></thead>
                <tbody>
                  {r.fee.components.map((c) => (
                    <tr key={c.name}><td>{c.name}</td><td className="sp-num">{formatCurrency(c.amount)}</td></tr>
                  ))}
                  <tr><td><strong>Total fee</strong></td><td className="sp-num"><strong>{formatCurrency(r.fee.amount)}</strong></td></tr>
                  <tr><td>Paid in this receipt</td><td className="sp-num">{formatCurrency(r.payment.amount)}</td></tr>
                  <tr><td>Balance now</td><td className="sp-num">{formatCurrency(balance)}</td></tr>
                </tbody>
              </table>
            </div>
          )}
          {pdf.error && <div className="sp-alert is-error" role="alert" style={{ marginTop: 12 }}>Could not download the PDF: {pdf.error}</div>}
        </div>
      )}
    </Modal>
  );
}

/** Query string from an object, skipping empty values. */
export function toQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== false) q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}
