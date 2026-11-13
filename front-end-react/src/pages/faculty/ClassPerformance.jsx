/**
 * ClassPerformance — nothing before this let a faculty member see a course
 * as a whole; StudentOverview.jsx is a flat per-student card list across
 * every course they teach, no per-course grouping or aggregation at all.
 * Composes two already-built-but-disconnected pieces: GET
 * /faculty/me/class-performance (new — grade distribution, class average,
 * per-assessment average, attendance, at-risk count, all from grading.ts's
 * relative curve) and GET /faculty/me/outcomes (existed, routed, fully
 * working — just had zero callers until now), reduced here to a class
 * average per CO rather than the raw per-student grid that endpoint
 * returns (that raw grid is StudentOverview's/a future detail view's job).
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

const GRADE_COLOR = {
  O: { bg: '#86efac', fg: '#14532d' },
  A: { bg: '#bbf7d0', fg: '#14532d' },
  B: { bg: '#fef08a', fg: '#713f12' },
  C: { bg: '#fef08a', fg: '#713f12' },
  D: { bg: '#fed7aa', fg: '#7c2d12' },
  P: { bg: '#fed7aa', fg: '#7c2d12' },
  F: { bg: '#fecaca', fg: '#7f1d1d' },
};

const GRADE_ORDER = ['O', 'A', 'B', 'C', 'D', 'P', 'F'];

function masteryColor(value) {
  if (value === null || value === undefined) return { bg: '#f1f5f9', fg: '#94a3b8' };
  if (value < 40) return { bg: '#fecaca', fg: '#7f1d1d' };
  if (value < 60) return { bg: '#fed7aa', fg: '#7c2d12' };
  if (value < 75) return { bg: '#fef08a', fg: '#713f12' };
  if (value < 90) return { bg: '#bbf7d0', fg: '#14532d' };
  return { bg: '#86efac', fg: '#14532d' };
}

function OutcomeCell({ code, label, value }) {
  const { bg, fg } = masteryColor(value);
  return (
    <div title={label} style={{ background: bg, color: fg, borderRadius: 10, padding: '14px 10px', textAlign: 'center', minWidth: 90 }}>
      <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>{code}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{value === null ? '—' : `${value}%`}</div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || '#0f172a' }}>{value}</div>
    </div>
  );
}

/** Average of report.students[].mastery[].value for one CO code, skipping
 *  students with no value for it — the same "don't count what wasn't
 *  measured" convention outcome-mastery.ts itself uses. */
function classAverageForOutcome(report, loId) {
  if (!report) return null;
  const values = report.students
    .map((s) => s.mastery.find((m) => m.lo_id === loId)?.value)
    .filter((v) => v !== null && v !== undefined);
  if (!values.length) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export default function ClassPerformance() {
  const [courses, setCourses] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [performance, setPerformance] = useState(undefined);
  const [outcomes, setOutcomes] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/faculty/me/courses').then(setCourses).catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    if (!courseId) {
      setPerformance(undefined);
      setOutcomes(undefined);
      return;
    }
    setPerformance(undefined);
    setOutcomes(undefined);
    setError(null);
    Promise.all([
      apiFetch(`/faculty/me/class-performance?course_id=${courseId}`),
      apiFetch(`/faculty/me/outcomes?course_id=${courseId}`).catch(() => null),
    ])
      .then(([perf, out]) => {
        setPerformance(perf);
        setOutcomes(out);
      })
      .catch((e) => setError(e.message));
  }, [courseId]);

  const maxBand = performance
    ? Math.max(1, ...GRADE_ORDER.map((g) => performance.grade_distribution[g] || 0))
    : 1;
  const totalGraded = performance ? performance.total_enrolled - performance.ungraded_count : 0;

  return (
    <div className="stats-card">
      <div className="stats-card-header"><h3>Class Performance</h3></div>
      <div className="stats-card-body" style={{ padding: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Course</label>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} style={{ width: '100%', maxWidth: 420, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}>
            <option value="">{courses === null ? 'Loading…' : '— Select Course —'}</option>
            {courses?.map((c) => (
              <option key={c.course_id} value={c.course_id}>
                {c.course_code} - {c.course_name}{c.sections && c.sections.length > 1 ? ` (${c.sections.length} sections)` : ''}
              </option>
            ))}
          </select>
        </div>

        {error && <p style={{ color: '#ef4444' }}>Failed to load: {error}</p>}

        {!courseId ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>Select a course above to see its class performance.</p>
        ) : !performance ? null : (
          <>
            <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginBottom: 28, padding: 16, background: '#f8fafc', borderRadius: 10 }}>
              <Stat label="Class Average" value={performance.class_average_percentage === null ? '—' : `${performance.class_average_percentage}%`} color="#6366f1" />
              <Stat label="Attendance" value={performance.attendance.class_average_pct === null ? '—' : `${performance.attendance.class_average_pct}%`} color="#2563eb" />
              <Stat label="At Risk" value={performance.at_risk_count} color={performance.at_risk_count > 0 ? '#ef4444' : '#16a34a'} />
              <Stat label="Total Students" value={performance.total_enrolled} />
            </div>

            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#475569' }}>GRADE DISTRIBUTION</h4>
            <div style={{ marginBottom: 10 }}>
              {GRADE_ORDER.map((g) => {
                const count = performance.grade_distribution[g] || 0;
                const { bg, fg } = GRADE_COLOR[g];
                return (
                  <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ background: bg, color: fg, borderRadius: 6, padding: '2px 10px', fontSize: 13, fontWeight: 800, minWidth: 24, textAlign: 'center' }}>{g}</span>
                    <div style={{ flex: 1, height: 16, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(count / maxBand) * 100}%`, background: bg }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#475569', minWidth: 20, textAlign: 'right' }}>{count}</span>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 28 }}>
              {totalGraded} of {performance.total_enrolled} student(s) graded{performance.ungraded_count > 0 ? ` — ${performance.ungraded_count} not yet graded` : ''}.
            </p>

            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#475569' }}>PER-ASSESSMENT CLASS AVERAGE</h4>
            {performance.assessments.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: 13 }}>No assessments created for this course yet.</p>
            ) : (
              <table className="crud-table" style={{ marginBottom: 28 }}>
                <thead><tr><th>Assessment</th><th>Type</th><th style={{ textAlign: 'right' }}>Class Average</th></tr></thead>
                <tbody>
                  {performance.assessments.map((a) => (
                    <tr key={a.assessment_id}>
                      <td style={{ fontSize: 13 }}>{a.name}</td>
                      <td style={{ fontSize: 13, color: '#64748b' }}>{a.type}</td>
                      <td style={{ textAlign: 'right', fontSize: 13, fontWeight: 700 }}>
                        {a.average === null ? <span style={{ color: '#94a3b8', fontWeight: 400 }}>Not graded yet</span> : `${a.average}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#475569' }}>COURSE OUTCOME MASTERY (CLASS AVERAGE)</h4>
            {!outcomes || outcomes.outcomes.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: 13 }}>No Course Outcomes defined for this course yet.</p>
            ) : (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {outcomes.outcomes.map((co) => (
                  <OutcomeCell key={co.lo_id} code={co.code} label={co.description} value={classAverageForOutcome(outcomes, co.lo_id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
