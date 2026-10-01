import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import CountUp from '../../../shared/ui/CountUp';
import { downloadFile } from '../../../services/apiClient';
import { apiRequestFailed } from '../../../app/apiActions';

/** Navy hero band at the top of a dashboard. stats: [{ label, value, suffix?, decimals?, note? }] */
export function HeroBand({ eyebrow, title, subtitle, actions, stats }) {
  return (
    <section className="sp-hero-band hd-hero" aria-label={title}>
      <div className="hd-hero-top">
        <div>
          {eyebrow && <p className="hd-hero-eyebrow">{eyebrow}</p>}
          <h1 className="hd-hero-title">{title}</h1>
          {subtitle && <p className="hd-hero-sub">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {stats?.length > 0 && (
        <div className="hd-hero-stats">
          {stats.map((s) => (
            <div key={s.label} className="hd-hero-stat">
              <div className="hd-hero-stat-label">{s.label}</div>
              <div className="hd-hero-stat-value">
                {typeof s.value === 'number' ? <CountUp value={s.value} decimals={s.decimals || 0} suffix={s.suffix || ''} /> : s.value}
              </div>
              {s.note && <div className="hd-hero-stat-note">{s.note}</div>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Skeleton version of the hero while the dashboard loads. */
export function HeroSkeleton() {
  return (
    <section className="sp-hero-band hd-hero" aria-hidden="true">
      <div className="sp-skeleton" style={{ height: 14, width: 120, opacity: 0.3 }} />
      <div className="sp-skeleton" style={{ height: 28, width: '50%', marginTop: 10, opacity: 0.3 }} />
      <div className="hd-hero-stats">
        {[0, 1, 2, 3].map((i) => <div key={i} className="sp-skeleton" style={{ height: 70, opacity: 0.2 }} />)}
      </div>
    </section>
  );
}

/** KPI tile for a bento grid. value may be a number (animated) or text. */
export function StatTile({ icon: Icon, label, value, suffix = '', decimals = 0, note, navy, className = '', children }) {
  return (
    <div className={`sp-card${navy ? ' is-navy' : ''} ${className}`}>
      {Icon && <div className="sp-tile-icon" aria-hidden="true"><Icon size={19} /></div>}
      <div className="sp-stat-label">{label}</div>
      <div className="sp-stat-value">
        {typeof value === 'number' ? <CountUp value={value} decimals={decimals} suffix={suffix} /> : value}
      </div>
      {note && <div className="sp-stat-note">{note}</div>}
      {children}
    </div>
  );
}

/** Downloads an authenticated PDF with busy + error state; failures are also toasted. */
export function usePdfDownload() {
  const dispatch = useDispatch();
  const [state, setState] = useState({ busy: null, error: null });
  const download = async (path, filename) => {
    setState({ busy: path, error: null });
    try {
      await downloadFile(path, filename);
      setState({ busy: null, error: null });
    } catch (err) {
      setState({ busy: null, error: err.message });
      dispatch(apiRequestFailed({ status: err.status ?? 0, message: err.message, path, method: 'GET' }));
    }
  };
  return { download, busy: state.busy, error: state.error, clearError: () => setState((s) => ({ ...s, error: null })) };
}

export const today = () => new Date().toISOString().slice(0, 10);

export function pct(value) {
  return typeof value === 'number' ? `${value}%` : 'No data';
}

/** Badge tone for an attendance percentage against the college minimum. */
export function attendanceBadge(value, min) {
  if (typeof value !== 'number') return <span className="sp-badge is-neutral">No classes</span>;
  const tone = value < min ? 'is-danger' : value < min + 10 ? 'is-warning' : 'is-success';
  return <span className={`sp-badge ${tone}`}>{value}%</span>;
}

/** Orders grade letters by the college grading bands (best first); unknown grades go last. */
export function orderGrades(grades, bands) {
  const order = Array.isArray(bands) ? bands.map((b) => b.grade) : [];
  return [...grades].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return String(a).localeCompare(String(b));
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

function useColors() {
  const [c] = useState(() => {
    const css = getComputedStyle(document.documentElement);
    const get = (n) => css.getPropertyValue(n).trim();
    return { a: get('--navy-900'), b: get('--navy-500'), grid: get('--viz-grid'), axis: get('--viz-axis'), critical: get('--viz-critical') };
  });
  return c;
}

function GroupedTooltip({ active, payload, series }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="sp-chart-tooltip">
      <strong>{row.fullLabel || row.label}</strong>
      {series.map((s) => (
        <div key={s.key}>{s.label}: {row[s.key] === null || row[s.key] === undefined ? 'No data' : `${row[s.key]}${s.suffix || ''}`}</div>
      ))}
    </div>
  );
}

/**
 * Two-series bar chart (e.g. attendance vs marks per department), both in
 * navy shades, with an optional reference line and a hidden data table.
 * series: [{ key, label, suffix? }] (max 2), data: [{ label, fullLabel?, [key]: number|null }]
 */
export function GroupedBarChart({ data, series, maxValue, reference, height = 260, title }) {
  const c = useColors();
  const colors = [c.a, c.b];
  const suffix = series[0]?.suffix || '';
  return (
    <figure style={{ margin: 0 }}>
      <div className="sp-chart" style={{ height, minHeight: height, overflow: 'hidden' }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%" debounce={100}>
          <BarChart data={data} margin={{ top: 16, right: 12, bottom: 4, left: -12 }} barCategoryGap="24%" barGap={3}>
            <CartesianGrid vertical={false} stroke={c.grid} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: c.grid }} tick={{ fill: c.axis, fontSize: 12 }} interval={0} />
            <YAxis domain={[0, maxValue ?? 'auto']} tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} tickFormatter={(v) => `${v}${suffix}`} width={52} />
            <Tooltip isAnimationActive={false} offset={14} cursor={{ fill: c.grid, opacity: 0.5 }} wrapperStyle={{ pointerEvents: 'none' }} content={<GroupedTooltip series={series} />} />
            {reference && <ReferenceLine y={reference.value} stroke={c.critical} strokeDasharray="4 4" strokeWidth={1.5} />}
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} fill={colors[i % 2]} radius={[4, 4, 0, 0]} maxBarSize={36} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="sp-legend">
        {series.map((s, i) => (
          <span key={s.key}><span className="sp-legend-swatch" style={{ background: colors[i % 2] }} />{s.label}</span>
        ))}
        {reference && (
          <span>
            <svg width="18" height="10" aria-hidden="true" style={{ marginRight: 6, verticalAlign: -1 }}>
              <line x1="0" y1="5" x2="18" y2="5" stroke={c.critical} strokeWidth="1.5" strokeDasharray="4 3" />
            </svg>
            {reference.label}
          </span>
        )}
      </div>
      <table className="sp-visually-hidden">
        <caption>{title}</caption>
        <thead>
          <tr><th scope="col">Item</th>{series.map((s) => <th key={s.key} scope="col">{s.label}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.fullLabel || d.label}</td>
              {series.map((s) => <td key={s.key}>{d[s.key] ?? 'No data'}{d[s.key] != null ? s.suffix || '' : ''}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
