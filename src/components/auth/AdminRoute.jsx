import { Navigate } from "react-router-dom";
import { getAuthData, clearAuthData } from "./authStorage";

export default function AdminRoute({ children }) {
  const { token, usuario } = getAuthData();

  if (!token || !usuario) {
    clearAuthData();
    return <Navigate to="/login" replace />;
  }

  const rol = String(usuario?.rol || "").trim().toLowerCase();

  if (rol !== "admin") {
    return <Navigate to="/trabajador" replace />;
  }

  return children;
}