import { Routes, Route } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";
import TrabajadorLayout from "./layouts/TrabajadorLayout";

import Dashboard from "./pages/Dashboard";
import Trabajadores from "./pages/Trabajadores";
import RegistrarVenta from "./pages/RegistrarVenta";
import Login from "./pages/Login";
import Pagos from "./pages/Pagos";
import Gastos from "./pages/Gastos";
import Ventas from "./pages/Ventas";
import Servicios from "./pages/Servicios";
import ConfiguracionNegocio from "./pages/ConfiguracionNegocio";

import MiDisponibilidad from "./pages/trabajador/MiDisponibilidad";
import DashboardTrabajador from "./pages/trabajador/DashboardTrabajador";
import MisPagos from "./pages/trabajador/MisPagos";
import MisServicios from "./pages/trabajador/MisServicios";
import MisReservas from "./pages/trabajador/MisReservas";
import RegistrarServicio from "./pages/trabajador/RegistrarServicio";
import PerfilPublicoTrabajador from "./pages/trabajador/PerfilPublicoTrabajador";
import CatalogoTrabajadores from "./pages/trabajador/CatalogoTrabajadores";
import ReservarCita from "./pages/trabajador/ReservarCita";

import LandingNegocio from "./pages/publico/LandingNegocio";
import CatalogoServicios from "./pages/publico/CatalogoServicios";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import TrabajadorRoute from "./components/auth/TrabajadorRoute";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* RUTAS PÚBLICAS */}
      <Route
        path="/trabajador-publico/:id"
        element={<PerfilPublicoTrabajador />}
      />

      <Route
        path="/catalogo-trabajadores/:idNegocio"
        element={<CatalogoTrabajadores />}
      />

      <Route path="/reservar/:id" element={<ReservarCita />} />
      <Route path="/negocio/:slug" element={<LandingNegocio />} />
      <Route
        path="/catalogo-servicios/:idNegocio"
        element={<CatalogoServicios />}
      />

      {/* RUTAS ADMIN */}
      <Route
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/trabajadores" element={<Trabajadores />} />
        <Route path="/ventas/registrar" element={<RegistrarVenta />} />
        <Route path="/ventas/historial" element={<Ventas />} />
        <Route path="/pagos" element={<Pagos />} />
        <Route path="/gastos" element={<Gastos />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/reservas" element={<MisReservas />} />
        <Route path="/configuracion" element={<ConfiguracionNegocio />} />
      </Route>

      {/* RUTAS TRABAJADOR */}
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