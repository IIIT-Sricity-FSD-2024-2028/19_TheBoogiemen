import React, { useState } from 'react';
import { useApiResource } from '../../../hooks/useApiResource';
import { AtRiskTable, ResultsSummaryTable, StudentStandingTable } from '../../hod/components/ReportTables';
import '../../hod/hod.css';

const VIEWS = [
  { key: 'results', label: 'Results' },
  { key: 'at-risk', label: 'At-risk students' },
  { key: 'students', label: 'All students' },
];

/** College-wide results and at-risk students, filterable by department. */
export default function DirectorAcademics() {
  const depts = useApiResource('/college/departments');
  const [dept, setDept] = useState('');
  const [view, setView] = useState('results');
  const list = Array.isArray(depts.data) ? depts.data : [];
  const showDept = !dept;

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Academics overview</h1>
          <p className="sp-page-subtitle">Results by course section and students at risk across the college.</p>
        </div>
      </div>
      <div className="hd-toolbar">
        <div className="sp-segmented" role="group" aria-label="View">
          {VIEWS.map((v) => <button key={v.key} type="button" aria-pressed={view === v.key} onClick={() => setView(v.key)}>{v.label}</button>)}
        </div>
        <label className="sp-visually-hidden" htmlFor="dir-ac-dept">Department</label>
        <select id="dir-ac-dept" className="sp-select" value={dept} onChange={(e) => setDept(e.target.value)} disabled={depts.status !== 'succeeded'}>
          <option value="">{depts.status === 'loading' ? 'Loading departments...' : 'All departments'}</option>
          {list.map((d) => <option key={d.department_id} value={d.department_id}>{d.department_code} · {d.department_name}</option>)}
        </select>
        {depts.status === 'failed' && (
          <span className="sp-field-error">Could not load departments. <button type="button" className="sp-link-btn" onClick={depts.reload}>Retry</button></span>
        )}
      </div>
      {view === 'results' && <ResultsSummaryTable key={`r-${dept}`} departmentId={dept || undefined} showDepartment={showDept} />}
      {view === 'at-risk' && <AtRiskTable key={`a-${dept}`} departmentId={dept || undefined} showDepartment={showDept} />}
      {view === 'students' && <StudentStandingTable key={`s-${dept}`} departmentId={dept || undefined} />}
    </>
  );
}
