import { Navigate } from "react-router-dom";

export default function SuperAdminRoute({ children }) {
  const token = localStorage.getItem("token");
  const usuario = JSON.parse(localStorage.getItem("usuario") || "null");

  if (!token || !usuario) {
    return <Navigate to="/login" replace />;
  }

  if (usuario.rol !== "superadmin") {
    return <Navigate to="/login" replace />;
  }

  return children;
}