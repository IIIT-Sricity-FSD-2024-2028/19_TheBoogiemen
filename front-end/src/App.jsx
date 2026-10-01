import React, { Suspense, lazy, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Route, Routes } from 'react-router-dom';
import { fetchSession, selectAuth } from './features/auth/authSlice';
import { PORTALS } from './app/roleRoutes';
import RequireAuth from './shared/ui/RequireAuth';
import Toasts from './shared/ui/Toasts';
import { BootScreen, ForbiddenPage, NotFoundPage, ServerDownPage } from './features/public/StatusPages';

const LandingPage = lazy(() => import('./features/public/LandingPage'));
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const SignupPage = lazy(() => import('./features/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./features/auth/ResetPasswordPage'));
const OnboardingPage = lazy(() => import('./features/onboarding/OnboardingPage'));

/** One lazily loaded chunk per portal; PORTALS decides the path and roles. */
const PORTAL_COMPONENTS = {
  student: lazy(() => import('./features/student/StudentPortal')),
  faculty: lazy(() => import('./features/faculty/FacultyPortal')),
  hod: lazy(() => import('./features/hod/HodPortal')),
  director: lazy(() => import('./features/director/DirectorPortal')),
  finance: lazy(() => import('./features/finance/FinancePortal')),
  spoc: lazy(() => import('./features/spoc/SpocPortal')),
  support: lazy(() => import('./features/support/SupportPortal')),
};

export default function App() {
  const dispatch = useDispatch();
  const { status, bootError } = useSelector(selectAuth);

  // Ask the server who is signed in on every page load (cookie-based session).
  useEffect(() => {
    dispatch(fetchSession());
  }, [dispatch]);

  if (status === 'checking') return <BootScreen />;
  if (bootError) return <ServerDownPage error={bootError} onRetry={() => dispatch(fetchSession())} />;

  return (
    <>
      <a href="#main" className="sp-visually-hidden">Skip to content</a>
      <Suspense fallback={<BootScreen />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />

          {Object.entries(PORTAL_COMPONENTS).map(([key, Portal]) => (
            <Route
              key={key}
              path={`${PORTALS[key].path}/*`}
              element={<RequireAuth roles={PORTALS[key].roles}><Portal /></RequireAuth>}
            />
          ))}

          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Toasts />
    </>
  );
}
