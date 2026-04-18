import { Routes, Route } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/Dashboard";
import Trabajadores from "./pages/Trabajadores";
import RegistrarVenta from "./pages/RegistrarVenta";
import Login from "./pages/Login";
import Pagos from "./pages/Pagos";
import Ventas from "./pages/Ventas";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import Servicios from "./pages/Servicios";
import ConfiguracionNegocio from "./pages/ConfiguracionNegocio";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />

        <Route
          path="/trabajadores"
          element={
            <AdminRoute>
              <Trabajadores />
            </AdminRoute>
          }
        />

        <Route path="/ventas/registrar" element={<RegistrarVenta />} />
        <Route path="/ventas/historial" element={<Ventas />} />
        <Route path="/pagos" element={<Pagos />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/configuracion" element={<ConfiguracionNegocio />} />
      </Route>
    </Routes>
  );
}

export default App;