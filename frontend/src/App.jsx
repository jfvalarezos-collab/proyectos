import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/admin/Login.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import SessionCreate from './pages/admin/SessionCreate.jsx';
import SessionDetail from './pages/admin/SessionDetail.jsx';
import RequireAdmin from './pages/admin/RequireAdmin.jsx';
import AttendeeFlow from './pages/attendee/AttendeeFlow.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />

      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <Dashboard />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/sessions/new"
        element={
          <RequireAdmin>
            <SessionCreate />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/sessions/:id"
        element={
          <RequireAdmin>
            <SessionDetail />
          </RequireAdmin>
        }
      />

      <Route path="/s/:token" element={<AttendeeFlow />} />

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
