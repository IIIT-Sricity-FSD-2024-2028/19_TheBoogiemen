import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAuth } from '../auth/authSlice';
import { homeForRole } from '../../app/roleRoutes';

export default function PublicNav() {
  const { status, user } = useSelector(selectAuth);
  return (
    <header className="sp-public-nav">
      <Link to="/" className="sp-brand">
        <span className="sp-brand-mark" aria-hidden="true">BP</span>
        BarelyPassing
      </Link>
      <nav className="sp-public-links" aria-label="Site">
        <a href="/#features">Features</a>
        <a href="/#roles">Portals</a>
        <a href="/#pricing">Pricing</a>
      </nav>
      <div style={{ flex: 1 }} />
      {status === 'authenticated' && user ? (
        <Link to={homeForRole(user.role)} className="sp-btn is-small">Go to my portal</Link>
      ) : (
        <>
          <Link to="/login" className="sp-btn is-secondary is-small">Sign in</Link>
          <Link to="/onboarding" className="sp-btn is-small sp-hide-mobile">Onboard institute</Link>
        </>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="sp-footer">
      <span>BarelyPassing — Academic Progress and Outcome Tracking</span>
      <span>
        <Link to="/login">Sign in</Link> · <Link to="/signup">Student sign-up</Link> · <a href="/api/docs">API documentation</a>
      </span>
    </footer>
  );
}
