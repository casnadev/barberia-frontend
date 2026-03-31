import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }) {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "null");
  const esAdmin = usuario?.rol?.toLowerCase() === "admin";

  if (!esAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}