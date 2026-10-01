import React, { useCallback, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useApiResource } from '../../../hooks/useApiResource';
import DataTable from '../../../shared/ui/DataTable';
import { LoadingState } from '../../../shared/ui/StatusViews';
import { formatCurrency, formatDateTime } from '../../../shared/format';
import { FeesErrorState, FeesGate, PAYMENT_MODES, ReceiptModal, modeLabel, toQuery, useReceiptPdf } from '../feesUi';

function Payments() {
  const [filters, setFilters] = useState({ from: '', to: '', mode: '' });
  const rangeError = filters.from && filters.to && filters.from > filters.to ? 'The start date must be on or before the end date.' : null;
  const payments = useApiResource(rangeError ? null : `/fees/payments${toQuery(filters)}`);
  const [receiptId, setReceiptId] = useState(null);
  const [download, pdf] = useReceiptPdf();
  const closeReceipt = useCallback(() => setReceiptId(null), []);
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  const rows = Array.isArray(payments.data) ? payments.data : [];
  const total = rows.reduce((s, p) => s + (p.amount || 0), 0);

  const columns = useMemo(
    () => [
      { key: 'receipt_no', header: 'Receipt', render: (p) => <span className="sp-code">{p.receipt_no}</span> },
      { key: 'paid_at', header: 'Paid on', render: (p) => formatDateTime(p.paid_at) },
      {
        key: 'student_name',
        header: 'Student',
        value: (p) => `${p.student_name} ${p.roll_no || ''}`,
        render: (p) => <>{p.student_name}<div className="sp-card-meta">{p.roll_no}</div></>,
        csv: (p) => p.student_name,
      },
      { key: 'fee_type', header: 'Fee' },
      { key: 'mode', header: 'Mode', value: (p) => modeLabel(p.mode) },
      { key: 'reference', header: 'Reference', value: (p) => p.reference || '' , render: (p) => p.reference || <span className="sp-muted">None</span> },
      { key: 'amount', header: 'Amount', align: 'right', render: (p) => formatCurrency(p.amount) },
      { key: 'recorded_by_name', header: 'Recorded by', value: (p) => (p.mode === 'online_test' ? 'Student (online)' : p.recorded_by_name) },
      {
        key: 'actions',
        header: 'Receipt',
        sortable: false,
        value: () => '',
        render: (p) => (
          <div className="sp-btn-row" style={{ flexWrap: 'nowrap' }}>
            <button type="button" className="sp-btn is-small is-secondary" onClick={() => setReceiptId(p.payment_id)}>View</button>
            <button type="button" className="sp-btn is-small is-secondary" onClick={() => download(p)} disabled={pdf.busy === p.payment_id} aria-label={`Download PDF receipt ${p.receipt_no}`}>
              <Download size={14} /> {pdf.busy === p.payment_id ? 'Preparing...' : 'PDF'}
            </button>
          </div>
        ),
      },
    ],
    [download, pdf.busy]
  );

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Payments and receipts</h1>
          <p className="sp-page-subtitle">All payments recorded at the counter and paid online by students.</p>
        </div>
      </div>

      <div className="fin-filters" role="group" aria-label="Filter payments">
        <div className="sp-field">
          <label htmlFor="pm-from">From</label>
          <input id="pm-from" type="date" className="sp-input" value={filters.from} onChange={set('from')} aria-invalid={!!rangeError} />
        </div>
        <div className="sp-field">
          <label htmlFor="pm-to">To</label>
          <input id="pm-to" type="date" className="sp-input" value={filters.to} onChange={set('to')} aria-invalid={!!rangeError} />
        </div>
        <div className="sp-field">
          <label htmlFor="pm-mode">Mode</label>
          <select id="pm-mode" className="sp-select" value={filters.mode} onChange={set('mode')}>
            <option value="">All modes</option>
            {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            <option value="online_test">Online (test mode)</option>
          </select>
        </div>
        {(filters.from || filters.to || filters.mode) && (
          <button type="button" className="sp-btn is-secondary is-small" style={{ alignSelf: 'end', marginBottom: 4 }} onClick={() => setFilters({ from: '', to: '', mode: '' })}>
            Clear filters
          </button>
        )}
      </div>
      {rangeError && <p className="sp-field-error" role="alert">{rangeError}</p>}
      {pdf.error && <div className="sp-alert is-error" role="alert" style={{ marginBottom: 12 }}>Could not download the receipt: {pdf.error}</div>}

      {!rangeError && payments.status === 'loading' && <LoadingState label="Loading payments..." lines={5} />}
      {!rangeError && payments.status === 'failed' && <FeesErrorState error={payments.error} onRetry={payments.reload} />}
      {!rangeError && payments.status === 'succeeded' && (
        <>
          {rows.length > 0 && (
            <p className="sp-muted" style={{ margin: '0 0 10px' }}>
              {rows.length} payment{rows.length === 1 ? '' : 's'} totalling <strong>{formatCurrency(total)}</strong>
            </p>
          )}
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(p) => p.payment_id}
            searchPlaceholder="Search receipt, student or reference"
            csvName="fee-payments"
            emptyTitle="No payments"
            emptyMessage={filters.from || filters.to || filters.mode ? 'No payments match these filters.' : 'Payments appear here once recorded.'}
            caption="Fee payments"
          />
        </>
      )}
      {receiptId && <ReceiptModal paymentId={receiptId} onClose={closeReceipt} />}
    </>
  );
}

export default function FeePayments() {
  return (
    <FeesGate>
      <Payments />
    </FeesGate>
  );
}
