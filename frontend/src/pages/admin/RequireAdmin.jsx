import { Navigate } from 'react-router-dom';
import { isAdminLoggedIn } from '../../lib/api.js';

export default function RequireAdmin({ children }) {
  if (!isAdminLoggedIn()) return <Navigate to="/admin/login" replace />;
  return children;
}
