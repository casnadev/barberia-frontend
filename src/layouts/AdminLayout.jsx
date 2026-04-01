import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import LogoAnimado from "../components/ui/LogoAnimado";

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

  const cerrarSesion = () => {
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  const cerrarMenu = () => {
    setMenuAbierto(false);
  };

  const esMobile = typeof window !== "undefined" && window.innerWidth < 992;

  return (
    <div className="admin-shell">
      {menuAbierto && (
        <div className="sidebar-backdrop" onClick={cerrarMenu}></div>
      )}

      <aside className={`sidebar ${menuAbierto ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand-wrap">
  <LogoAnimado />
  <h4 className="sidebar-brand">Barbería</h4>
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
            {usuario?.nombre || "Usuario"}
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
            <Item
              to="/trabajadores"
              label="Trabajadores"
              active={location.pathname === "/trabajadores"}
              onClick={esMobile ? cerrarMenu : undefined}
            />
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
  <LogoAnimado />
  <span className="mobile-topbar-title">Barbería</span>
</div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}