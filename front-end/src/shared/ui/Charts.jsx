import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/** Chart colours come from the CSS variables in styles.css (SVG attributes cannot read var()). */
function useChartColors() {
  const [colors] = useState(() => {
    const css = getComputedStyle(document.documentElement);
    const get = (name) => css.getPropertyValue(name).trim();
    return { series: get('--viz-series-1'), critical: get('--viz-critical'), grid: get('--viz-grid'), axis: get('--viz-axis'), text: get('--sp-text') };
  });
  return colors;
}

function ChartTooltip({ active, payload, valueSuffix, valueLabel }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="sp-chart-tooltip">
      <strong>{row.fullLabel || row.label}</strong>
      {valueLabel}: {row.value}
      {valueSuffix}
      {row.note && <div className="sp-muted">{row.note}</div>}
    </div>
  );
}

/**
 * Single-series bar chart for comparing a value across categories (e.g.
 * attendance % per course). One colour — the bars share one meaning — with an
 * optional labelled reference line (e.g. the 75% attendance requirement).
 * A visually hidden table carries the same numbers for screen readers.
 *
 * data: [{ label, value, fullLabel?, note? }]
 */
export function SimpleBarChart({ data, valueLabel, valueSuffix = '', maxValue, reference, height = 240, title }) {
  const c = useChartColors();
  return (
    <figure style={{ margin: 0 }}>
      <div className="sp-chart" style={{ height, minHeight: height, overflow: 'hidden' }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%" debounce={100}>
          <BarChart data={data} margin={{ top: 16, right: 12, bottom: 4, left: -12 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke={c.grid} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: c.grid }} tick={{ fill: c.axis, fontSize: 12 }} interval={0} />
            <YAxis
              domain={[0, maxValue ?? 'auto']}
              tickLine={false}
              axisLine={false}
              tick={{ fill: c.axis, fontSize: 12 }}
              tickFormatter={(v) => `${v}${valueSuffix}`}
              width={52}
            />
            {/* No tooltip animation: an animated tooltip slides after the pointer and
                makes the chart look like it is shaking. */}
            <Tooltip
              isAnimationActive={false}
              offset={14}
              cursor={{ fill: c.grid, opacity: 0.5 }}
              wrapperStyle={{ pointerEvents: 'none' }}
              content={<ChartTooltip valueSuffix={valueSuffix} valueLabel={valueLabel} />}
            />
            {reference && (
              <ReferenceLine
                y={reference.value}
                stroke={c.critical}
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
            )}
            <Bar dataKey="value" fill={c.series} radius={[4, 4, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="sp-legend">
        <span><span className="sp-legend-swatch" style={{ background: c.series }} />{valueLabel}</span>
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
          <tr><th scope="col">Item</th><th scope="col">{valueLabel}</th></tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}><td>{d.fullLabel || d.label}</td><td>{d.value}{valueSuffix}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
