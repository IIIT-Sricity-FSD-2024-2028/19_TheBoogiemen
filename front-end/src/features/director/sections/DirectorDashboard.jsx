import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AlertTriangle, CalendarRange, ClipboardCheck, IndianRupee } from 'lucide-react';
import { fetchDirectorDashboard, selectDirectorResource } from '../directorSlice';
import { EmptyState, ErrorState, ProgressBar } from '../../../shared/ui/StatusViews';
import { displayValue, formatCurrency, formatDate } from '../../../shared/format';
import { GroupedBarChart, HeroBand, HeroSkeleton, StatTile } from '../../hod/components/common';
import '../../hod/hod.css';

export default function DirectorDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const dash = useSelector(selectDirectorResource('dashboard'));

  useEffect(() => {
    dispatch(fetchDirectorDashboard());
  }, [dispatch]);
  const reload = () => dispatch(fetchDirectorDashboard({ force: true }));

  if (dash.status === 'failed') {
    return (
      <>
        <div className="sp-page-header"><h1 className="sp-page-title">College dashboard</h1></div>
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
  const depts = d.departments || [];
  const fees = d.fees;
  const pending = d.pending || {};
  const events = d.upcoming_events || [];
  const chartData = depts.map((x) => ({ label: x.department_code, fullLabel: x.department_name, attendance: x.average_attendance, marks: x.average_marks }));
  const hasChartData = chartData.some((x) => typeof x.attendance === 'number' || typeof x.marks === 'number');

  return (
    <>
      <HeroBand
        eyebrow="Director"
        title={user?.college?.name || 'College dashboard'}
        subtitle="Every department at a glance: attendance, results, fees and approvals."
        stats={[
          { label: 'Students', value: k.students },
          { label: 'Faculty', value: k.faculty },
          { label: 'Departments', value: k.departments },
          {
            label: 'Average attendance',
            value: typeof k.average_attendance === 'number' ? k.average_attendance : 'No data',
            decimals: 1,
            suffix: typeof k.average_attendance === 'number' ? '%' : '',
          },
        ]}
      />

      <div className="sp-bento">
        <section className="sp-card sp-tile-2x2" aria-labelledby="dir-compare">
          <div className="sp-card-head">
            <h2 id="dir-compare" className="sp-section-title">Department comparison</h2>
            <button type="button" className="sp-link-btn" onClick={() => navigate('/director/departments')}>Departments</button>
          </div>
          {!depts.length ? (
            <EmptyState title="No departments yet" message="Departments appear here once they are created." />
          ) : !hasChartData ? (
            <EmptyState title="No attendance or results yet" message="The comparison appears once classes are marked and marks published." />
          ) : (
            <GroupedBarChart
              title="Department comparison"
              maxValue={100}
              height={290}
              series={[{ key: 'attendance', label: 'Average attendance', suffix: '%' }, { key: 'marks', label: 'Average marks', suffix: '%' }]}
              data={chartData}
            />
          )}
        </section>

        <div className="sp-card is-navy">
          <div className="sp-tile-icon" aria-hidden="true"><ClipboardCheck size={19} /></div>
          <div className="sp-stat-label">Pending approvals</div>
          <div className="sp-stat-value">{(pending.hod_leave || 0) + (pending.bookings || 0)}</div>
          <ul className="hd-pending-list" style={{ color: '#c7d2ea', fontSize: 13 }}>
            <li><span>HOD leave</span><span>{pending.hod_leave ?? 0}</span></li>
            <li><span>Resource bookings</span><span>{pending.bookings ?? 0}</span></li>
          </ul>
          <button type="button" className="sp-link-btn" style={{ marginTop: 10 }} onClick={() => navigate('/director/approvals')}>Review approvals</button>
        </div>

        <StatTile icon={AlertTriangle} label="At-risk students" value={k.at_risk} note="Across all departments">
          <button type="button" className="sp-link-btn" style={{ marginTop: 6 }} onClick={() => navigate('/director/academics')}>View list</button>
        </StatTile>

        {fees && (
          <StatTile
            className="sp-tile-2"
            icon={IndianRupee}
            label="Fee collection"
            value={typeof fees.collection_rate === 'number' ? fees.collection_rate : 'No fees billed'}
            decimals={1}
            suffix={typeof fees.collection_rate === 'number' ? '%' : ''}
            note={`${formatCurrency(fees.collected)} of ${formatCurrency(fees.billed)} collected · ${formatCurrency(fees.outstanding)} outstanding`}
          >
            {typeof fees.collection_rate === 'number' && (
              <div style={{ marginTop: 10 }}>
                <ProgressBar value={fees.collection_rate} label="Fee collection rate" />
              </div>
            )}
            <div className="sp-btn-row" style={{ marginTop: 10, alignItems: 'center' }}>
              {fees.counts?.overdue > 0 && <span className="sp-badge is-danger">{fees.counts.overdue} overdue</span>}
              <button type="button" className="sp-link-btn" onClick={() => navigate('/director/fees')}>Fee compliance</button>
            </div>
          </StatTile>
        )}

        <section className="sp-card sp-tile-4" aria-labelledby="dir-depts">
          <h2 id="dir-depts" className="sp-section-title">Departments</h2>
          {!depts.length ? (
            <EmptyState title="No departments yet" message="Create departments from the Departments section." />
          ) : (
            <div className="sp-table-wrap">
              <table className="sp-table">
                <thead>
                  <tr>
                    <th scope="col">Department</th>
                    <th scope="col" className="sp-num">Students</th>
                    <th scope="col" className="sp-num">Faculty</th>
                    <th scope="col" className="sp-num">Attendance</th>
                    <th scope="col" className="sp-num">Avg marks</th>
                    <th scope="col" className="sp-num">At risk</th>
                    {fees && <th scope="col" className="sp-num">Fees collected</th>}
                    <th scope="col"><span className="sp-visually-hidden">Report</span></th>
                  </tr>
                </thead>
                <tbody>
                  {depts.map((x) => (
                    <tr key={x.department_id}>
                      <td><span className="sp-code">{x.department_code}</span> {x.department_name}</td>
                      <td className="sp-num">{x.students}</td>
                      <td className="sp-num">{x.faculty}</td>
                      <td className="sp-num">{typeof x.average_attendance === 'number' ? `${x.average_attendance}%` : 'No data'}</td>
                      <td className="sp-num">{typeof x.average_marks === 'number' ? `${x.average_marks}%` : 'No data'}</td>
                      <td className="sp-num">{x.at_risk ? <span className="sp-badge is-danger">{x.at_risk}</span> : <span className="sp-badge is-success">0</span>}</td>
                      {fees && <td className="sp-num">{typeof x.fee_collection_rate === 'number' ? `${x.fee_collection_rate}%` : 'No fees'}</td>}
                      <td className="sp-num"><button type="button" className="sp-link-btn" onClick={() => navigate(`/director/departments?dept=${encodeURIComponent(x.department_id)}`)}>Report</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="sp-card sp-tile-4" aria-labelledby="dir-events">
          <div className="sp-card-head">
            <h2 id="dir-events" className="sp-section-title"><CalendarRange size={16} style={{ verticalAlign: -2, marginRight: 6 }} aria-hidden="true" />Upcoming events</h2>
            <button type="button" className="sp-link-btn" onClick={() => navigate('/director/events')}>All events</button>
          </div>
          {!events.length ? (
            <EmptyState title="No upcoming events" message="Events scheduled for the college appear here." />
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
              {events.map((e) => (
                <li key={e.event_id}>
                  <strong>{e.title}</strong> <span className="sp-muted">· {formatDate(e.date)}{e.time ? ` at ${e.time}` : ''} · {displayValue(e.venue, 'Venue to be announced')}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
