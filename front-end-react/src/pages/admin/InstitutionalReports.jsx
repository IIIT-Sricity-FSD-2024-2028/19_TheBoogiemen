/**
 * InstitutionalReports — ported from legacy fixes.js
 * renderInstitutionalReports(). Two CSV exports (built client-side from
 * already-fetched data, same as legacy — no export endpoint on the
 * backend) plus the at-risk student list.
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';

function downloadCsv(filename, lines) {
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export default function InstitutionalReports() {
  const { showToast } = useNotifications();
  const [atRisk, setAtRisk] = useState(undefined);

  useEffect(() => {
    apiFetch('/reports/at-risk')
      .then(setAtRisk)
      .catch(() => setAtRisk([]));
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
