/**
 * Grades — nothing before this let a student see their own marks anywhere
 * in the app (GET /students/me/marks existed but no page ever called it).
 * Shows CGPA + predicted final grade (GET /students/me/grades, both real
 * computations from grading.ts's relative curve, not the old static
 * students[].cgpa) plus a per-course percentage/letter-grade breakdown and
 * the raw marks behind it.
 */

import { useEffect } from 'react';
import { Bar, BarChart, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { downloadCsv } from '../../utils/csv';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMyGrades } from '../../features/studentGrades/studentGradesThunks';

const GRADE_COLOR = {
  O: { bg: '#86efac', fg: '#14532d' },
  A: { bg: '#bbf7d0', fg: '#14532d' },
  B: { bg: '#fef08a', fg: '#713f12' },
  C: { bg: '#fef08a', fg: '#713f12' },
  D: { bg: '#fed7aa', fg: '#7c2d12' },
  P: { bg: '#fed7aa', fg: '#7c2d12' },
  F: { bg: '#fecaca', fg: '#7f1d1d' },
};

function GradeBadge({ letter }) {
  const { bg, fg } = GRADE_COLOR[letter] || { bg: '#f1f5f9', fg: '#94a3b8' };
  return (
    <span style={{ background: bg, color: fg, borderRadius: 8, padding: '4px 12px', fontSize: 16, fontWeight: 800, display: 'inline-block', minWidth: 32, textAlign: 'center' }}>
      {letter}
    </span>
  );
}

export default function Grades() {
  const dispatch = useAppDispatch();
  const grades = useAppSelector((state) => state.studentGrades.grades);
  const marks = useAppSelector((state) => state.studentGrades.marks);
  const trend = useAppSelector((state) => state.studentGrades.trend);
  const error = useAppSelector((state) => state.studentGrades.error);

  useEffect(() => {
    dispatch(fetchMyGrades());
  }, [dispatch]);

  if (error) return <p style={{ color: '#ef4444' }}>Failed to load grades: {error}</p>;
  if (!grades || !marks) return null;

  const marksByCourse = {};
  marks.forEach((m) => {
    (marksByCourse[m.course_code] ||= []).push(m);
  });

  const exportCsv = () => {
    const lines = [
      `CGPA,${grades.cgpa === null ? 'No data yet' : grades.cgpa}`,
      `Predicted Final Grade,${grades.predictedGrade || 'No data yet'}`,
      '',
      'Course,Credits,Percentage,Grade',
      ...grades.courses.map((c) => `"${c.course_code} - ${c.course_name}",${c.credits},${c.percentage}%,${c.grade}`),
      '',
      'Assessment,Course,Marks,Max Marks,Feedback',
      ...marks.map((m) => `"${m.assessment_name || m.assessment_id}",${m.course_code},${m.marks_obtained},${m.max_marks},"${(m.feedback_text || '').replace(/"/g, '""')}"`),
    ];
    downloadCsv(`BarelyPassing_MyGrades_${new Date().toISOString().split('T')[0]}.csv`, lines);
  };

  return (
    <>
      <div className="stats-card" style={{ marginBottom: 20 }}>
        <div className="stats-card-header">
          <div>
            <h3>CGPA</h3>
            <p style={{ fontSize: 13, color: '#64748b' }}>Credit-weighted average across every course you have a computed grade in.</p>
          </div>
          <button className="btn-cancel" onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            ⬇ Export (CSV)
          </button>
        </div>
        <div className="stats-card-body" style={{ padding: 24, display: 'flex', gap: 40, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>CGPA</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#6366f1' }}>{grades.cgpa === null ? 'No data yet' : grades.cgpa}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Predicted Final Grade</div>
            <div style={{ marginTop: 6 }}>
              {grades.predictedGrade ? <GradeBadge letter={grades.predictedGrade} /> : <span style={{ color: '#94a3b8' }}>No data yet</span>}
            </div>
          </div>
        </div>
      </div>

      {trend && trend.length > 1 && (
        <div className="stats-card" style={{ marginBottom: 20 }}>
          <div className="stats-card-header">
            <div>
              <h3>CGPA Over Time</h3>
              <p style={{ fontSize: 13, color: '#64748b' }}>Your CGPA as of each graded assessment date this term.</p>
            </div>
          </div>
          <div className="stats-card-body" style={{ padding: 24 }}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  labelFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  formatter={(v) => [v === null ? 'No data yet' : v, 'CGPA']}
                  cursor={{ stroke: '#e2e8f0' }}
                />
                <Line type="monotone" dataKey="cgpa" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {grades.courses.length > 0 && (
        <div className="stats-card" style={{ marginBottom: 20 }}>
          <div className="stats-card-header">
            <h3>Subject-wise Percentage</h3>
          </div>
          <div className="stats-card-body" style={{ padding: 24 }}>
            <ResponsiveContainer width="100%" height={Math.max(100, grades.courses.length * 40)}>
              <BarChart data={grades.courses} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
                <YAxis type="category" dataKey="course_code" tick={{ fontSize: 13, fill: '#475569' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={(v, _n, p) => [`${v}% — Grade ${p.payload.grade}`, p.payload.course_name]} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="percentage" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {grades.courses.map((c) => <Cell key={c.course_id} fill={(GRADE_COLOR[c.grade] || {}).bg || '#cbd5e1'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="stats-card">
        <div className="stats-card-header">
          <div>
            <h3>Subject-wise Performance</h3>
            <p style={{ fontSize: 13, color: '#64748b' }}>Your percentage and relative-curve grade per course, and the marks behind it.</p>
          </div>
        </div>
        <div className="stats-card-body" style={{ padding: 24 }}>
          {grades.courses.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center' }}>No course has a graded assessment yet.</p>
          ) : (
            grades.courses.map((c) => {
              const courseMarks = marksByCourse[c.course_code] || [];
              return (
                <div key={c.course_id} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{c.course_code} – {c.course_name}</span>
                      <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>{c.credits} credits</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>{c.percentage}%</span>
                      <GradeBadge letter={c.grade} />
                    </div>
                  </div>
                  {courseMarks.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>No assessments graded yet.</p>
                  ) : (
                    <table className="crud-table" style={{ margin: 0 }}>
                      <thead><tr><th>Assessment</th><th style={{ textAlign: 'right' }}>Marks</th></tr></thead>
                      <tbody>
                        {courseMarks.map((m) => (
                          <tr key={m.entry_id}>
                            <td style={{ fontSize: 13 }}>
                              {m.assessment_name || m.assessment_id}
                              {m.feedback_text && (
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>💬 {m.feedback_text}</div>
                              )}
                            </td>
                            <td style={{ textAlign: 'right', fontSize: 13, fontWeight: 600 }}>{m.marks_obtained} / {m.max_marks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
