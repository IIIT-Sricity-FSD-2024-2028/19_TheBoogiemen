import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AlertTriangle, BookOpen, ClipboardCheck, Download, TrendingUp } from 'lucide-react';
import { fetchHodDashboard, selectHodResource } from '../hodSlice';
import { ErrorState, EmptyState } from '../../../shared/ui/StatusViews';
import { displayValue } from '../../../shared/format';
import { HeroBand, HeroSkeleton, StatTile, attendanceBadge, usePdfDownload } from '../components/common';
import { AttendanceByCourseChart, ResultsChart } from '../components/DepartmentReport';
import '../hod.css';

export default function HodDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const dash = useSelector(selectHodResource('dashboard'));
  const pdf = usePdfDownload();

  useEffect(() => {
    dispatch(fetchHodDashboard());
  }, [dispatch]);

  const reload = () => dispatch(fetchHodDashboard({ force: true }));

  if (dash.status === 'failed') {
    return (
      <>
        <div className="sp-page-header"><h1 className="sp-page-title">Department dashboard</h1></div>
        <div className="sp-card"><ErrorState error={dash.error} onRetry={reload} /></div>
      </>
    );
  }
  if (dash.status !== 'succeeded') {
    return (
      <>
        <HeroSkeleton />
        <div className="sp-bento">
          <div className="sp-card sp-tile-2x2"><div className="sp-skeleton" style={{ height: 260 }} /></div>
          {[0, 1, 2, 3].map((i) => <div key={i} className="sp-card"><div className="sp-skeleton" style={{ height: 90 }} /></div>)}
        </div>
      </>
    );
  }

  const d = dash.data;
  const k = d.kpis || {};
  const min = d.attendance_min_pct;
  const pending = d.pending || {};
  const pendingTotal = (pending.leave || 0) + (pending.bookings || 0) + (pending.corrections || 0);
  const deptId = d.department?.department_id;
  const pdfPath = `/reports/department/${deptId}/pdf`;

  return (
    <>
      <HeroBand
        eyebrow={`Head of department · ${displayValue(d.department?.department_code)}`}
        title={d.department?.department_name || 'Department dashboard'}
        subtitle="Live attendance, results and approvals for your department."
        actions={
          <button type="button" className="sp-btn is-light" onClick={() => pdf.download(pdfPath, `${d.department?.department_code || 'department'}-report.pdf`)} disabled={pdf.busy === pdfPath}>
            <Download size={15} /> {pdf.busy === pdfPath ? 'Preparing PDF...' : 'Department report'}
          </button>
        }
        stats={[
          { label: 'Students', value: k.students },
          { label: 'Faculty', value: k.faculty },
          { label: 'Courses', value: k.courses, note: `${k.sections ?? 0} sections` },
          {
            label: 'Average attendance',
            value: typeof k.average_attendance === 'number' ? k.average_attendance : 'No data',
            decimals: 1,
            suffix: typeof k.average_attendance === 'number' ? '%' : '',
            note: typeof min === 'number' ? `Minimum ${min}%` : undefined,
          },
        ]}
      />
      {pdf.error && <div className="sp-alert is-error" role="alert" style={{ marginBottom: 16 }}>Could not download the report: {pdf.error}</div>}

      <div className="sp-bento">
        <section className="sp-card sp-tile-2x2" aria-labelledby="hod-att">
          <div className="sp-card-head">
            <h2 id="hod-att" className="sp-section-title">Attendance by course section</h2>
            <button type="button" className="sp-link-btn" onClick={() => navigate('/hod/reports')}>Reports</button>
          </div>
          <AttendanceByCourseChart rows={d.attendance_by_course} min={min} height={280} />
        </section>

        <div className="sp-card is-navy">
          <div className="sp-tile-icon" aria-hidden="true"><ClipboardCheck size={19} /></div>
          <div className="sp-stat-label">Pending approvals</div>
          <div className="sp-stat-value">{pendingTotal}</div>
          <ul className="hd-pending-list" style={{ color: '#c7d2ea', fontSize: 13 }}>
            <li><span>Leave requests</span><span>{pending.leave ?? 0}</span></li>
            <li><span>Resource bookings</span><span>{pending.bookings ?? 0}</span></li>
            <li><span>Attendance corrections</span><span>{pending.corrections ?? 0}</span></li>
          </ul>
          <button type="button" className="sp-link-btn" style={{ marginTop: 10 }} onClick={() => navigate('/hod/approvals')}>Review approvals</button>
        </div>

        <StatTile icon={AlertTriangle} label="At-risk students" value={k.at_risk} note="Low attendance, CGPA or marks" />
        <StatTile icon={TrendingUp} label="Average marks" value={typeof k.average_marks === 'number' ? k.average_marks : 'No data'} decimals={1} suffix={typeof k.average_marks === 'number' ? '%' : ''} note="Across published assessments" />
        <StatTile icon={BookOpen} label="Course sections" value={k.sections} note={`${k.courses ?? 0} courses`}>
          <button type="button" className="sp-link-btn" style={{ marginTop: 6 }} onClick={() => navigate('/hod/courses')}>Manage</button>
        </StatTile>

        <section className="sp-card sp-tile-2" aria-labelledby="hod-results">
          <h2 id="hod-results" className="sp-section-title">Results</h2>
          <ResultsChart rows={d.results_by_course} />
        </section>

        <section className="sp-card sp-tile-2" aria-labelledby="hod-risk">
          <div className="sp-card-head">
            <h2 id="hod-risk" className="sp-section-title">Students at risk</h2>
            <button type="button" className="sp-link-btn" onClick={() => navigate('/hod/reports')}>Full list</button>
          </div>
          {!d.at_risk?.length ? (
            <EmptyState title="No students at risk" message="Every student meets the attendance, CGPA and marks thresholds." />
          ) : (
            <div className="sp-table-wrap">
              <table className="sp-table">
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col" className="sp-num">Attendance</th>
                    <th scope="col" className="sp-num">CGPA</th>
                    <th scope="col">Reasons</th>
                  </tr>
                </thead>
                <tbody>
                  {d.at_risk.map((s) => (
                    <tr key={s.student_id}>
                      <td>{s.name}<div className="sp-card-meta"><span className="sp-code">{s.roll_no}</span> · Section {displayValue(s.section, '-')}</div></td>
                      <td className="sp-num">{attendanceBadge(s.attendance_pct, min ?? 0)}</td>
                      <td className="sp-num">{displayValue(s.cgpa, '-')}</td>
                      <td style={{ fontSize: 13 }}>{s.reasons.join('; ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {k.at_risk > (d.at_risk?.length || 0) && (
            <p className="sp-hint" style={{ marginTop: 8 }}>Showing {d.at_risk.length} of {k.at_risk}. See Reports for everyone.</p>
          )}
        </section>
      </div>
    </>
  );
}
