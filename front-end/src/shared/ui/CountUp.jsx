import React, { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Counts a number up from 0 when it first appears (or changes). Non-numeric
 * values are shown as-is. Respects "reduce motion".
 *   <CountUp value={96} suffix="%" />   <CountUp value={8.5} decimals={1} />
 */
export default function CountUp({ value, decimals = 0, suffix = '', prefix = '', duration = 700 }) {
  const numeric = typeof value === 'number' && Number.isFinite(value);
  const [shown, setShown] = useState(numeric && !prefersReducedMotion() ? 0 : value);
  const frame = useRef(null);

  useEffect(() => {
    if (!numeric || prefersReducedMotion()) {
      setShown(value);
      return undefined;
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(value * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, numeric, duration]);

  if (!numeric) return <>{value}</>;
  return (
    <span aria-label={`${prefix}${value.toFixed(decimals)}${suffix}`}>
      {prefix}
      {Number(shown).toFixed(decimals)}
      {suffix}
    </span>
  );
}
