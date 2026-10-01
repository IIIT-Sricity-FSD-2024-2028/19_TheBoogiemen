import React, { useState } from 'react';
import { AlertTriangle, BookOpen, CheckSquare, Download, GraduationCap, Layers, TrendingUp, Users } from 'lucide-react';
import { useApiResource } from '../../../hooks/useApiResource';
import { SimpleBarChart } from '../../../shared/ui/Charts';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StatusViews';
import { displayValue } from '../../../shared/format';
import { StatTile, orderGrades, usePdfDownload } from './common';
import { AtRiskTable, ResultsSummaryTable, StudentStandingTable, useCollegeRules } from './ReportTables';
import '../hod.css';

/** Attendance % per course section with the college minimum as a reference line. */
export function AttendanceByCourseChart({ rows, min, height = 260 }) {
  const withClasses = (rows || []).filter((r) => typeof r.percentage === 'number');
  if (!withClasses.length) {
    return <EmptyState title="No classes recorded yet" message="The chart appears once faculty mark attendance." />;
  }
  return (
    <SimpleBarChart
      title="Attendance by course section"
      valueLabel="Attendance"
      valueSuffix="%"
      maxValue={100}
      height={height}
      reference={typeof min === 'number' ? { value: min, label: `${min}% minimum` } : undefined}
      data={withClasses.map((r) => ({
        label: r.label,
        fullLabel: `${r.course_code} ${r.course_name || ''} (section ${r.section})`,
        value: r.percentage,
        note: `${r.classes} attendance records`,
      }))}
    />
  );
}

/** Results per section: average marks, or the grade distribution summed across sections. */
export function ResultsChart({ rows, height = 240 }) {
  const rules = useCollegeRules();
  const [view, setView] = useState('average');
  const graded = (rows || []).filter((r) => typeof r.average_pct === 'number');
  const totals = {};
  (rows || []).forEach((r) => Object.entries(r.distribution || {}).forEach(([g, n]) => { totals[g] = (totals[g] || 0) + n; }));
  const grades = orderGrades(Object.keys(totals), rules.bands);

  return (
    <>
      <div className="sp-segmented" role="group" aria-label="Results view" style={{ marginBottom: 8 }}>
        <button type="button" aria-pressed={view === 'average'} onClick={() => setView('average')}>Average by section</button>
        <button type="button" aria-pressed={view === 'grades'} onClick={() => setView('grades')}>Grade distribution</button>
      </div>
      {graded.length === 0 ? (
        <EmptyState title="No published results" message="Charts appear once faculty publish assessment marks." />
      ) : view === 'average' ? (
        <SimpleBarChart
          title="Average marks by section"
          valueLabel="Average marks"
          valueSuffix="%"
          maxValue={100}
          height={height}
          reference={rules.passPct !== null ? { value: rules.passPct, label: `Pass mark ${rules.passPct}%` } : undefined}
          data={graded.map((r) => ({ label: r.label, value: r.average_pct, note: typeof r.pass_rate === 'number' ? `Pass rate ${r.pass_rate}%` : undefined }))}
        />
      ) : (
        <SimpleBarChart
          title="Grade distribution"
          valueLabel="Students"
          height={height}
          data={grades.map((g) => ({ label: g, fullLabel: `Grade ${g}`, value: totals[g] }))}
        />
      )}
    </>
  );
}

/** Overview of one department: KPIs, attendance and results charts, top at-risk students, PDF. */
export function DepartmentOverview({ departmentId }) {
  const res = useApiResource(`/reports/department/${encodeURIComponent(departmentId)}`);
  const pdf = usePdfDownload();

  if (res.status === 'loading') return <LoadingState label="Loading department report" lines={5} />;
  if (res.status === 'failed') return <ErrorState error={res.error} onRetry={res.reload} />;
  const r = res.data;
  const k = r.kpis || {};
  const min = r.attendance_min_pct;
  const pdfPath = `/reports/department/${encodeURIComponent(departmentId)}/pdf`;

  return (
    <>
      <div className="hd-tab-row">
        <div>
          <h2 className="sp-section-title" style={{ margin: 0 }}>{r.department?.department_name}</h2>
          <p className="sp-muted" style={{ margin: '2px 0 0', fontSize: 13 }}>Department code {displayValue(r.department?.department_code)}</p>
        </div>
        <button type="button" className="sp-btn is-secondary" onClick={() => pdf.download(pdfPath, `${r.department?.department_code || 'department'}-report.pdf`)} disabled={pdf.busy === pdfPath}>
          <Download size={15} /> {pdf.busy === pdfPath ? 'Preparing PDF...' : 'Department report (PDF)'}
        </button>
      </div>
      {pdf.error && <div className="sp-alert is-error" role="alert" style={{ marginBottom: 12 }}>Could not download the PDF: {pdf.error}</div>}

      <div className="sp-grid sp-grid-4" style={{ marginBottom: 18 }}>
        <StatTile navy icon={Users} label="Students" value={k.students} />
        <StatTile icon={GraduationCap} label="Faculty" value={k.faculty} />
        <StatTile icon={BookOpen} label="Courses" value={k.courses} note={`${k.sections ?? 0} sections`} />
        <StatTile icon={CheckSquare} label="Average attendance" value={typeof k.average_attendance === 'number' ? k.average_attendance : 'No data'} decimals={1} suffix={typeof k.average_attendance === 'number' ? '%' : ''} note={typeof min === 'number' ? `Minimum ${min}%` : undefined} />
        <StatTile icon={TrendingUp} label="Average marks" value={typeof k.average_marks === 'number' ? k.average_marks : 'No data'} decimals={1} suffix={typeof k.average_marks === 'number' ? '%' : ''} note="Published assessments" />
        <StatTile icon={AlertTriangle} label="At-risk students" value={k.at_risk} note="Attendance, CGPA or marks" />
        <StatTile icon={Layers} label="Pending approvals" value={(r.pending?.leave || 0) + (r.pending?.bookings || 0) + (r.pending?.corrections || 0)} note={`${r.pending?.leave ?? 0} leave · ${r.pending?.bookings ?? 0} bookings · ${r.pending?.corrections ?? 0} corrections`} />
      </div>

      <div className="sp-grid sp-grid-2">
        <section className="sp-card" aria-labelledby={`att-${departmentId}`}>
          <h3 id={`att-${departmentId}`} className="sp-section-title">Attendance by course section</h3>
          <AttendanceByCourseChart rows={r.attendance_by_course} min={min} />
        </section>
        <section className="sp-card" aria-labelledby={`res-${departmentId}`}>
          <h3 id={`res-${departmentId}`} className="sp-section-title">Results</h3>
          <ResultsChart rows={r.results_by_course} />
        </section>
      </div>
    </>
  );
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'students', label: 'Students' },
  { key: 'at-risk', label: 'At risk' },
  { key: 'results', label: 'Results' },
];

/**
 * Full department report used by the HOD Reports section and the Director's
 * department drill-down: overview, every student's standing, at-risk list and
 * results per section, each with CSV/PDF export.
 */
export default function DepartmentReport({ departmentId }) {
  const [tab, setTab] = useState('overview');
  if (!departmentId) {
    return <EmptyState title="No department linked" message="Your account is not linked to a department, so there is no report to show." />;
  }
  return (
    <>
      <div className="sp-segmented" role="group" aria-label="Report view" style={{ marginBottom: 18 }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" aria-pressed={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>
      {tab === 'overview' && <DepartmentOverview departmentId={departmentId} />}
      {tab === 'students' && <StudentStandingTable departmentId={departmentId} />}
      {tab === 'at-risk' && <AtRiskTable departmentId={departmentId} />}
      {tab === 'results' && <ResultsSummaryTable departmentId={departmentId} />}
    </>
  );
}
