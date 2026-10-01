import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutThunk, selectAuth } from '../auth/authSlice';
import { homeForRole, roleLabel } from '../../app/roleRoutes';

function CenterPage({ code, title, children }) {
  useEffect(() => {
    document.title = `${title} · BarelyPassing`;
  }, [title]);
  return (
    <main className="sp-center-page">
      <div style={{ maxWidth: 460 }}>
        {code && <div className="sp-eyebrow">{code}</div>}
        <h1 className="sp-page-title" style={{ fontSize: 28 }}>{title}</h1>
        {children}
      </div>
    </main>
  );
}

export function NotFoundPage() {
  const { status, user } = useSelector(selectAuth);
  const location = useLocation();
  return (
    <CenterPage code="Error 404" title="Page not found">
      <p className="sp-muted">There is no page at <span className="sp-code">{location.pathname}</span>.</p>
      <Link className="sp-btn" to={status === 'authenticated' ? homeForRole(user.role) : '/'}>
        {status === 'authenticated' ? 'Go to my portal' : 'Go to home page'}
      </Link>
    </CenterPage>
  );
}

export function ForbiddenPage() {
  const { status, user } = useSelector(selectAuth);
  return (
    <CenterPage code="Error 403" title="You don't have access to this page">
      <p className="sp-muted">
        {status === 'authenticated'
          ? `You are signed in as ${roleLabel(user.role)}. This area belongs to a different role.`
          : 'Sign in with an account that has access to this area.'}
      </p>
      <Link className="sp-btn" to={status === 'authenticated' ? homeForRole(user.role) : '/login'}>
        {status === 'authenticated' ? 'Go to my portal' : 'Sign in'}
      </Link>
    </CenterPage>
  );
}

/** Shown while the first session check (GET /api/auth/me) is in flight. */
export function BootScreen() {
  return (
    <main className="sp-center-page" aria-busy="true">
      <div className="sp-state">
        <div className="sp-spinner" />
        <p>Loading BarelyPassing...</p>
      </div>
    </main>
  );
}

/** The backend could not be reached while checking the session. */
export function ServerDownPage({ error, onRetry }) {
  return (
    <CenterPage code={error?.status ? `Error ${error.status}` : 'Connection problem'} title="We can't reach the server">
      <p className="sp-muted">{error?.message || 'The server did not respond.'} Your data is safe; please try again in a moment.</p>
      <button type="button" className="sp-btn" onClick={onRetry}>Try again</button>
    </CenterPage>
  );
}

/** Portals scheduled for a later delivery phase. */
export function PortalInProgress({ portalLabel }) {
  const dispatch = useDispatch();
  const { user } = useSelector(selectAuth);
  return (
    <CenterPage code={portalLabel} title="This portal is being rebuilt">
      <p className="sp-muted">
        Signed in as {user?.name} ({roleLabel(user?.role)}). The {portalLabel} portal is being moved to the new React app and will be available in the next release.
      </p>
      <div className="sp-btn-row" style={{ justifyContent: 'center' }}>
        <Link className="sp-btn is-secondary" to="/">Home page</Link>
        <button type="button" className="sp-btn" onClick={() => dispatch(logoutThunk())}>Sign out</button>
      </div>
    </CenterPage>
  );
}

/** Institute onboarding moves to the React app in a later phase. */
export function OnboardingInProgress() {
  return (
    <CenterPage code="Institute onboarding" title="Onboarding is being rebuilt">
      <p className="sp-muted">Self-service institute onboarding (quote, payment and SPOC account) is being moved to the new site and will be available in the next release.</p>
      <div className="sp-btn-row" style={{ justifyContent: 'center' }}>
        <Link className="sp-btn is-secondary" to="/#pricing">See pricing</Link>
        <Link className="sp-btn" to="/login">Sign in</Link>
      </div>
    </CenterPage>
  );
}
