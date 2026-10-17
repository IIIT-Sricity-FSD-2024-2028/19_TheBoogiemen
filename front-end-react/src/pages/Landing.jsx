/**
 * Landing — ported from legacy front-end/index.html, content and layout
 * unchanged. A redesign is explicitly out of scope for this migration (see
 * FRONTEND_REACT_MIGRATION_PLAN.md §0/§6) — this is a structural port only.
 */

import { Link } from 'react-router-dom';
import '../styles/landing.css';

export default function Landing() {
  return (
    <div className="landing">
      <nav>
        <div className="logo">BarelyPassing</div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <Link to="/onboarding" className="btn btn-outline">Onboard Your Institution</Link>
          <Link to="/login" className="btn btn-primary" style={{ padding: '8px 20px' }}>Sign In</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-glow" />
        <h1>
          Modernize your campus with <span>BarelyPassing</span>
        </h1>
        <p>
          A completely unified portal for Outcome-Based Education, managing everything from
          student attendance and faculty workloads to institutional accreditation reporting.
        </p>
        <div className="hero-btns">
          <Link to="/onboarding" className="btn btn-primary">Onboard Your Institution</Link>
          <Link to="/login" className="btn btn-outline">Login to Dashboard</Link>
        </div>
      </section>

      <section className="features" id="features">
        <h2 className="section-title">Everything you need to run an institution</h2>
        <div className="grid-3">
          <div className="feature-card">
            <div className="feature-icon">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 20v-6M6 20v-4M18 20V10M2 20h20M4 10l8-8 8 8"></path>
              </svg>
            </div>
            <h3>Academic Progress</h3>
            <p>Track CGPA, calculate Outcome-Based Education (OBE) mapping for NAAC/NBA automatically, and flag at-risk students for early intervention.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 100 8 4 4 0 000-8z"></path>
              </svg>
            </div>
            <h3>Role-Based Workflows</h3>
            <p>Secure login portals segregated perfectly for Students, Faculty, Academic Heads, and the Super-Admin. Every user only sees what they need to.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <h3>Event &amp; Leave Scheduling</h3>
            <p>Fully automated approval pipelines for leave processing and built-in institutional event schedulers accessible across all hierarchy levels.</p>
          </div>
        </div>
      </section>

      <footer>&copy; 2026 BarelyPassing Educational Platforms. Designed for IIITS. All rights reserved.</footer>
    </div>
  );
}
