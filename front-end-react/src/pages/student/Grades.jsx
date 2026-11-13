/**
 * Grades — nothing before this let a student see their own marks anywhere
 * in the app (GET /students/me/marks existed but no page ever called it).
 * Shows CGPA + predicted final grade (GET /students/me/grades, both real
 * computations from grading.ts's relative curve, not the old static
 * students[].cgpa) plus a per-course percentage/letter-grade breakdown and
 * the raw marks behind it.
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

function GradeBadge({ letter }) {
  const { bg, fg } = GRADE_COLOR[letter] || { bg: '#f1f5f9', fg: '#94a3b8' };
  return (
    <span style={{ background: bg, color: fg, borderRadius: 8, padding: '4px 12px', fontSize: 16, fontWeight: 800, display: 'inline-block', minWidth: 32, textAlign: 'center' }}>
      {letter}
    </span>
  );
}

export default function Grades() {
  const [grades, setGrades] = useState(undefined);
  const [marks, setMarks] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([apiFetch('/students/me/grades'), apiFetch('/students/me/marks')])
      .then(([g, m]) => {
        setGrades(g);
        setMarks(m);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p style={{ color: '#ef4444' }}>Failed to load grades: {error}</p>;
  if (!grades || !marks) return null;

  const marksByCourse = {};
  marks.forEach((m) => {
    (marksByCourse[m.course_code] ||= []).push(m);
  });

  return (
    <>
      <div className="stats-card" style={{ marginBottom: 20 }}>
        <div className="stats-card-header">
          <div>
            <h3>CGPA</h3>
            <p style={{ fontSize: 13, color: '#64748b' }}>Credit-weighted average across every course you have a computed grade in.</p>
          </div>
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
                            <td style={{ fontSize: 13 }}>{m.assessment_name || m.assessment_id}</td>
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
