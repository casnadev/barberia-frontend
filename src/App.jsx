import { Routes, Route } from "react-router-dom";

import AdminLayout from "./layouts/AdminLayout";
import TrabajadorLayout from "./layouts/TrabajadorLayout";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import TrabajadorRoute from "./components/auth/TrabajadorRoute";
import SuperAdminRoute from "./components/auth/SuperAdminRoute";

import LandingSaaS from "./pages/publico/LandingSaaS";
import LandingNegocio from "./pages/publico/LandingNegocio";
import CatalogoServicios from "./pages/publico/CatalogoServicios";

import Login from "./pages/Login";
import CambiarPassword from "./pages/CambiarPassword";
import RecuperarPassword from "./pages/RecuperarPassword";
import ResetPassword from "./pages/ResetPassword";

import Dashboard from "./pages/Dashboard";
import Trabajadores from "./pages/Trabajadores";
import RegistrarVenta from "./pages/RegistrarVenta";
import Ventas from "./pages/Ventas";
import Pagos from "./pages/Pagos";
import Gastos from "./pages/Gastos";
import Servicios from "./pages/Servicios";
import ConfiguracionNegocio from "./pages/ConfiguracionNegocio";

import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";

import DashboardTrabajador from "./pages/trabajador/DashboardTrabajador";
import MiDisponibilidad from "./pages/trabajador/MiDisponibilidad";
import MisPagos from "./pages/trabajador/MisPagos";
import MisServicios from "./pages/trabajador/MisServicios";
import MisReservas from "./pages/trabajador/MisReservas";
import RegistrarServicio from "./pages/trabajador/RegistrarServicio";
import PerfilPublicoTrabajador from "./pages/trabajador/PerfilPublicoTrabajador";
import CatalogoTrabajadores from "./pages/trabajador/CatalogoTrabajadores";
import ReservarCita from "./pages/trabajador/ReservarCita";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingSaaS />} />

      <Route path="/login" element={<Login />} />
      <Route path="/cambiar-password" element={<CambiarPassword />} />
      <Route path="/recuperar-password" element={<RecuperarPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/superadmin"
        element={
          <SuperAdminRoute>
            <SuperAdminDashboard />
          </SuperAdminRoute>
        }
      />

      <Route path="/negocio/:slug" element={<LandingNegocio />} />
      <Route path="/catalogo-servicios/:idNegocio" element={<CatalogoServicios />} />
      <Route path="/catalogo-trabajadores/:idNegocio" element={<CatalogoTrabajadores />} />
      <Route path="/reservar/:id" element={<ReservarCita />} />
      <Route path="/trabajador-publico/:id" element={<PerfilPublicoTrabajador />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="trabajadores" element={<Trabajadores />} />
        <Route path="ventas/registrar" element={<RegistrarVenta />} />
        <Route path="ventas/historial" element={<Ventas />} />
        <Route path="pagos" element={<Pagos />} />
        <Route path="gastos" element={<Gastos />} />
        <Route path="servicios" element={<Servicios />} />
        <Route path="reservas" element={<MisReservas />} />
        <Route path="configuracion" element={<ConfiguracionNegocio />} />
      </Route>

      <Route
        path="/trabajador"
        element={
          <ProtectedRoute>
            <TrabajadorRoute>
              <TrabajadorLayout />
            </TrabajadorRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardTrabajador />} />
        <Route path="registrar" element={<RegistrarServicio />} />
        <Route path="servicios" element={<MisServicios />} />
        <Route path="pagos" element={<MisPagos />} />
        <Route path="reservas" element={<MisReservas />} />
        <Route path="disponibilidad" element={<MiDisponibilidad />} />
      </Route>
    </Routes>
  );
}

export default App;