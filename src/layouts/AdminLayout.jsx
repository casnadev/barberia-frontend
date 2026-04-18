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
        borderRadius: "10px",
        marginBottom: "8px",
        background: active ? "rgba(212,175,55,0.15)" : "transparent",
        color: active ? "#d4af37" : "#ddd",
        textDecoration: "none",
        fontWeight: 600,
      }}
    >
      {label}
    </Link>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const usuario = JSON.parse(localStorage.getItem("usuario") || "null");
  const esAdmin = usuario?.rol?.toLowerCase() === "admin";

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [logoNegocio, setLogoNegocio] = useState(
    localStorage.getItem("logoNegocio") || ""
  );
  const [nombreNegocio, setNombreNegocio] = useState(
    localStorage.getItem("nombreNegocio") || ""
  );

  useEffect(() => {
    const cargarNegocio = async () => {
      try {
        const res = await authFetch(`${API_BASE}/Negocios/mi-negocio`);
        if (!res) return;

        const data = await res.json();

        const nuevaRuta = data.logoUrl || "";
        const nuevoNombre = data.nombre || "";

        setLogoNegocio(nuevaRuta);
        setNombreNegocio(nuevoNombre);

        localStorage.setItem("logoNegocio", nuevaRuta);
        localStorage.setItem("nombreNegocio", nuevoNombre);
      } catch (err) {
        console.error(err);
      }
    };

    cargarNegocio();
  }, []);

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

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("logoNegocio");
    localStorage.removeItem("nombreNegocio");
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

          <button
            type="button"
            className="sidebar-close"
            onClick={cerrarMenu}
          >
            ✕
          </button>
        </div>

        <div className="sidebar-user-card">
          <div className="sidebar-user-label">Sesión activa</div>
          <div className="sidebar-user-name">
            {nombreNegocio || usuario?.nombre || "Usuario"}
          </div>
          <div className="sidebar-user-email">
            {usuario?.correo || ""}
          </div>
        </div>

        <nav className="sidebar-nav">
          <Item
            to="/"
            label="Dashboard"
            active={location.pathname === "/"}
            onClick={esMobile ? cerrarMenu : undefined}
          />

          {esAdmin && (
            <>
              <Item
                to="/trabajadores"
                label="Trabajadores"
                active={location.pathname === "/trabajadores"}
                onClick={esMobile ? cerrarMenu : undefined}
              />
              <Item
                to="/servicios"
                label="Servicios"
                active={location.pathname === "/servicios"}
                onClick={esMobile ? cerrarMenu : undefined}
              />
            </>
          )}

          <Item
            to="/ventas/registrar"
            label="Registrar Venta"
            active={location.pathname === "/ventas/registrar"}
            onClick={esMobile ? cerrarMenu : undefined}
          />

          <Item
            to="/ventas/historial"
            label="Ventas"
            active={location.pathname === "/ventas/historial"}
            onClick={esMobile ? cerrarMenu : undefined}
          />

          <Item
            to="/pagos"
            label="Pagos"
            active={location.pathname === "/pagos"}
            onClick={esMobile ? cerrarMenu : undefined}
          />

          <Item
            to="/configuracion"
            label="Configuración"
            active={location.pathname === "/configuracion"}
            onClick={esMobile ? cerrarMenu : undefined}
          />
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            onClick={cerrarSesion}
            className="sidebar-logout"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="mobile-topbar">
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMenuAbierto(true)}
          >
            ☰
          </button>

          <div className="brand-wrap">
            <img src={logoSrc} alt="Logo" className="sidebar-logo-img" />
            <span className="mobile-topbar-title">
              {nombreNegocio || "Barbería"}
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