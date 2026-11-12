/**
 * Outcomes — OUTCOMES_TRACKING_PLAN.md: the heatmap the SRS's own
 * introduction describes as the product's reason for existing ("heatmaps
 * to reveal granular strengths and weaknesses" mapped to learning
 * outcomes), which nothing in this codebase rendered before this. One cell
 * per Course Outcome (and, below it, per Program Outcome), shaded by this
 * student's own mastery % (GET /students/me/outcomes).
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

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
    <div
      title={label}
      style={{
        background: bg, color: fg, borderRadius: 10, padding: '14px 10px', textAlign: 'center',
        minWidth: 90,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>{code}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{value === null ? '—' : `${value}%`}</div>
    </div>
  );
}

export default function Outcomes() {
  const [report, setReport] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/students/me/outcomes')
      .then(setReport)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p style={{ color: '#ef4444' }}>Failed to load outcomes: {error}</p>;
  if (!report) return null;

  const byCourse = {};
  report.courseOutcomes.forEach((co) => {
    (byCourse[co.course_code] ||= []).push(co);
  });

  return (
    <>
      <div className="stats-card" style={{ marginBottom: 20 }}>
        <div className="stats-card-header">
          <div>
            <h3>Course Outcome Mastery</h3>
            <p style={{ fontSize: 13, color: '#64748b' }}>Your average % score across every assessment tagged with each outcome.</p>
          </div>
        </div>
        <div className="stats-card-body" style={{ padding: 24 }}>
          {Object.keys(byCourse).length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center' }}>No Course Outcomes have been defined for your enrolled courses yet.</p>
          ) : (
            Object.entries(byCourse).map(([courseCode, cos]) => (
              <div key={courseCode} style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#475569' }}>{courseCode}</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {cos.map((co) => (
                    <OutcomeCell key={co.lo_id} code={co.code} label={co.description} value={co.mastery} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="stats-card">
        <div className="stats-card-header">
          <div>
            <h3>Program Outcome Mastery</h3>
            <p style={{ fontSize: 13, color: '#64748b' }}>Each Program Outcome's mastery, rolled up from the Course Outcomes mapped to it (weighted by mapping strength).</p>
          </div>
        </div>
        <div className="stats-card-body" style={{ padding: 24 }}>
          {report.programOutcomes.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center' }}>No Program Outcomes defined for your college yet.</p>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {report.programOutcomes.map((po) => (
                <OutcomeCell key={po.po_id} code={po.code} label={po.description} value={po.mastery} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
