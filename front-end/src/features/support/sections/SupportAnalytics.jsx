import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Clock, Inbox, Timer } from 'lucide-react';
import CountUp from '../../../shared/ui/CountUp';
import { SimpleBarChart } from '../../../shared/ui/Charts';
import { EmptyState, ResourceView } from '../../../shared/ui/StatusViews';
import { useApiResource } from '../../../hooks/useApiResource';
import { formatDate } from '../../../shared/format';

function useColors() {
  const [c] = useState(() => {
    const css = getComputedStyle(document.documentElement);
    const get = (n) => css.getPropertyValue(n).trim();
    return { opened: get('--viz-series-1'), resolved: get('--navy-200'), grid: get('--viz-grid'), axis: get('--viz-axis') };
  });
  return c;
}

/** Opened vs resolved per day, two navy shades, with a hidden table for screen readers. */
function DailyChart({ days }) {
  const c = useColors();
  const data = days.map((d) => ({ ...d, label: formatDate(d.date).slice(0, 6) }));
  return (
    <figure style={{ margin: 0 }}>
      <div className="sp-chart" style={{ height: 260 }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%" debounce={100}>
          <BarChart data={data} margin={{ top: 16, right: 12, bottom: 4, left: -12 }} barGap={2}>
            <CartesianGrid vertical={false} stroke={c.grid} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: c.grid }} tick={{ fill: c.axis, fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} width={40} />
            <Tooltip isAnimationActive={false} cursor={{ fill: c.grid, opacity: 0.5 }} wrapperStyle={{ pointerEvents: 'none' }} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="opened" name="Opened" fill={c.opened} radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Bar dataKey="resolved" name="Resolved" fill={c.resolved} radius={[3, 3, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="sp-legend">
        <span><span className="sp-legend-swatch" style={{ background: c.opened }} />Opened</span>
        <span><span className="sp-legend-swatch" style={{ background: c.resolved }} />Resolved</span>
      </div>
      <table className="sp-visually-hidden">
        <caption>Tickets opened and resolved per day</caption>
        <thead><tr><th scope="col">Date</th><th scope="col">Opened</th><th scope="col">Resolved</th></tr></thead>
        <tbody>{days.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.opened}</td><td>{d.resolved}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

function Tile({ icon: Icon, label, value, suffix, decimals, note, navy, danger }) {
  return (
    <div className={`sp-card${navy ? ' is-navy' : ''}`}>
      <div className="sp-tile-icon" aria-hidden="true"><Icon size={19} /></div>
      <div className="sp-stat-label">{label}</div>
      <div className="sp-stat-value" style={danger && value > 0 ? { color: 'var(--sp-danger)' } : undefined}>
        {typeof value === 'number' ? <CountUp value={value} suffix={suffix} decimals={decimals} /> : value}
      </div>
      {note && <div className="sp-stat-note">{note}</div>}
    </div>
  );
}

export default function SupportAnalytics() {
  const res = useApiResource('/platform/analytics');

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Support analytics</h1>
          <p className="sp-page-subtitle">Volume, speed and SLA performance across all tickets.</p>
        </div>
      </div>
      <ResourceView
        resource={res}
        onRetry={res.reload}
        isEmpty={(d) => !d?.total}
        empty={<section className="sp-card"><EmptyState title="No tickets yet" message="Analytics appear once colleges raise tickets." /></section>}
      >
        {(d) => (
          <div className="sp-bento">
            <Tile navy icon={Inbox} label="Total tickets" value={d.total} note="All time" />
            <Tile icon={Clock} label="Avg first response" value={d.avg_first_response_hours ?? 'No data'} suffix=" h" decimals={1} note="Raised to first public staff reply" />
            <Tile icon={Timer} label="Avg resolution" value={d.avg_resolution_hours ?? 'No data'} suffix=" h" decimals={1} note="Raised to resolved" />
            <Tile icon={AlertTriangle} danger label="SLA breached" value={d.sla_breached} note={`${Math.round((d.sla_breached / d.total) * 100)}% of all tickets`} />

            <section className="sp-card sp-tile-4" aria-labelledby="an-daily">
              <h2 id="an-daily" className="sp-section-title">Last 14 days</h2>
              <DailyChart days={d.daily || []} />
            </section>

            <section className="sp-card sp-tile-2" aria-labelledby="an-cat">
              <h2 id="an-cat" className="sp-section-title">Tickets by category</h2>
              {d.by_category?.length ? (
                <SimpleBarChart title="Tickets by category" valueLabel="Tickets" height={240} data={d.by_category.map((x) => ({ label: x.key.split(' ')[0], fullLabel: x.key, value: x.count }))} />
              ) : <EmptyState title="No data" />}
            </section>

            <section className="sp-card sp-tile-2" aria-labelledby="an-col">
              <h2 id="an-col" className="sp-section-title">Tickets by institution</h2>
              {d.by_college?.length ? (
                <SimpleBarChart title="Tickets by institution" valueLabel="Tickets" height={240} data={d.by_college.map((x) => ({ label: x.name.split(' ')[0], fullLabel: x.name, value: x.count }))} />
              ) : <EmptyState title="No data" />}
            </section>
          </div>
        )}
      </ResourceView>
    </>
  );
}
