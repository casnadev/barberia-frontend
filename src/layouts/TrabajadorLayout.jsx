import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";
import logo2 from "../assets/logo2.png";

function Item({ to, label, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        display: "block",
        padding: "12px 16px",
        borderRadius: "12px",
        marginBottom: "10px",
        background: active ? "rgba(212,175,55,.18)" : "transparent",
        color: active ? "#b8860b" : "#1f2937",
        textDecoration: "none",
        fontWeight: active ? 700 : 600,
        letterSpacing: "0.3px",
        transition: "all .25s ease"
      }}
    >
      {label}
    </Link>
  );
}

export default function TrabajadorLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ SEGURO
  let usuario = null;

  try {
    usuario = JSON.parse(localStorage.getItem("usuario") || "null");
  } catch {
    usuario = null;
  }

  const esTrabajador = usuario?.rol?.toLowerCase() === "trabajador";

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [logoNegocio, setLogoNegocio] = useState(
    localStorage.getItem("logoNegocio") || ""
  );
  const [nombreNegocio, setNombreNegocio] = useState(
    localStorage.getItem("nombreNegocio") || ""
  );

  // 🔐 PROTECCIÓN EXTRA
  useEffect(() => {
    if (!usuario || !esTrabajador) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      localStorage.removeItem("logoNegocio");
      localStorage.removeItem("nombreNegocio");
      localStorage.removeItem("slugNegocio");

      navigate("/login", { replace: true });
    }
  }, [navigate, esTrabajador, usuario]);

  // 🔄 CARGA NEGOCIO
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

        localStorage.setItem("logoNegocio", nuevaRuta);
        localStorage.setItem("nombreNegocio", nuevoNombre);
        localStorage.setItem("slugNegocio", nuevoSlug);
      } catch (err) {
        console.error(err);
      }
    };

    if (esTrabajador) {
      cargarNegocio();
    }
  }, [esTrabajador]);

  // 🔄 EVENTOS
  useEffect(() => {
    const actualizarBranding = () => {
      const logoGuardado = localStorage.getItem("logoNegocio") || "";
      const nombreGuardado = localStorage.getItem("nombreNegocio") || "";

      setLogoNegocio(logoGuardado);
      setNombreNegocio(nombreGuardado);
    };

    window.addEventListener("logo-negocio-actualizado", actualizarBranding);
    window.addEventListener("nombre-negocio-actualizado", actualizarBranding);

    return () => {
      window.removeEventListener("logo-negocio-actualizado", actualizarBranding);
      window.removeEventListener("nombre-negocio-actualizado", actualizarBranding);
    };
  }, []);

  // 🔓 LOGOUT CORREGIDO
  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("logoNegocio");
    localStorage.removeItem("nombreNegocio");
    localStorage.removeItem("slugNegocio");

    navigate("/login", { replace: true });
  };

  const cerrarMenu = () => {
    setMenuAbierto(false);
  };

  const esMobile = typeof window !== "undefined" && window.innerWidth < 992;

  const logoSrc = logoNegocio
    ? `${API_BASE.replace("/api", "")}${logoNegocio}`
    : logo2;

  return (
    <div className="admin-shell">
      {menuAbierto && (
        <div className="sidebar-backdrop" onClick={cerrarMenu}></div>
      )}

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
          <div className="sidebar-user-label">Panel trabajador</div>

          <div className="sidebar-user-name">
            {usuario?.nombre || "Trabajador"}
          </div>

          <div className="sidebar-user-email">
            {nombreNegocio || usuario?.correo || ""}
          </div>
        </div>

        <nav className="sidebar-nav">
          <Item to="/trabajador" label="Inicio" active={location.pathname === "/trabajador"} onClick={esMobile ? cerrarMenu : undefined} />

          <Item to="/trabajador/registrar" label="Registrar Servicio" active={location.pathname === "/trabajador/registrar"} onClick={esMobile ? cerrarMenu : undefined} />

          <Item to="/trabajador/reservas" label="Agenda de Reservas" active={location.pathname === "/trabajador/reservas"} onClick={esMobile ? cerrarMenu : undefined} />

          <Item to="/trabajador/disponibilidad" label="Mi Disponibilidad" active={location.pathname === "/trabajador/disponibilidad"} onClick={esMobile ? cerrarMenu : undefined} />

          <Item to="/trabajador/servicios" label="Mis Servicios" active={location.pathname === "/trabajador/servicios"} onClick={esMobile ? cerrarMenu : undefined} />

          <Item to="/trabajador/pagos" label="Mis Pagos" active={location.pathname === "/trabajador/pagos"} onClick={esMobile ? cerrarMenu : undefined} />
        </nav>

        <div className="sidebar-footer">
          <button type="button" onClick={cerrarSesion} className="sidebar-logout">
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="mobile-topbar">
          <button type="button" className="menu-toggle" onClick={() => setMenuAbierto(true)}>
            ☰
          </button>

          <div className="brand-wrap">
            <img src={logoSrc} alt="Logo" className="sidebar-logo-img" />
            <span className="mobile-topbar-title">
              {nombreNegocio || "Panel trabajador"}
            </span>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}