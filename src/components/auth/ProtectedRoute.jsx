import { Navigate } from "react-router-dom";
import { getAuthData, clearAuthData } from "./authStorage";

export default function ProtectedRoute({ children }) {
  const { token, usuario } = getAuthData();

  if (!token || !usuario) {
    clearAuthData();
    return <Navigate to="/login" replace />;
  }

  return children;
}