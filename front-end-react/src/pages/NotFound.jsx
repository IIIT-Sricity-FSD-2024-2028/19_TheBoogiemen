/**
 * NotFound — catches any unmatched route, including the four actor
 * dashboards (/faculty, /admin, /spoc, /superadmin) that don't exist yet
 * as of Phase 0. /student also lands here until Phase 1 adds its route.
 */
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 22 }}>Page not found</h1>
      <p style={{ color: '#64748b' }}>This page doesn't exist yet, or the link is wrong.</p>
      <Link to="/" style={{ color: '#3b82f6' }}>Back to home</Link>
    </div>
  );
}
