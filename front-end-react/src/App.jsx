import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationsProvider } from './context/NotificationsContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import Toast from './components/shared/Toast';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import NotFound from './pages/NotFound';
import StudentDashboard from './pages/student/StudentDashboard';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import AdminHeadDashboard from './pages/admin/AdminHeadDashboard';
import SpocDashboard from './pages/spoc/SpocDashboard';
import SuperadminDashboard from './pages/superadmin/SuperadminDashboard';

// Any unknown path falls through to NotFound.
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route
              path="/student/*"
              element={
                <ProtectedRoute roles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/faculty/*"
              element={
                <ProtectedRoute roles={['faculty']}>
                  <FacultyDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute roles={['admin', 'head']}>
                  <AdminHeadDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/spoc/*"
              element={
                <ProtectedRoute roles={['spoc']}>
                  <SpocDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/*"
              element={
                <ProtectedRoute roles={['superadmin']}>
                  <SuperadminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toast />
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
