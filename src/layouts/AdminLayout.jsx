import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";
import logo2 from "../assets/logo2.png";
import { getBusinessCacheKeys, getImageUrl } from "../utils/imageUrl";

import {
  Globe,
  Home,
  LogOut,
  Scissors,
  UserRound,
  UsersRound,
} from "lucide-react";

function Item({ to, label, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`sidebar-link ${active ? "active" : ""}`}
    >
      {label}
    </Link>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  let usuario = null;

  try {
    usuario = JSON.parse(localStorage.getItem("usuario") || "null");
  } catch {
    usuario = null;
  }

  const rol = String(usuario?.rol || "").trim().toLowerCase();
  const esAdmin = rol === "admin";
  const idNegocio = usuario?.idNegocio || usuario?.IdNegocio;

  const cacheKeys = useMemo(() => getBusinessCacheKeys(idNegocio), [idNegocio]);

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [logoNegocio, setLogoNegocio] = useState(localStorage.getItem(cacheKeys.logo) || "");
  const [nombreNegocio, setNombreNegocio] = useState(localStorage.getItem(cacheKeys.nombre) || "");
  const [slugNegocio, setSlugNegocio] = useState(localStorage.getItem(cacheKeys.slug) || "");

  useEffect(() => {
    if (!usuario || !esAdmin) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      navigate("/login", { replace: true });
    }
  }, [navigate, esAdmin, usuario]);

  useEffect(() => {
    const cargarNegocio = async () => {
      try {
        const res = await authFetch(`${API_BASE}/Negocios/mi-negocio`);
        if (!res) return;

        const data = await res.json();
        if (!res.ok) return;

        const nuevaRuta = data.logoUrl || "";
        const nuevoNombre = data.nombre || "";
        const nuevoSlug = data.slug || "";

        setLogoNegocio(nuevaRuta);
        setNombreNegocio(nuevoNombre);
        setSlugNegocio(nuevoSlug);

        localStorage.setItem(cacheKeys.logo, nuevaRuta);
        localStorage.setItem(cacheKeys.nombre, nuevoNombre);
        localStorage.setItem(cacheKeys.slug, nuevoSlug);
      } catch (err) {
        console.error(err);
      }
    };

    if (esAdmin) cargarNegocio();
  }, [esAdmin, cacheKeys.logo, cacheKeys.nombre, cacheKeys.slug]);

  useEffect(() => {
    const actualizarBranding = () => {
      setLogoNegocio(localStorage.getItem(cacheKeys.logo) || "");
      setNombreNegocio(localStorage.getItem(cacheKeys.nombre) || "");
      setSlugNegocio(localStorage.getItem(cacheKeys.slug) || "");
    };

    window.addEventListener("logo-negocio-actualizado", actualizarBranding);
    window.addEventListener("nombre-negocio-actualizado", actualizarBranding);
    window.addEventListener("slug-negocio-actualizado", actualizarBranding);

    return () => {
      window.removeEventListener("logo-negocio-actualizado", actualizarBranding);
      window.removeEventListener("nombre-negocio-actualizado", actualizarBranding);
      window.removeEventListener("slug-negocio-actualizado", actualizarBranding);
    };
  }, [cacheKeys.logo, cacheKeys.nombre, cacheKeys.slug]);

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login", { replace: true });
  };

  const cerrarMenu = () => {
    setMenuAbierto(false);
  };

  const esMobile = typeof window !== "undefined" && window.innerWidth < 992;

  const logoSrc = logoNegocio ? getImageUrl(logoNegocio) : logo2;
  const urlPublica = slugNegocio ? `/negocio/${slugNegocio}` : "/";
  const urlServicios = idNegocio ? `/catalogo-servicios/${idNegocio}` : urlPublica;
  const urlTrabajadores = idNegocio ? `/catalogo-trabajadores/${idNegocio}` : urlPublica;

  return (
    <div className="admin-shell">
      {menuAbierto && <div className="sidebar-backdrop" onClick={cerrarMenu} />}

      <aside className={`sidebar ${menuAbierto ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand-wrap">
            <img src={logoSrc} alt="Logo" className="sidebar-logo-img" />
          </div>

          <button type="button" className="sidebar-close" onClick={cerrarMenu}>
            ✕
          </button>
        </div>

        <div className="sidebar-user-card">
          <div className="sidebar-user-label">Sesión activa</div>
          <div className="sidebar-user-name">
            {nombreNegocio || usuario?.nombre || "Usuario"}
          </div>
          <div className="sidebar-user-email">{usuario?.correo || ""}</div>

          <Link to={urlPublica} className="sidebar-public-link" onClick={cerrarMenu}>
            <Globe size={16} />
            Ver sitio público
          </Link>
        </div>

        <div className="sidebar-scroll-area">
          <nav className="sidebar-nav">
            <Item to="/admin" label="Dashboard" active={location.pathname === "/admin"} onClick={esMobile ? cerrarMenu : undefined} />
            <Item to="/admin/trabajadores" label="Trabajadores" active={location.pathname === "/admin/trabajadores"} onClick={esMobile ? cerrarMenu : undefined} />
            <Item to="/admin/servicios" label="Servicios" active={location.pathname === "/admin/servicios"} onClick={esMobile ? cerrarMenu : undefined} />
            <Item to="/admin/ventas/registrar" label="Registrar Venta" active={location.pathname === "/admin/ventas/registrar"} onClick={esMobile ? cerrarMenu : undefined} />
            <Item to="/admin/ventas/historial" label="Ventas/Análisis" active={location.pathname === "/admin/ventas/historial"} onClick={esMobile ? cerrarMenu : undefined} />
            <Item to="/admin/pagos" label="Pagos por Trabajador" active={location.pathname === "/admin/pagos"} onClick={esMobile ? cerrarMenu : undefined} />
            <Item to="/admin/gastos" label="Gastos del Negocio" active={location.pathname === "/admin/gastos"} onClick={esMobile ? cerrarMenu : undefined} />
            <Item to="/admin/reservas" label="Reservas" active={location.pathname === "/admin/reservas"} onClick={esMobile ? cerrarMenu : undefined} />
            <Item to="/admin/configuracion" label="Configuración" active={location.pathname === "/admin/configuracion"} onClick={esMobile ? cerrarMenu : undefined} />
          </nav>
        </div>

        <div className="sidebar-footer">
          <button type="button" onClick={cerrarSesion} className="sidebar-logout-icon">
            <LogOut size={18} />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="mobile-topbar">
          <button type="button" className="menu-toggle" onClick={() => setMenuAbierto(true)}>
            ☰
          </button>

          <div className="brand-wrap mobile-brand-wrap">
            <img src={logoSrc} alt="Logo" className="sidebar-logo-img" />
            <span className="mobile-topbar-title">{nombreNegocio || "Barbería"}</span>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>

      <nav className="admin-mobile-public-nav">
        <Link to={urlPublica}>
          <Home size={22} />
          <span>Inicio</span>
        </Link>

        <Link to={urlServicios}>
          <Scissors size={22} />
          <span>Servicios</span>
        </Link>

        <Link to={urlTrabajadores}>
          <UsersRound size={22} />
          <span>Trabajadores</span>
        </Link>

        <Link to="/admin" className="active">
          <UserRound size={22} />
          <span>Perfil</span>
        </Link>
      </nav>
    </div>
  );
}