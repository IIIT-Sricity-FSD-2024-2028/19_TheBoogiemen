import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { selectCurrentUser } from '../auth/authSlice';
import { api } from '../../services/apiClient';
import { useApiResource } from '../../hooks/useApiResource';
import { useMutation } from '../../hooks/useMutation';
import { ErrorState, LoadingState } from '../../shared/ui/StatusViews';
import { isAdminRole } from './collegeShared';
import './college.css';

const KINDS = [
  { key: 'student', label: 'Students', hint: 'Roll numbers' },
  { key: 'faculty', label: 'Faculty and HODs', hint: 'Employee IDs' },
  { key: 'staff', label: 'Other staff', hint: 'Directors, finance' },
];

const TOKEN_TYPES = {
  text: { label: 'Fixed text', make: () => ({ type: 'text', value: '' }) },
  year: { label: 'Year', make: () => ({ type: 'year', format: 'YYYY' }) },
  dept: { label: 'Department code', make: () => ({ type: 'dept' }) },
  programme: { label: 'Programme code', make: () => ({ type: 'programme' }) },
  section: { label: 'Section', make: () => ({ type: 'section' }) },
  seq: { label: 'Running number', make: () => ({ type: 'seq', width: 3, reset: 'dept_year' }) },
};

const RESET_LABEL = {
  never: 'Never (one counter)',
  year: 'Every year',
  dept: 'Per department',
  dept_year: 'Per department, every year',
};

/** Client-side mirror of validateTemplate() in back-end/src/college/id-format.ts, for instant feedback. */
function localError(template) {
  if (!template.length) return 'Add at least one part to the format.';
  if (template.length > 12) return 'A format can have at most 12 parts.';
  if (template.filter((t) => t.type === 'seq').length !== 1) return 'The format needs exactly one running number so every ID is unique.';
  for (const t of template) {
    if (t.type === 'text') {
      if (!t.value) return 'Fixed text parts cannot be empty.';
      if (t.value.length > 12) return 'Fixed text parts can be at most 12 characters.';
      if (!/^[A-Za-z0-9/\-_. ]+$/.test(t.value)) return 'Fixed text can use letters, numbers, spaces and / - _ .';
    }
    if (t.type === 'seq' && (!Number.isInteger(t.width) || t.width < 1 || t.width > 8)) return 'The running number must be 1 to 8 digits wide.';
  }
  return null;
}

function TokenEditor({ token, index, count, onChange, onMove, onRemove, disabled }) {
  const id = `tok-${index}`;
  return (
    <li className="cl-token">
      <span className="cl-token-name">{index + 1}. {TOKEN_TYPES[token.type]?.label || token.type}</span>
      {token.type === 'text' && (
        <div className="sp-field">
          <label htmlFor={`${id}-v`}>Text</label>
          <input id={`${id}-v`} className="sp-input" value={token.value} maxLength={12} disabled={disabled} onChange={(e) => onChange({ ...token, value: e.target.value })} />
        </div>
      )}
      {token.type === 'year' && (
        <div className="sp-field">
          <label htmlFor={`${id}-f`}>Format</label>
          <select id={`${id}-f`} className="sp-select" value={token.format} disabled={disabled} onChange={(e) => onChange({ ...token, format: e.target.value })}>
            <option value="YYYY">YYYY (2026)</option>
            <option value="YY">YY (26)</option>
          </select>
        </div>
      )}
      {token.type === 'seq' && (
        <>
          <div className="sp-field">
            <label htmlFor={`${id}-w`}>Digits</label>
            <input id={`${id}-w`} type="number" min={1} max={8} className="sp-input" style={{ width: 90 }} value={token.width} disabled={disabled}
              onChange={(e) => onChange({ ...token, width: Number(e.target.value) })} />
          </div>
          <div className="sp-field">
            <label htmlFor={`${id}-r`}>Restart numbering</label>
            <select id={`${id}-r`} className="sp-select" value={token.reset} disabled={disabled} onChange={(e) => onChange({ ...token, reset: e.target.value })}>
              {Object.entries(RESET_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </>
      )}
      {['dept', 'programme', 'section'].includes(token.type) && (
        <span className="sp-muted" style={{ fontSize: 13, alignSelf: 'center' }}>Filled in from the person's record.</span>
      )}
      {!disabled && (
        <div className="cl-token-actions">
          <button type="button" className="sp-icon-btn" aria-label={`Move part ${index + 1} up`} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp size={15} /></button>
          <button type="button" className="sp-icon-btn" aria-label={`Move part ${index + 1} down`} disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown size={15} /></button>
          <button type="button" className="sp-icon-btn" aria-label={`Remove part ${index + 1}`} onClick={onRemove}><Trash2 size={15} /></button>
        </div>
      )}
    </li>
  );
}

function FormatEditor({ kind, initial, canEdit, onSaved }) {
  const [tokens, setTokens] = useState(() => (initial || []).map((t) => ({ ...t })));
  const [preview, setPreview] = useState({ status: 'idle', data: null, error: null });
  const [save, { loading, error, status, reset }] = useMutation();
  const problem = localError(tokens);

  // Live preview from the server's own renderer (POST /college/id-format/preview), debounced.
  useEffect(() => {
    if (problem) {
      setPreview({ status: 'idle', data: null, error: null });
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setPreview((p) => ({ ...p, status: 'loading' }));
      api
        .post('/college/id-format/preview', { template: tokens }, { signal: controller.signal })
        .then((data) => setPreview({ status: 'succeeded', data, error: null }))
        .catch((err) => {
          if (err.name !== 'AbortError') setPreview({ status: 'failed', data: null, error: err.message });
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [tokens, problem]);

  const change = (next) => {
    setTokens(next);
    reset();
  };
  const move = (i, dir) => {
    const next = [...tokens];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    change(next);
  };

  const submit = async () => {
    if (problem) return;
    const res = await save('put', '/college/settings/id-formats', { [kind]: tokens }, { label: `Updated ${kind} ID format` });
    if (res.ok) onSaved?.(res.data);
  };

  const hasSeq = tokens.some((t) => t.type === 'seq');

  return (
    <div className="sp-form">
      <div className="cl-preview" aria-live="polite">
        <span style={{ fontSize: 13, color: '#c7d2ea' }}>Preview</span>
        {problem ? (
          <span style={{ color: '#fecaca' }}>{problem}</span>
        ) : preview.status === 'failed' ? (
          <span style={{ color: '#fecaca' }}>Preview unavailable: {preview.error}</span>
        ) : preview.data?.error ? (
          <span style={{ color: '#fecaca' }}>{preview.data.error}</span>
        ) : preview.data ? (
          <>
            <code style={{ opacity: preview.status === 'loading' ? 0.6 : 1 }}>{preview.data.preview}</code>
            {preview.data.examples?.length > 1 && <span className="cl-preview-more">then {preview.data.examples.slice(1).join(', ')}</span>}
          </>
        ) : (
          <span className="cl-preview-more">Working...</span>
        )}
      </div>
      <p className="sp-hint" style={{ margin: 0 }}>Sample values: department CSE, programme BTECH, section A, the current year.</p>

      {tokens.length === 0 ? (
        <p className="sp-muted" style={{ margin: 0 }}>No parts yet. Add parts below.</p>
      ) : (
        <ol className="cl-token-list">
          {tokens.map((t, i) => (
            <TokenEditor
              // Tokens have no ids; position is their identity and reordering re-renders the row contents.
              // eslint-disable-next-line react/no-array-index-key
              key={`${i}-${t.type}`}
              token={t}
              index={i}
              count={tokens.length}
              disabled={!canEdit}
              onChange={(nt) => change(tokens.map((x, j) => (j === i ? nt : x)))}
              onMove={(dir) => move(i, dir)}
              onRemove={() => change(tokens.filter((_, j) => j !== i))}
            />
          ))}
        </ol>
      )}

      {canEdit && (
        <>
          <div className="sp-btn-row" role="group" aria-label="Add a part">
            {Object.entries(TOKEN_TYPES).map(([type, def]) => (
              <button key={type} type="button" className="sp-btn is-secondary is-small" disabled={tokens.length >= 12 || (type === 'seq' && hasSeq)}
                onClick={() => change([...tokens, def.make()])}>
                <Plus size={13} /> {def.label}
              </button>
            ))}
          </div>
          {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
          <div className="cl-form-actions">
            <button type="button" className="sp-btn" onClick={submit} disabled={loading || !!problem}>{loading ? 'Saving...' : 'Save format'}</button>
            <button type="button" className="sp-btn is-secondary" onClick={() => change((initial || []).map((t) => ({ ...t })))} disabled={loading}>Undo changes</button>
            {status === 'succeeded' && <span className="sp-hint" role="status">Saved. New IDs use this format; existing IDs do not change.</span>}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * ID format builder for student, faculty and staff IDs. Works standalone (it
 * loads /college/settings itself) or inside the configuration/setup screens
 * when `config` is passed.
 */
export default function IdFormatBuilder({ config: configProp, canEdit: canEditProp, onSaved } = {}) {
  const user = useSelector(selectCurrentUser);
  const fetched = useApiResource(configProp ? null : '/college/settings');
  const [kind, setKind] = useState('student');
  const [local, setLocal] = useState(null);
  const config = local || configProp || fetched.data;
  const canEdit = canEditProp ?? isAdminRole(user?.role);

  if (!configProp && !local && fetched.status === 'loading') return <LoadingState label="Loading ID formats" />;
  if (!configProp && !local && fetched.status === 'failed') return <ErrorState error={fetched.error} onRetry={fetched.reload} />;
  if (!config) return null;

  const formats = config.settings?.id_formats || {};

  return (
    <div className="sp-form">
      <div className="sp-segmented" role="group" aria-label="Which ID">
        {KINDS.map((k) => (
          <button key={k.key} type="button" aria-pressed={kind === k.key} onClick={() => setKind(k.key)} title={k.hint}>{k.label}</button>
        ))}
      </div>
      <FormatEditor
        key={kind}
        kind={kind}
        initial={formats[kind]}
        canEdit={canEdit}
        onSaved={(data) => {
          setLocal(data);
          onSaved?.(data);
        }}
      />
    </div>
  );
}
