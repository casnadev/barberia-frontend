import { Navigate } from "react-router-dom";
import { getAuthData, clearAuthData } from "./authStorage";

export default function TrabajadorRoute({ children }) {
  const { token, usuario } = getAuthData();

  if (!token || !usuario) {
    clearAuthData();
    return <Navigate to="/login" replace />;
  }

  const rol = String(usuario?.rol || "").trim().toLowerCase();

  if (rol !== "trabajador") {
    return <Navigate to="/" replace />;
  }

  return children;
}