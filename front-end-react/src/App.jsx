import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationsProvider } from './context/NotificationsContext';
import Toast from './components/shared/Toast';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import NotFound from './pages/NotFound';

// Five actor routes — /student, /faculty, /admin, /spoc, /superadmin — are
// added one at a time in Phases 1–5 of FRONTEND_REACT_MIGRATION_PLAN.md.
// Until then they (and any other unknown path) fall through to NotFound.
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toast />
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
