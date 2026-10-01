import React, { useMemo, useState } from 'react';
import { useApiResource } from '../../../hooks/useApiResource';
import { EmptyState, ErrorState, LoadingState, ProgressBar } from '../../../shared/ui/StatusViews';
import { SimpleBarChart } from '../../../shared/ui/Charts';
import { capitalize, displayValue, formatDate } from '../../../shared/format';

/**
 * Published results from GET /api/academics/results/me:
 *   { grading: { scale, pass_pct, bands[] }, courses: [{ course_code, obtained, max, percentage, grade, grade_points }],
 *     assessments: [{ entry_id, assessment_name, assessment_type, course_code, marks_obtained, max_marks, percentage, grade, date }] }
 * Grades are computed by the server from the college's grading bands.
 */
export default function StudentResults() {
  const results = useApiResource('/academics/results/me');
  const [courseFilter, setCourseFilter] = useState('all');

  const data = results.data;
  const courses = Array.isArray(data?.courses) ? data.courses : [];
  const assessments = useMemo(() => {
    const all = Array.isArray(data?.assessments) ? data.assessments : [];
    const filtered = courseFilter === 'all' ? all : all.filter((a) => a.course_id === courseFilter);
    return [...filtered].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [data, courseFilter]);
  const passPct = typeof data?.grading?.pass_pct === 'number' ? data.grading.pass_pct : null;
  const bands = Array.isArray(data?.grading?.bands) ? data.grading.bands : [];
  const passTone = (pct) => (passPct === null || typeof pct !== 'number' ? 'neutral' : pct < passPct ? 'danger' : 'success');

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Results</h1>
          <p className="sp-page-subtitle">Published marks and the grades they earn, per course and per assessment.</p>
        </div>
      </div>

      {results.status === 'loading' && <LoadingState label="Loading results..." lines={5} />}
      {results.status === 'failed' && <ErrorState error={results.error} onRetry={results.reload} />}
      {results.status === 'succeeded' && courses.length === 0 && (
        <div className="sp-card">
          <EmptyState title="No results published yet" message="Your results appear here once faculty publish marks for an assessment." />
        </div>
      )}

      {results.status === 'succeeded' && courses.length > 0 && (
        <>
          <div className="sp-grid sp-grid-form">
            <section className="sp-card" aria-labelledby="res-chart">
              <h2 id="res-chart" className="sp-section-title">Score by course</h2>
              <SimpleBarChart
                title="Published score by course"
                valueLabel="Score"
                valueSuffix="%"
                maxValue={100}
                height={220}
                reference={passPct !== null ? { value: passPct, label: `${passPct}% to pass` } : undefined}
                data={courses.map((c) => ({
                  label: c.course_code,
                  fullLabel: `${c.course_code} ${c.course_name}`,
                  value: c.percentage,
                  note: `${c.obtained} of ${c.max} marks · grade ${c.grade}`,
                }))}
              />
            </section>
            <section className="sp-card" aria-labelledby="res-courses">
              <h2 id="res-courses" className="sp-section-title">Course grades</h2>
              <div className="sp-table-wrap">
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th scope="col">Course</th>
                      <th scope="col" className="sp-num">Marks</th>
                      <th scope="col" style={{ minWidth: 140 }}>Score</th>
                      <th scope="col">Grade</th>
                      <th scope="col" className="sp-num">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((c) => (
                      <tr key={c.course_id}>
                        <td><span className="sp-code">{c.course_code}</span><div>{c.course_name}</div></td>
                        <td className="sp-num">{c.obtained} / {c.max}</td>
                        <td>
                          <strong>{displayValue(c.percentage, '-')}{typeof c.percentage === 'number' ? '%' : ''}</strong>
                          <ProgressBar value={c.percentage} tone={passTone(c.percentage)} label={`${c.course_name} score`} />
                        </td>
                        <td><span className={`sp-badge ${passTone(c.percentage) === 'danger' ? 'is-danger' : 'is-info'}`}>{displayValue(c.grade, '-')}</span></td>
                        <td className="sp-num">{displayValue(c.grade_points, '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="sp-hint" style={{ marginTop: 10 }}>Course grades are based on the assessments published so far and may change as more are published.</p>
            </section>
          </div>

          <section className="sp-section" aria-labelledby="res-assessments">
            <div className="sp-page-header" style={{ marginBottom: 12 }}>
              <h2 id="res-assessments" className="sp-section-title" style={{ margin: 0 }}>Assessments</h2>
              <div className="sp-field" style={{ minWidth: 220 }}>
                <label htmlFor="res-course" className="sp-visually-hidden">Filter by course</label>
                <select id="res-course" className="sp-select" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
                  <option value="all">All courses</option>
                  {courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.course_code} — {c.course_name}</option>)}
                </select>
              </div>
            </div>
            {assessments.length === 0 ? (
              <div className="sp-card"><EmptyState title="No assessments" message="No published assessments for this course yet." /></div>
            ) : (
              <div className="sp-table-wrap">
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th scope="col">Assessment</th>
                      <th scope="col">Course</th>
                      <th scope="col">Date</th>
                      <th scope="col" className="sp-num">Marks</th>
                      <th scope="col" className="sp-num">Score</th>
                      <th scope="col">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.map((a) => (
                      <tr key={a.entry_id}>
                        <td>
                          {displayValue(a.assessment_name, 'Assessment')}
                          <div className="sp-card-meta">{capitalize(a.assessment_type)}{typeof a.weightage === 'number' ? ` · weightage ${a.weightage}%` : ''}</div>
                        </td>
                        <td><span className="sp-code">{a.course_code}</span></td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(a.date)}</td>
                        <td className="sp-num">{a.marks_obtained} / {a.max_marks}</td>
                        <td className="sp-num">{displayValue(a.percentage, '-')}{typeof a.percentage === 'number' ? '%' : ''}</td>
                        <td><span className={`sp-badge ${passTone(a.percentage) === 'danger' ? 'is-danger' : 'is-info'}`}>{displayValue(a.grade, '-')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {bands.length > 0 && (
            <section className="sp-card sp-section" aria-labelledby="res-bands">
              <h2 id="res-bands" className="sp-section-title">Grading scale</h2>
              <p className="sp-muted" style={{ marginTop: 0 }}>
                {data.grading.scale ? `${data.grading.scale.replace('pt', '-point')} scale. ` : ''}
                {passPct !== null ? `Pass mark ${passPct}%.` : ''}
              </p>
              <div className="sp-btn-row">
                {bands.map((b) => (
                  <span key={b.grade} className="sp-badge is-neutral">{b.grade}: {b.min_pct}%+ · {b.points} pts</span>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
