import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, FileUp, RotateCcw, Upload } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../auth/authSlice';
import { useApiResource } from '../../hooks/useApiResource';
import { useMutation } from '../../hooks/useMutation';
import { ErrorState, LoadingState } from '../../shared/ui/StatusViews';
import { KIND_LABEL, downloadCsv, grantableRoles, isHodRole, parseCsv } from './collegeShared';
import './college.css';

const BASE_COLUMNS = ['role', 'first_name', 'last_name', 'email', 'phone', 'department', 'batch', 'section', 'designation', 'id'];
const MAX_ROWS = 500;

/** Turns parsed CSV rows into /college/people/import rows, resolving department codes and batch labels. */
function toPeopleRows(table, config) {
  const [header, ...body] = table;
  const cols = header.map((h) => String(h).trim().toLowerCase().replace(/\s+/g, '_'));
  const settings = config.settings || {};
  const customKeys = new Set((settings.custom_fields || []).map((f) => f.key));
  const deptByCode = new Map((config.departments || []).map((d) => [d.department_code.toUpperCase(), d.department_id]));
  const batches = settings.batches || [];
  const notes = [];

  const rows = body.map((cells, i) => {
    const get = (name) => {
      const idx = cols.indexOf(name);
      return idx === -1 ? '' : String(cells[idx] ?? '').trim();
    };
    const rowNotes = [];
    const row = {
      role: get('role').toLowerCase() === 'finance_admin' ? 'FINANCE_ADMIN' : get('role').toLowerCase(),
      first_name: get('first_name'),
      last_name: get('last_name'),
      email: get('email'),
    };
    if (get('phone')) row.phone = get('phone');
    const dept = get('department') || get('department_code');
    if (dept) {
      const id = deptByCode.get(dept.toUpperCase());
      if (id) row.department_id = id;
      else rowNotes.push(`unknown department code "${dept}"`);
    }
    const batch = get('batch');
    if (batch) {
      const match = batches.find((b) => b.batch_id === batch || b.label.toLowerCase() === batch.toLowerCase() || String(b.start_year) === batch);
      if (match) row.batch_id = match.batch_id;
      else rowNotes.push(`unknown batch "${batch}"`);
    }
    if (get('section')) row.section = get('section');
    if (get('designation')) row.designation = get('designation');
    if (get('id') || get('display_id')) row.display_id = get('id') || get('display_id');
    const custom = {};
    cols.forEach((c, idx) => {
      if (customKeys.has(c) && String(cells[idx] ?? '').trim()) custom[c] = String(cells[idx]).trim();
    });
    if (Object.keys(custom).length) row.custom_fields = custom;
    if (rowNotes.length) notes[i + 1] = rowNotes;
    return row;
  });
  return { rows, notes, missing: ['role', 'first_name', 'email'].filter((c) => !cols.includes(c)) };
}

/**
 * CSV import of people: parse in the browser, validate with a server dry run
 * (per-row errors, seat capacity), then commit. Created accounts come back
 * once with their temporary passwords, which can be downloaded as CSV.
 */
export default function CsvImport({ config: configProp, onImported }) {
  const user = useSelector(selectCurrentUser);
  const fetched = useApiResource(configProp ? null : '/college/settings');
  const config = configProp || fetched.data;
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState(null);
  const [parsed, setParsed] = useState(null); // { rows, notes }
  const [preview, setPreview] = useState(null);
  const [created, setCreated] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const [run, { loading, error, reset }] = useMutation();

  const customFields = useMemo(() => config?.settings?.custom_fields || [], [config]);
  const roles = grantableRoles(user?.role);

  if (!configProp && fetched.status === 'loading') return <LoadingState label="Loading college settings" />;
  if (!configProp && fetched.status === 'failed') return <ErrorState error={fetched.error} onRetry={fetched.reload} />;
  if (!config) return null;

  const downloadTemplate = () => {
    const header = [...BASE_COLUMNS, ...customFields.map((f) => f.key)];
    downloadCsv('people-import-template.csv', header, []);
  };

  const readFile = (file) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      setParseError('Choose a .csv file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setParseError('The file is larger than 2 MB. Split it into smaller files.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result || ''));
      setFileName(file.name);
      setParseError(null);
    };
    reader.onerror = () => setParseError('The file could not be read.');
    reader.readAsText(file);
  };

  const validate = async () => {
    setParseError(null);
    setPreview(null);
    reset();
    const table = parseCsv(text);
    if (table.length < 2) {
      setParseError('Add a header row and at least one person.');
      return;
    }
    const result = toPeopleRows(table, config);
    if (result.missing.length) {
      setParseError(`The header row is missing: ${result.missing.join(', ')}. Download the template to see every column.`);
      return;
    }
    if (result.rows.length > MAX_ROWS) {
      setParseError(`Import at most ${MAX_ROWS} people at a time. This file has ${result.rows.length}.`);
      return;
    }
    setParsed(result);
    const res = await run('post', '/college/people/import', { rows: result.rows, dry_run: true });
    if (res.ok) setPreview(res.data);
  };

  const commit = async () => {
    const res = await run('post', '/college/people/import', { rows: parsed.rows, dry_run: false }, { label: 'Imported people from CSV' });
    if (!res.ok) return;
    if (res.data.dry_run) {
      // Seat capacity changed between the preview and the commit.
      setPreview(res.data);
      return;
    }
    setCreated(res.data.created);
    setPreview(null);
    onImported?.(res.data);
  };

  const startOver = () => {
    setText('');
    setFileName('');
    setParsed(null);
    setPreview(null);
    setCreated(null);
    setParseError(null);
    reset();
  };

  const downloadPasswords = () => {
    downloadCsv(
      `new-accounts-${new Date().toISOString().slice(0, 10)}.csv`,
      ['name', 'email', 'role', 'id', 'temporary_password'],
      created.map((c) => [c.name, c.email, c.role, c.display_id, c.temporary_password])
    );
  };

  if (created) {
    return (
      <div className="sp-form">
        <div className="sp-alert is-success" role="status">
          <span><CheckCircle2 size={16} aria-hidden="true" /> Created {created.length} account{created.length === 1 ? '' : 's'}.</span>
        </div>
        <div className="sp-alert is-warning" role="note">
          <span>Temporary passwords are shown only now. Download the CSV before leaving this screen and share each password securely. Everyone must set a new password at first sign-in.</span>
        </div>
        <div className="sp-btn-row">
          <button type="button" className="sp-btn" onClick={downloadPasswords} disabled={!created.length}><Download size={15} /> Download passwords (CSV)</button>
          <button type="button" className="sp-btn is-secondary" onClick={startOver}><RotateCcw size={15} /> Import another file</button>
        </div>
        {created.length > 0 && (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">ID</th><th scope="col">Temporary password</th></tr>
              </thead>
              <tbody>
                {created.map((c) => (
                  <tr key={c.user_id}>
                    <td>{c.name}</td>
                    <td>{c.email}</td>
                    <td>{KIND_LABEL[c.role] || c.role}</td>
                    <td><span className="sp-code">{c.display_id}</span></td>
                    <td><code>{c.temporary_password}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const summary = preview?.summary;
  const canCommit = summary && summary.valid > 0 && !(summary.seat_errors || []).length;

  return (
    <div className="sp-form">
      <div className="sp-alert is-info" role="note">
        <span>
          Columns: <span className="sp-code">{[...BASE_COLUMNS, ...customFields.map((f) => f.key)].join(', ')}</span>.
          Role is one of {roles.map((r) => (r === 'superadmin' ? 'director' : r === 'head' ? 'hod' : r === 'FINANCE_ADMIN' ? 'finance' : r)).join(', ')}.
          {!isHodRole(user?.role) && ' Department is the department code (for example CSE).'} Batch is the batch label or start year.
          Leave id blank to allocate IDs from your ID format.
        </span>
      </div>
      <div className="sp-btn-row">
        <button type="button" className="sp-btn is-secondary is-small" onClick={downloadTemplate}><Download size={14} /> Download template</button>
      </div>

      {!preview && (
        <>
          <div
            className={`cl-import-drop${dragOver ? ' is-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); readFile(e.dataTransfer.files?.[0]); }}
          >
            <div className="sp-btn-row" style={{ alignItems: 'center' }}>
              <button type="button" className="sp-btn is-secondary" onClick={() => fileRef.current?.click()}><FileUp size={15} /> Choose CSV file</button>
              <span className="sp-muted" style={{ fontSize: 13 }}>{fileName ? `Loaded ${fileName}` : 'or drop a file here, or paste the CSV below'}</span>
              <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
            <div className="sp-field">
              <label htmlFor="csv-text">CSV content</label>
              <textarea id="csv-text" className="sp-textarea" rows={8} value={text} spellCheck={false}
                onChange={(e) => { setText(e.target.value); setFileName(''); }}
                placeholder={'role,first_name,last_name,email,department,batch,section\nstudent,Asha,Kumar,asha@example.edu,CSE,2024,A'} />
            </div>
          </div>
          {parseError && <p className="sp-field-error" role="alert">{parseError}</p>}
          {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
          <div className="sp-btn-row">
            <button type="button" className="sp-btn" onClick={validate} disabled={loading || !text.trim()}>
              <Upload size={15} /> {loading ? 'Checking...' : 'Check file'}
            </button>
          </div>
        </>
      )}

      {preview && (
        <>
          <div className="sp-btn-row" style={{ alignItems: 'center' }}>
            <span className="sp-badge is-neutral">{summary.total} rows</span>
            <span className="sp-badge is-success">{summary.valid} ready</span>
            {summary.invalid > 0 && <span className="sp-badge is-danger">{summary.invalid} with errors</span>}
          </div>
          {(summary.seat_errors || []).map((m) => (
            <div key={m} className="sp-alert is-error" role="alert"><span>{m}</span></div>
          ))}
          {summary.invalid > 0 && summary.valid > 0 && !(summary.seat_errors || []).length && (
            <div className="sp-alert is-warning" role="note"><span>Rows with errors are skipped. Fix them in the file and import them separately, or check the file again.</span></div>
          )}
          {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
          <div className="sp-table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table className="sp-table">
              <thead>
                <tr><th scope="col">Row</th><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">ID to be assigned</th><th scope="col">Result</th></tr>
              </thead>
              <tbody>
                {preview.results.map((r) => {
                  const notes = parsed?.notes?.[r.row] || [];
                  return (
                    <tr key={r.row}>
                      <td className="sp-num">{r.row}</td>
                      <td>{r.name || '-'}</td>
                      <td style={{ wordBreak: 'break-all' }}>{r.email || '-'}</td>
                      <td>{KIND_LABEL[r.role] || r.role || '-'}</td>
                      <td>{r.display_id ? <span className="sp-code">{r.display_id}</span> : '-'}</td>
                      <td>
                        {r.ok ? (
                          <span className="sp-badge is-success">Ready</span>
                        ) : (
                          <ul className="cl-row-errors">
                            {[...notes, ...r.errors].map((m) => <li key={m}>{m}</li>)}
                          </ul>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="sp-btn-row">
            <button type="button" className="sp-btn" onClick={commit} disabled={!canCommit || loading}>
              {loading ? 'Importing...' : `Import ${summary.valid} ${summary.valid === 1 ? 'person' : 'people'}`}
            </button>
            <button type="button" className="sp-btn is-secondary" onClick={() => { setPreview(null); reset(); }} disabled={loading}>Edit file</button>
          </div>
        </>
      )}
    </div>
  );
}
