/**
 * InstitutionalReports — ported from legacy fixes.js
 * renderInstitutionalReports(). Two CSV exports (built client-side from
 * already-fetched data, same as legacy — no export endpoint on the
 * backend) plus the at-risk student list. The three KPI meters and the
 * at-risk-cause breakdown chart are new — this page used to be all
 * text/numbers, no visual element of any kind.
 */

import { useEffect, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiFetch } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';
import Meter from '../../components/shared/Meter';

function downloadCsv(filename, lines) {
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

/** Backend formats these as "82%" / "No data yet" (reports/overview) —
 *  pull the leading number back out, or null when there isn't one. */
function parsePct(s) {
  const m = /^(\d+(\.\d+)?)/.exec(s || '');
  return m ? Number(m[1]) : null;
}

// Mirrors RISK_THRESHOLDS.MIN_ATTENDANCE_PCT in back-end/src/common/academic-rules.ts
// — the one metric here with a real defined threshold to key severity off of.
const MIN_ATTENDANCE_PCT = 75;
const NEUTRAL_ACCENT = '#6366f1';

// Validated via the dataviz skill's validate_palette.js (categorical, light
// mode, all 5 checks pass): violet / red / teal.
const RISK_CAUSE_COLOR = { 'Low CGPA': '#7c3aed', 'Low Attendance': '#ef4444', Both: '#0d9488' };

function AtRiskCauseChart({ atRisk }) {
  const buckets = { 'Low CGPA': 0, 'Low Attendance': 0, Both: 0 };
  atRisk.forEach((s) => {
    const reasons = s.risk_reasons || [];
    const lowCgpa = reasons.some((r) => r.startsWith('CGPA'));
    const lowAttendance = reasons.some((r) => r.startsWith('Attendance'));
    if (lowCgpa && lowAttendance) buckets.Both++;
    else if (lowCgpa) buckets['Low CGPA']++;
    else if (lowAttendance) buckets['Low Attendance']++;
  });
  const data = Object.entries(buckets).map(([cause, count]) => ({ cause, count }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="cause" tick={{ fontSize: 13, fill: '#475569' }} axisLine={false} tickLine={false} width={110} />
        <Tooltip formatter={(v) => [`${v} student${v === 1 ? '' : 's'}`, 'Count']} cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {data.map((d) => <Cell key={d.cause} fill={RISK_CAUSE_COLOR[d.cause]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function InstitutionalReports() {
  const { showToast } = useNotifications();
  const [atRisk, setAtRisk] = useState(undefined);
  const [overview, setOverview] = useState(undefined);

  useEffect(() => {
    apiFetch('/reports/at-risk')
      .then(setAtRisk)
      .catch(() => setAtRisk([]));
    apiFetch('/reports/overview')
      .then((data) => setOverview(data.summary))
      .catch(() => setOverview(null));
  }, []);

  const exportNba = () => {
    const lines = ['Student Name,ID,CGPA,Attendance %,Status'];
    (atRisk || []).forEach((s) => lines.push(`"${s.first_name} ${s.last_name || ''}",${s.user_id},${s.cgpa || 'N/A'},${s.attendance_pct || 'N/A'}%,At-Risk`));
    downloadCsv('BarelyPassing_NBA_Report_' + new Date().toISOString().split('T')[0] + '.csv', lines);
    showToast('NBA/NAAC Report downloaded!', 'success');
  };

  const exportCohort = async () => {
    try {
      const overview = await apiFetch('/reports/overview');
      const s = overview.summary || {};
      const lines = [
        'Metric,Value',
        `Total Students,${s.total_students || 0}`,
        `Total Faculty,${s.total_faculty || 0}`,
        `Total Courses,${s.total_courses || 0}`,
        `Active Research Projects,${s.active_research || 0}`,
        `Overall Attendance,${s.overall_attendance || 'N/A'}`,
        `Fee Compliance,${s.fee_compliance || 'N/A'}`,
        `At-Risk Students,${(atRisk || []).length}`,
        `Report Generated,${new Date().toLocaleString()}`,
      ];
      downloadCsv('BarelyPassing_CohortAnalysis_' + new Date().toISOString().split('T')[0] + '.csv', lines);
      showToast('Cohort Analysis exported!', 'success');
    } catch (e) {
      showToast('Export failed: ' + e.message, 'error');
    }
  };

  return (
    <div className="stats-card">
      <div className="stats-card-header"><h3>Institutional Performance</h3></div>
      <div className="stats-card-body" style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <button className="submit-btn" onClick={exportNba} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            ⬇ Export NBA/NAAC Report (CSV)
          </button>
          <button className="btn-cancel" onClick={exportCohort} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            ⬇ Export Cohort Analysis (CSV)
          </button>
        </div>
        <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#64748b', border: '1px solid #e2e8f0' }}>
          📊 Click either button to load and export data. Includes at-risk students, attainment metrics, and cohort analytics.
        </div>

        {overview && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginTop: 24, padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
            <Meter
              label="Overall Attendance"
              value={parsePct(overview.overall_attendance)}
              color={(parsePct(overview.overall_attendance) ?? 100) >= MIN_ATTENDANCE_PCT ? '#16a34a' : '#ef4444'}
            />
            <Meter label="Fee Compliance" value={parsePct(overview.fee_compliance)} color={NEUTRAL_ACCENT} />
            <Meter label="Avg CO Attainment" value={parsePct(overview.avg_co_attainment)} color={NEUTRAL_ACCENT} />
          </div>
        )}

        {atRisk && atRisk.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#475569' }}>AT-RISK BY CAUSE</h4>
            <AtRiskCauseChart atRisk={atRisk} />
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          {atRisk === undefined ? null : atRisk.length === 0 ? (
            <p style={{ color: '#16a34a', fontWeight: 600 }}>✓ No at-risk students found.</p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h4 style={{ margin: 0, color: '#ef4444' }}>⚠ At-Risk Students ({atRisk.length})</h4>
              </div>
              {atRisk.map((s) => (
                <div key={s.user_id} style={{ padding: '14px 16px', borderLeft: '4px solid #ef4444', background: '#fef2f2', marginBottom: 8, borderRadius: '0 8px 8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#111' }}>
                      {s.first_name} {s.last_name || ''} <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>({s.user_id})</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#991b1b', marginTop: 3 }}>CGPA: {s.cgpa || 'N/A'} &nbsp;|&nbsp; Attendance: {s.attendance_pct || 'N/A'}%</div>
                  </div>
                  <span style={{ padding: '4px 10px', background: '#fee2e2', color: '#ef4444', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>AT RISK</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
