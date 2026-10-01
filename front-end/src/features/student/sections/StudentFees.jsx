import React, { useCallback, useState } from 'react';
import { CreditCard, Download, ShieldAlert } from 'lucide-react';
import { useApiResource } from '../../../hooks/useApiResource';
import { useMutation } from '../../../hooks/useMutation';
import Modal from '../../../shared/ui/Modal';
import { EmptyState, LoadingState, ProgressBar } from '../../../shared/ui/StatusViews';
import { formatCurrency, formatDate, formatDateTime } from '../../../shared/format';
import { FeeStatusBadge, FeesErrorState, FeesGate, ReceiptModal, modeLabel, useReceiptPdf } from '../../finance/feesUi';
import '../../finance/finance.css';

/**
 * TEST MODE gateway: no card or bank details are collected and no money moves.
 * POST /api/fees/me/:id/pay {amount, simulate?: 'fail'}; amount must not exceed the balance.
 */
function TestGatewayModal({ fee, onClose, onPaid }) {
  const [amount, setAmount] = useState(String(fee.balance));
  const [outcome, setOutcome] = useState('success');
  const [submitted, setSubmitted] = useState(false);
  const [pay, { loading, error, reset }] = useMutation();
  const value = Number(amount);

  let amountError = null;
  if (!(value > 0)) amountError = 'Enter a positive amount.';
  else if (!Number.isInteger(value)) amountError = 'Enter a whole number of rupees.';
  else if (value > fee.balance) amountError = `Amount cannot exceed the balance of ${formatCurrency(fee.balance)}.`;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (amountError) return;
    const body = { amount: value, ...(outcome === 'fail' ? { simulate: 'fail' } : {}) };
    const res = await pay('post', `/fees/me/${encodeURIComponent(fee.fee_id)}/pay`, body, {
      label: `Paid ${formatCurrency(value)} towards ${fee.fee_type} (test mode)`,
    });
    if (res.ok) onPaid(res.data);
  };

  return (
    <Modal
      title="Pay fee — TEST MODE"
      onClose={onClose}
      width={520}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="test-pay-form" className="sp-btn" disabled={loading}>
            {loading ? 'Processing...' : `Pay ${amountError ? '' : formatCurrency(value)} (test)`}
          </button>
        </>
      }
    >
      <form id="test-pay-form" className="sp-form" onSubmit={submit} noValidate>
        <div className="fin-test-banner" role="note">
          <strong><ShieldAlert size={14} aria-hidden="true" /> TEST MODE GATEWAY</strong>
          This is a simulated payment. No card or bank details are asked for and no real money is taken.
          A successful test payment is recorded against your fee and produces a receipt.
        </div>
        <dl className="sp-details">
          <div><dt>Fee</dt><dd>{fee.fee_type}{fee.semester ? ` (semester ${fee.semester})` : ''}</dd></div>
          <div><dt>Balance due</dt><dd>{formatCurrency(fee.balance)}</dd></div>
        </dl>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
        <div className="sp-field">
          <label htmlFor="tp-amount">Amount to pay (INR)</label>
          <input
            id="tp-amount"
            type="number"
            min={1}
            max={fee.balance}
            step={1}
            className="sp-input"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              reset();
            }}
            aria-invalid={submitted && !!amountError}
          />
          <p className="sp-hint">You can pay the full balance or a part of it.</p>
          {submitted && amountError && <p className="sp-field-error">{amountError}</p>}
        </div>
        <fieldset className="fin-fieldset">
          <legend>Test outcome</legend>
          <label className="sp-checkbox">
            <input type="radio" name="tp-outcome" checked={outcome === 'success'} onChange={() => { setOutcome('success'); reset(); }} /> Simulate a successful payment
          </label>
          <label className="sp-checkbox">
            <input type="radio" name="tp-outcome" checked={outcome === 'fail'} onChange={() => { setOutcome('fail'); reset(); }} /> Simulate a failed payment
          </label>
        </fieldset>
      </form>
    </Modal>
  );
}

function FeeCard({ fee, onPay, onReceipt, onDownload, pdfBusy }) {
  const payments = Array.isArray(fee.payments) ? fee.payments : [];
  const paidPct = fee.amount > 0 ? Math.round(((fee.paid_amount || 0) / fee.amount) * 100) : 0;
  return (
    <article className="sp-card">
      <div className="sp-card-head">
        <div>
          <h2 className="sp-card-title">{fee.fee_type}</h2>
          <div className="sp-card-meta">{fee.semester ? `Semester ${fee.semester} · ` : ''}Due {formatDate(fee.due_date)}</div>
        </div>
        <FeeStatusBadge fee={fee} />
      </div>

      {Array.isArray(fee.components) && fee.components.length > 0 && (
        <div className="sp-table-wrap" style={{ marginTop: 10 }}>
          <table className="sp-table">
            <thead><tr><th scope="col">Item</th><th scope="col" className="sp-num">Amount</th></tr></thead>
            <tbody>
              {fee.components.map((c) => (
                <tr key={c.name}><td>{c.name}</td><td className="sp-num">{formatCurrency(c.amount)}</td></tr>
              ))}
              <tr><td><strong>Total</strong></td><td className="sp-num"><strong>{formatCurrency(fee.amount)}</strong></td></tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="sp-progress-row" style={{ marginTop: 14 }}>
        <span>Paid {formatCurrency(fee.paid_amount || 0)} of {formatCurrency(fee.amount)}</span>
        <span>Balance <strong>{formatCurrency(fee.balance)}</strong></span>
      </div>
      <ProgressBar value={paidPct} tone={fee.status === 'paid' ? 'success' : 'default'} label={`${fee.fee_type} paid`} />

      {fee.balance > 0 && (
        <div className="sp-btn-row" style={{ marginTop: 14 }}>
          <button type="button" className="sp-btn" onClick={() => onPay(fee)}><CreditCard size={15} /> Pay now</button>
          <span className="sp-badge is-warning">Test mode</span>
        </div>
      )}

      <h3 className="sp-section-title" style={{ fontSize: 14, marginTop: 16 }}>Payments</h3>
      {payments.length === 0 ? (
        <p className="sp-muted" style={{ margin: 0 }}>No payments made for this fee yet.</p>
      ) : (
        <ul className="fin-list">
          {payments.map((p) => (
            <li key={p.payment_id}>
              <div>
                <strong>{formatCurrency(p.amount)}</strong> <span className="sp-muted">· {modeLabel(p.mode)}</span>
                <div className="sp-card-meta">{formatDateTime(p.paid_at)} · {p.receipt_no}</div>
              </div>
              <div className="sp-btn-row" style={{ flexWrap: 'nowrap' }}>
                <button type="button" className="sp-btn is-small is-secondary" onClick={() => onReceipt(p.payment_id)}>Receipt</button>
                <button type="button" className="sp-btn is-small is-secondary" onClick={() => onDownload(p)} disabled={pdfBusy === p.payment_id} aria-label={`Download PDF receipt ${p.receipt_no}`}>
                  <Download size={14} /> {pdfBusy === p.payment_id ? 'Preparing...' : 'PDF'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function Fees() {
  const fees = useApiResource('/fees/me');
  const [paying, setPaying] = useState(null);
  const [receiptId, setReceiptId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [download, pdf] = useReceiptPdf();
  const closePay = useCallback(() => setPaying(null), []);
  const closeReceipt = useCallback(() => setReceiptId(null), []);

  const list = Array.isArray(fees.data) ? fees.data : [];
  const totalDue = list.reduce((s, f) => s + (f.balance || 0), 0);
  const overdue = list.filter((f) => f.status !== 'paid' && f.overdue);

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Fees</h1>
          <p className="sp-page-subtitle">Fees billed to you, what you have paid, and your receipts.</p>
        </div>
        {fees.status === 'succeeded' && list.length > 0 && (
          <div className="sp-card" style={{ padding: '10px 16px', textAlign: 'right' }}>
            <div className="sp-stat-label">Total due</div>
            <div className="sp-stat-value" style={{ fontSize: 22 }}>{formatCurrency(totalDue)}</div>
          </div>
        )}
      </div>

      {notice && (
        <div className="sp-alert is-success" role="status" style={{ marginBottom: 16 }}>
          <span>{notice.text}</span>
          <button type="button" className="sp-link-btn" onClick={() => setReceiptId(notice.payment.payment_id)}>View receipt</button>
          <button type="button" className="sp-link-btn" onClick={() => download(notice.payment)} disabled={pdf.busy === notice.payment.payment_id}>
            {pdf.busy === notice.payment.payment_id ? 'Preparing PDF...' : 'Download PDF'}
          </button>
          <button type="button" className="sp-link-btn" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}
      {pdf.error && <div className="sp-alert is-error" role="alert" style={{ marginBottom: 16 }}>Could not download the receipt: {pdf.error}</div>}
      {overdue.length > 0 && (
        <div className="sp-alert is-warning" role="status" style={{ marginBottom: 16 }}>
          {overdue.length === 1 ? 'One fee is' : `${overdue.length} fees are`} past the due date ({formatCurrency(overdue.reduce((s, f) => s + (f.balance || 0), 0))} outstanding).
        </div>
      )}

      {fees.status === 'loading' && <LoadingState label="Loading fees..." lines={5} />}
      {fees.status === 'failed' && <FeesErrorState error={fees.error} onRetry={fees.reload} />}
      {fees.status === 'succeeded' && list.length === 0 && (
        <div className="sp-card">
          <EmptyState title="No fees billed" message="Fees appear here once the finance office bills your batch." />
        </div>
      )}
      {list.length > 0 && (
        <div className="sp-grid sp-grid-2">
          {list.map((f) => (
            <FeeCard key={f.fee_id} fee={f} onPay={setPaying} onReceipt={setReceiptId} onDownload={download} pdfBusy={pdf.busy} />
          ))}
        </div>
      )}

      {paying && (
        <TestGatewayModal
          fee={paying}
          onClose={closePay}
          onPaid={(data) => {
            setPaying(null);
            if (data?.payment) {
              setNotice({
                text: `Test payment of ${formatCurrency(data.payment.amount)} succeeded. Receipt ${data.payment.receipt_no}.`,
                payment: data.payment,
              });
              setReceiptId(data.payment.payment_id);
            }
            fees.reload();
          }}
        />
      )}
      {receiptId && <ReceiptModal paymentId={receiptId} onClose={closeReceipt} />}
    </>
  );
}

export default function StudentFees() {
  return (
    <FeesGate>
      <Fees />
    </FeesGate>
  );
}
