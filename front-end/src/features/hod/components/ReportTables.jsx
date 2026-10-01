import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useApiResource } from '../../../hooks/useApiResource';
import DataTable from '../../../shared/ui/DataTable';
import { ErrorState, LoadingState } from '../../../shared/ui/StatusViews';
import { SimpleBarChart } from '../../../shared/ui/Charts';
import { displayValue } from '../../../shared/format';
import { attendanceBadge, orderGrades, today, usePdfDownload } from './common';

/** Attendance minimum, pass mark and grade bands from the college settings. */
export function useCollegeRules() {
  const r = useApiResource('/college/settings');
  const s = r.data?.settings;
  return {
    status: r.status,
    min: typeof s?.attendance_min_pct === 'number' ? s.attendance_min_pct : null,
    passPct: typeof s?.grading?.pass_pct === 'number' ? s.grading.pass_pct : null,
    bands: s?.grading?.bands || [],
    sections: Array.isArray(s?.sections) ? s.sections : [],
  };
}

const q = (departmentId) => (departmentId ? `?department_id=${encodeURIComponent(departmentId)}` : '');

function PdfError({ error }) {
  if (!error) return null;
  return <div className="sp-alert is-error" role="alert" style={{ marginBottom: 12 }}>Could not download the PDF: {error}</div>;
}

function StudentPdfButton({ row, pdf }) {
  const path = `/reports/student-pdf/${row.student_id}`;
  return (
    <button
      type="button"
      className="sp-btn is-secondary is-small"
      onClick={() => pdf.download(path, `progress-report-${row.roll_no || row.student_id}.pdf`)}
      disabled={pdf.busy === path}
      aria-label={`Download progress report for ${row.name}`}
    >
      <Download size={13} /> {pdf.busy === path ? 'Preparing...' : 'PDF'}
    </button>
  );
}

function reasonsCell(row) {
  if (!row.reasons?.length) return <span className="sp-badge is-success">On track</span>;
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {row.reasons.map((r) => <span key={r} className="sp-badge is-danger" style={{ whiteSpace: 'normal' }}>{r}</span>)}
    </div>
  );
}

/** Every student's attendance, marks and CGPA with an at-risk filter, CSV and per-student PDF. */
export function StudentStandingTable({ departmentId }) {
  const res = useApiResource(`/reports/students${q(departmentId)}`);
  const rules = useCollegeRules();
  const pdf = usePdfDownload();
  const [filter, setFilter] = useState('all');
  const rows = useMemo(() => {
    const list = Array.isArray(res.data) ? res.data : [];
    return filter === 'risk' ? list.filter((r) => r.at_risk) : list;
  }, [res.data, filter]);

  if (res.status === 'loading') return <LoadingState label="Loading students" />;
  if (res.status === 'failed') return <ErrorState error={res.error} onRetry={res.reload} />;
  const all = Array.isArray(res.data) ? res.data : [];

  const columns = [
    { key: 'roll_no', header: 'Roll no', render: (r) => <span className="sp-code">{displayValue(r.roll_no, '-')}</span> },
    { key: 'name', header: 'Name' },
    ...(departmentId ? [] : [{ key: 'department_code', header: 'Dept' }]),
    { key: 'section', header: 'Section' },
    { key: 'cgpa', header: 'CGPA', align: 'right', render: (r) => displayValue(r.cgpa, '-') },
    { key: 'attendance_pct', header: 'Attendance', align: 'right', render: (r) => attendanceBadge(r.attendance_pct, rules.min ?? 0), csv: (r) => r.attendance_pct ?? '' },
    { key: 'marks_pct', header: 'Marks', align: 'right', render: (r) => (typeof r.marks_pct === 'number' ? `${r.marks_pct}%` : 'Not graded'), csv: (r) => r.marks_pct ?? '' },
    { key: 'status', header: 'Standing', value: (r) => (r.at_risk ? `At risk: ${r.reasons.join('; ')}` : 'On track'), render: reasonsCell, sortable: true },
    { key: 'pdf', header: 'Report', sortable: false, render: (r) => <StudentPdfButton row={r} pdf={pdf} />, csv: () => '' },
  ];

  return (
    <>
      <PdfError error={pdf.error} />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.student_id}
        searchPlaceholder="Search roll no or name"
        csvName="student-standing"
        emptyTitle={filter === 'risk' ? 'No students at risk' : 'No students'}
        emptyMessage={filter === 'risk' ? 'Every student meets the attendance, CGPA and marks thresholds.' : 'No active students in this scope yet.'}
        caption="Student standing"
        toolbar={
          <div className="sp-segmented" role="group" aria-label="Filter students">
            <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All ({all.length})</button>
            <button type="button" aria-pressed={filter === 'risk'} onClick={() => setFilter('risk')}>At risk ({all.filter((r) => r.at_risk).length})</button>
          </div>
        }
      />
    </>
  );
}

/** At-risk students with reasons, CSV and the at-risk PDF. */
export function AtRiskTable({ departmentId, showDepartment }) {
  const res = useApiResource(`/reports/at-risk${q(departmentId)}`);
  const rules = useCollegeRules();
  const pdf = usePdfDownload();
  const pdfPath = `/reports/at-risk/pdf${q(departmentId)}`;

  if (res.status === 'loading') return <LoadingState label="Loading at-risk students" />;
  if (res.status === 'failed') return <ErrorState error={res.error} onRetry={res.reload} />;
  const rows = Array.isArray(res.data) ? res.data : [];

  const columns = [
    { key: 'roll_no', header: 'Roll no', render: (r) => <span className="sp-code">{displayValue(r.roll_no, '-')}</span> },
    { key: 'name', header: 'Name' },
    ...(showDepartment ? [{ key: 'department_code', header: 'Dept' }] : []),
    { key: 'section', header: 'Section' },
    { key: 'attendance_pct', header: 'Attendance', align: 'right', render: (r) => attendanceBadge(r.attendance_pct, rules.min ?? 0), csv: (r) => r.attendance_pct ?? '' },
    { key: 'cgpa', header: 'CGPA', align: 'right', render: (r) => displayValue(r.cgpa, '-') },
    { key: 'marks_pct', header: 'Marks', align: 'right', render: (r) => (typeof r.marks_pct === 'number' ? `${r.marks_pct}%` : 'Not graded'), csv: (r) => r.marks_pct ?? '' },
    { key: 'reasons', header: 'Reasons', value: (r) => r.reasons.join('; '), render: reasonsCell },
    { key: 'pdf', header: 'Report', sortable: false, render: (r) => <StudentPdfButton row={r} pdf={pdf} />, csv: () => '' },
  ];

  return (
    <>
      <PdfError error={pdf.error} />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.student_id}
        searchPlaceholder="Search at-risk students"
        csvName="at-risk-students"
        emptyTitle="No students at risk"
        emptyMessage="Every student meets the attendance, CGPA and marks thresholds."
        caption="At-risk students"
        toolbar={
          <button type="button" className="sp-btn is-secondary is-small" onClick={() => pdf.download(pdfPath, `at-risk-students-${today()}.pdf`)} disabled={pdf.busy === pdfPath}>
            <Download size={14} /> {pdf.busy === pdfPath ? 'Preparing PDF...' : 'At-risk PDF'}
          </button>
        }
      />
    </>
  );
}

function distributionText(dist, bands) {
  const keys = orderGrades(Object.keys(dist || {}), bands);
  return keys.length ? keys.map((g) => `${g}: ${dist[g]}`).join(', ') : '';
}

/** Results per course section: average, pass rate, grade spread; chart + table with CSV. */
export function ResultsSummaryTable({ departmentId, showDepartment }) {
  const res = useApiResource(`/academics/results/summary${q(departmentId)}`);
  const rules = useCollegeRules();

  if (res.status === 'loading') return <LoadingState label="Loading results" />;
  if (res.status === 'failed') return <ErrorState error={res.error} onRetry={res.reload} />;
  const rows = Array.isArray(res.data) ? res.data : [];
  const graded = rows.filter((r) => typeof r.average_pct === 'number');

  const columns = [
    { key: 'course_code', header: 'Course', value: (r) => `${r.course_code} ${r.course_name}`, render: (r) => <><span className="sp-code">{r.course_code}</span> {r.course_name}</> },
    { key: 'section', header: 'Section' },
    ...(showDepartment ? [{ key: 'department_code', header: 'Dept' }] : []),
    { key: 'faculty_name', header: 'Teacher', render: (r) => displayValue(r.faculty_name, 'Unassigned') },
    { key: 'assessments_published', header: 'Published', align: 'right' },
    { key: 'average_pct', header: 'Average', align: 'right', render: (r) => (typeof r.average_pct === 'number' ? `${r.average_pct}%` : 'Not graded'), csv: (r) => r.average_pct ?? '' },
    {
      key: 'pass_rate', header: 'Pass rate', align: 'right', csv: (r) => r.pass_rate ?? '',
      render: (r) => (typeof r.pass_rate === 'number' ? <span className={`sp-badge ${r.pass_rate < 60 ? 'is-danger' : r.pass_rate < 85 ? 'is-warning' : 'is-success'}`}>{r.pass_rate}%</span> : 'Not graded'),
    },
    { key: 'distribution', header: 'Grades', sortable: false, value: (r) => distributionText(r.distribution, rules.bands), render: (r) => distributionText(r.distribution, rules.bands) || <span className="sp-muted">None yet</span> },
  ];

  return (
    <>
      {graded.length > 0 && (
        <div className="sp-card" style={{ marginBottom: 16 }}>
          <h3 className="sp-section-title">Average marks by section</h3>
          <SimpleBarChart
            title="Average marks by section"
            valueLabel="Average marks"
            valueSuffix="%"
            maxValue={100}
            reference={rules.passPct !== null ? { value: rules.passPct, label: `Pass mark ${rules.passPct}%` } : undefined}
            data={graded.map((r) => ({
              label: `${r.course_code} ${r.section}`,
              fullLabel: `${r.course_code} ${r.course_name} (section ${r.section})`,
              value: r.average_pct,
              note: `Pass rate ${r.pass_rate}% · ${r.assessments_published} assessment(s) published`,
            }))}
          />
        </div>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.course_section_id}
        searchPlaceholder="Search course or teacher"
        csvName="results-summary"
        emptyTitle="No course sections"
        emptyMessage="Results appear here once course sections exist and marks are published."
        caption="Results by course section"
      />
    </>
  );
}
