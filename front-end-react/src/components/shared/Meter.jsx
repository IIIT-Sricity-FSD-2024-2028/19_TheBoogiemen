/**
 * Meter — a single ratio against a 0-100% limit (dataviz skill: "a single
 * ratio against a limit → meter, same-ramp track" — not a chart). The fill
 * carries severity where this app has a real defined threshold to key off
 * of; the unfilled track is a lighter step of the same color so the state
 * still reads across the whole bar, not just the filled portion.
 */

export default function Meter({ label, value, color = '#6366f1', trackColor }) {
  const pct = value === null || value === undefined ? 0 : Math.max(0, Math.min(100, value));
  const displayValue = value === null || value === undefined ? 'No data yet' : `${value}%`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 800, color }}>{displayValue}</span>
      </div>
      <div style={{ height: 10, background: trackColor || `${color}26`, borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 5, transition: 'width .3s' }} />
      </div>
    </div>
  );
}
