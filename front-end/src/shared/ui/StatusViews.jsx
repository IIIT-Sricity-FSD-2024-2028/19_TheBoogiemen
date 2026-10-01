import React from 'react';

/** Shown while a request is in flight: skeleton lines shaped like content. */
export function LoadingState({ label = 'Loading...', lines = 3 }) {
  return (
    <div role="status" aria-live="polite" style={{ padding: '14px 0', display: 'grid', gap: 10 }}>
      <span className="sp-visually-hidden">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="sp-skeleton" style={{ height: 14, width: `${[92, 76, 58, 84][i % 4]}%` }} />
      ))}
    </div>
  );
}

function errorTitle(status) {
  if (status === 0) return 'Server unreachable';
  if (status === 401) return 'Session expired';
  if (status === 403) return 'Access denied';
  if (status === 404) return 'Not found';
  if (status >= 500) return 'Server error';
  return 'Something went wrong';
}

/** Shown when a request failed. Never used for a successful empty response. */
export function ErrorState({ error, onRetry }) {
  const status = error?.status ?? 0;
  return (
    <div className="sp-state" role="alert">
      <p className="sp-state-title" style={{ color: 'var(--sp-danger)' }}>
        {errorTitle(status)}
        {status > 0 ? ` (HTTP ${status})` : ''}
      </p>
      <p>{error?.message || 'The request could not be completed.'}</p>
      {onRetry && status !== 401 && (
        <button type="button" className="sp-btn is-secondary is-small" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** Simple navy line illustration used by empty states. */
function EmptyArt() {
  return (
    <svg className="sp-empty-art" viewBox="0 0 120 90" fill="none" aria-hidden="true">
      <rect x="18" y="14" width="84" height="62" rx="10" fill="var(--navy-50)" stroke="var(--navy-200)" strokeWidth="2" />
      <rect x="30" y="28" width="40" height="6" rx="3" fill="var(--navy-200)" />
      <rect x="30" y="41" width="60" height="5" rx="2.5" fill="var(--navy-100)" />
      <rect x="30" y="52" width="48" height="5" rx="2.5" fill="var(--navy-100)" />
      <circle cx="92" cy="68" r="14" fill="#fff" stroke="var(--navy-700)" strokeWidth="2.5" />
      <path d="M86 68h12M92 62v12" stroke="var(--navy-700)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Shown only when the API succeeded and returned no records. */
export function EmptyState({ title, message, children }) {
  return (
    <div className="sp-state">
      <EmptyArt />
      <p className="sp-state-title">{title}</p>
      {message && <p>{message}</p>}
      {children}
    </div>
  );
}

/**
 * Renders the right state for a { status, error, data } resource and calls
 * `children(data)` only on success. `isEmpty(data)` decides the empty state.
 */
export function ResourceView({ resource, onRetry, isEmpty, empty, loadingLabel, children }) {
  const { status, error, data } = resource;
  if (status === 'idle' || status === 'loading') return <LoadingState label={loadingLabel} />;
  if (status === 'failed') return <ErrorState error={error} onRetry={onRetry} />;
  if (isEmpty && isEmpty(data)) return empty;
  return children(data);
}

export function ProgressBar({ value, tone = 'default', label }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  const toneClass = tone === 'default' || tone === 'neutral' ? '' : ` is-${tone}`;
  return (
    <div
      className={`sp-progress${toneClass}`}
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span style={{ width: `${safe}%` }} />
    </div>
  );
}
