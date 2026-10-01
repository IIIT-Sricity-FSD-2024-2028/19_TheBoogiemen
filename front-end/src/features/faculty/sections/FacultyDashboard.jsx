import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckSquare,
  ClipboardList,
  FileText,
  Users,
} from 'lucide-react';
import CountUp from '../../../shared/ui/CountUp';
import { SimpleBarChart } from '../../../shared/ui/Charts';
import { EmptyState, ErrorState } from '../../../shared/ui/StatusViews';
import { capitalize, formatDate } from '../../../shared/format';
import { fetchFacultyDashboard, selectFacultyResource } from '../facultySlice';
import { STATUS_TONE, todayIso } from './common';

function Kpi({ icon: Icon, label, value, note, navy, onClick, alert }) {
  return (
    <button
      type="button"
      className={`sp-card is-interactive${navy ? ' is-navy' : ''}`}
      onClick={onClick}
      style={{ textAlign: 'left', font: 'inherit', color: navy ? '#fff' : 'inherit', width: '100%' }}
    >
      <div className="sp-tile-icon" aria-hidden="true"><Icon size={19} /></div>
      <div className="sp-stat-label">
        {label}
        {alert && <span className="sp-badge is-warning">Action needed</span>}
      </div>
      <div className="sp-stat-value"><CountUp value={value} /></div>
      {note && <div className="sp-stat-note">{note}</div>}
    </button>
  );
}

function SkeletonTile({ wide, tall }) {
  return (
    <div className={`sp-card${wide ? ' sp-tile-2' : ''}${tall ? ' sp-tile-2x2' : ''}`} aria-hidden="true">
      <div className="sp-skeleton" style={{ width: 40, height: 40, borderRadius: 12, marginBottom: 12 }} />
      <div className="sp-skeleton" style={{ height: 12, width: '50%', marginBottom: 10 }} />
      <div className="sp-skeleton" style={{ height: tall ? 200 : 28, width: tall ? '100%' : '40%' }} />
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function FacultyDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const dash = useSelector(selectFacultyResource('dashboard'));
  const go = (path) => navigate(`/faculty/${path}`);

  useEffect(() => {
    // Always refresh on visit: today's "marked" flags and counts change often.
    dispatch(fetchFacultyDashboard({ force: true }));
  }, [dispatch]);

  const d = dash.status === 'succeeded' ? dash.data : null;
  const min = d?.attendance_min_pct ?? 75;
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const unmarked = d ? d.today.filter((t) => !t.attendance_marked).length : 0;
  const chartRows = d ? d.attendance_by_section.filter((r) => r.classes > 0 && typeof r.percentage === 'number') : [];

  return (
    <>
      <div className="sp-page-header">
        <div className="fac-hero-greeting" style={{ flex: '1 1 420px' }}>
          <span className="fac-hero-date">{todayLabel}</span>
          <h1 className="sp-page-title">{greeting()}{user?.first_name ? `, ${user.first_name}` : ''}</h1>
          <p className="sp-page-subtitle">
            {d
              ? d.today.length
                ? `You have ${d.today.length} class${d.today.length === 1 ? '' : 'es'} today${unmarked ? `, ${unmarked} still to mark` : ', all marked'}.`
                : 'No classes on your timetable today.'
              : 'Your teaching overview'}
          </p>
          {d && d.today.length > 0 && (
            <div className="fac-today" aria-label="Today's classes">
              {d.today.map((t) => (
                <button
                  key={t.slot_id}
                  type="button"
                  className="fac-today-item"
                  onClick={() => go(`attendance?section=${encodeURIComponent(t.course_section_id)}&date=${todayIso()}`)}
                  title="Open attendance for this class"
                >
                  <small>{t.time} · {t.room} · {capitalize(t.type)}</small>
                  <strong>{t.course_code} · Section {t.section}</strong>
                  <span className="fac-today-status">
                    {t.attendance_marked ? (
                      <span className="sp-badge is-success">Attendance marked</span>
                    ) : (
                      <span className="sp-badge is-warning">Not marked yet</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="sp-btn-row">
          <button type="button" className="sp-btn" onClick={() => go('attendance')}>
            <CheckSquare size={15} /> Mark attendance
          </button>
          <button type="button" className="sp-btn is-secondary" onClick={() => go('timetable')}>
            Weekly timetable
          </button>
        </div>
      </div>

      {dash.status === 'failed' ? (
        <div className="sp-card">
          <ErrorState error={dash.error} onRetry={() => dispatch(fetchFacultyDashboard({ force: true }))} />
        </div>
      ) : !d ? (
        <div className="sp-bento" aria-busy="true">
          <span className="sp-visually-hidden" role="status">Loading dashboard...</span>
          <SkeletonTile />
          <SkeletonTile />
          <SkeletonTile />
          <SkeletonTile />
          <SkeletonTile tall />
          <SkeletonTile wide />
          <SkeletonTile wide />
        </div>
      ) : (
        <div className="sp-bento">
          <Kpi navy icon={Users} label="My students" value={d.students} note={`Across ${d.sections.length} section${d.sections.length === 1 ? '' : 's'}`} onClick={() => go('students')} />
          <Kpi icon={BookOpen} label="Sections taught" value={d.sections.length} note={d.sections[0]?.term || 'Current term'} onClick={() => go('sections')} />
          <Kpi
            icon={ClipboardList}
            label="Pending corrections"
            value={d.pending_corrections}
            note="Student attendance requests"
            alert={d.pending_corrections > 0}
            onClick={() => go('corrections')}
          />
          <Kpi
            icon={FileText}
            label="Unpublished assessments"
            value={d.unpublished_assessments}
            note="Held but results not published"
            alert={d.unpublished_assessments > 0}
            onClick={() => go('assessments')}
          />

          <section className="sp-card sp-tile-2x2" aria-labelledby="fac-att-chart">
            <div className="sp-card-head">
              <h2 id="fac-att-chart" className="sp-section-title">Attendance by section</h2>
              <button type="button" className="sp-link-btn" onClick={() => go('sections')}>My sections</button>
            </div>
            {chartRows.length > 0 ? (
              <SimpleBarChart
                title="Average attendance by section"
                valueLabel="Average attendance"
                valueSuffix="%"
                maxValue={100}
                height={270}
                reference={{ value: min, label: `${min}% minimum` }}
                data={chartRows.map((r) => ({
                  label: r.label,
                  fullLabel: `${r.course_code} ${r.course_name} · Section ${r.section}`,
                  value: r.percentage,
                  note: `${r.classes} attendance records`,
                }))}
              />
            ) : (
              <EmptyState title="No attendance recorded yet" message="The chart fills in once you mark classes." />
            )}
          </section>

          <section className="sp-card sp-tile-2" aria-labelledby="fac-risk">
            <div className="sp-card-head">
              <h2 id="fac-risk" className="sp-section-title">
                Students at risk {d.at_risk.length > 0 && <span className="sp-badge is-danger">{d.at_risk.length}</span>}
              </h2>
              <button type="button" className="sp-link-btn" onClick={() => go('students?filter=at-risk')}>View all</button>
            </div>
            {d.at_risk.length === 0 ? (
              <EmptyState title="No students at risk" message={`Everyone is above ${min}% attendance and passing marks.`} />
            ) : (
              <ul className="fac-list">
                {d.at_risk.slice(0, 5).map((s) => (
                  <li key={s.student_id} className="fac-list-row">
                    <div className="fac-list-main">
                      <div><strong>{s.name}</strong> <span className="sp-muted">{s.roll_no} · Sec {s.section}</span></div>
                      <div className="sp-card-meta">{s.reasons.join('; ')}</div>
                    </div>
                    <span className={`sp-badge ${typeof s.attendance_pct === 'number' && s.attendance_pct < min ? 'is-danger' : 'is-warning'}`}>
                      {typeof s.attendance_pct === 'number' ? `${s.attendance_pct}%` : 'No classes'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="sp-card sp-tile-2" aria-labelledby="fac-quick">
            <h2 id="fac-quick" className="sp-section-title">Quick actions</h2>
            <div className="fac-quick">
              <button type="button" onClick={() => go('attendance')}>
                <span className="fac-quick-icon"><CheckSquare size={16} /></span> Mark attendance
                {unmarked > 0 && <span className="sp-badge is-warning fac-count">{unmarked}</span>}
              </button>
              <button type="button" onClick={() => go('assessments')}>
                <span className="fac-quick-icon"><FileText size={16} /></span> Enter marks
              </button>
              <button type="button" onClick={() => go('corrections')}>
                <span className="fac-quick-icon"><ClipboardList size={16} /></span> Review corrections
                {d.pending_corrections > 0 && <span className="sp-badge is-warning fac-count">{d.pending_corrections}</span>}
              </button>
              <button type="button" onClick={() => go('students')}>
                <span className="fac-quick-icon"><Users size={16} /></span> Schedule a meeting
              </button>
              <button type="button" onClick={() => go('sections')}>
                <span className="fac-quick-icon"><BookOpen size={16} /></span> Update syllabus
              </button>
              <button type="button" onClick={() => go('leave')}>
                <span className="fac-quick-icon"><CalendarCheck size={16} /></span> Apply for leave
              </button>
            </div>
          </section>

          <section className="sp-card sp-tile-2" aria-labelledby="fac-upcoming">
            <div className="sp-card-head">
              <h2 id="fac-upcoming" className="sp-section-title">Upcoming assessments</h2>
              <button type="button" className="sp-link-btn" onClick={() => go('assessments')}>All assessments</button>
            </div>
            {d.upcoming_assessments.length === 0 ? (
              <EmptyState title="Nothing scheduled" message="Create an assessment for one of your sections to see it here." />
            ) : (
              <ul className="fac-list">
                {d.upcoming_assessments.map((a) => {
                  const sec = d.sections.find((s) => s.course_section_id === a.course_section_id);
                  return (
                    <li key={a.assessment_id} className="fac-list-row">
                      <div className="fac-list-main">
                        <div><strong>{a.name}</strong> <span className="sp-muted">· {capitalize(a.type)}</span></div>
                        <div className="sp-card-meta">
                          <span className="sp-code">{a.course_code}</span> Section {sec?.section ?? '-'} · {a.max_marks} marks · {a.weightage}% weight
                        </div>
                      </div>
                      <span className="sp-badge is-info">{formatDate(a.date)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="sp-card sp-tile-2" aria-labelledby="fac-leave">
            <div className="sp-card-head">
              <h2 id="fac-leave" className="sp-section-title">My recent leave</h2>
              <button type="button" className="sp-link-btn" onClick={() => go('leave')}>
                Manage <ArrowRight size={13} style={{ verticalAlign: -2 }} />
              </button>
            </div>
            {d.my_leave.length === 0 ? (
              <EmptyState title="No leave applications" message="Leave you apply for will appear here with its status." />
            ) : (
              <ul className="fac-list">
                {d.my_leave.map((l) => (
                  <li key={l.leave_id} className="fac-list-row">
                    <div className="fac-list-main">
                      <div><strong>{l.leave_type}</strong> <span className="sp-muted">· {formatDate(l.start_date)} to {formatDate(l.end_date)}</span></div>
                      <div className="sp-card-meta">{l.reason}</div>
                    </div>
                    <span className={`sp-badge ${STATUS_TONE[l.status] || 'is-neutral'}`}>{capitalize(l.status)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {d.today.some((t) => !t.attendance_marked) && (
            <div className="sp-alert is-warning sp-tile-4" role="status">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                Attendance not marked yet for {d.today.filter((t) => !t.attendance_marked).map((t) => `${t.course_code} ${t.section} (${t.time})`).join(', ')}.
              </span>
              <button type="button" className="sp-link-btn" onClick={() => go('attendance')}>Mark now</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
