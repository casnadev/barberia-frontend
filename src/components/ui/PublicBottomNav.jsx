import { Link, useNavigate } from "react-router-dom";
import { Home, Scissors, UserRound, UsersRound } from "lucide-react";
import "../../styles/components/publicbottomnav.css";

export default function PublicBottomNav({
  idNegocio = null,
  slugNegocio = "",
  active = "inicio",
}) {
  const navigate = useNavigate();

  const urlInicio = slugNegocio ? `/negocio/${slugNegocio}` : "/";
  const urlServicios = idNegocio ? `/catalogo-servicios/${idNegocio}` : urlInicio;
  const urlTrabajadores = idNegocio
    ? `/catalogo-trabajadores/${idNegocio}`
    : urlInicio;

  const redirigirPorRol = (usuario) => {
    const rol = String(usuario?.rol || usuario?.Rol || "").trim().toLowerCase();

    if (rol === "superadmin" || rol === "super admin") {
      navigate("/superadmin");
      return true;
    }

    if (rol === "admin") {
      navigate("/admin");
      return true;
    }

    if (rol === "trabajador") {
      navigate("/trabajador");
      return true;
    }

    return false;
  };

  const irAPerfil = () => {
    const token = localStorage.getItem("token");
    const usuarioGuardado = localStorage.getItem("usuario");

    if (!token || !usuarioGuardado || token === "undefined" || token === "null") {
      navigate("/login");
      return;
    }

    try {
      const usuario = JSON.parse(usuarioGuardado);

      if (!redirigirPorRol(usuario)) {
        navigate("/login");
      }
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      navigate("/login");
    }
  };

  return (
    <nav className="public-bottom-nav">
      <Link to={urlInicio} className={active === "inicio" ? "active" : ""}>
        <Home size={22} />
        <span>Inicio</span>
      </Link>

      <Link to={urlServicios} className={active === "servicios" ? "active" : ""}>
        <Scissors size={22} />
        <span>Servicios</span>
      </Link>

      <Link
        to={urlTrabajadores}
        className={active === "trabajadores" ? "active" : ""}
      >
        <UsersRound size={22} />
        <span>Profesionales</span>
      </Link>

      <button
        type="button"
        onClick={irAPerfil}
        className={active === "perfil" ? "active" : ""}
      >
        <UserRound size={22} />
        <span>Perfil</span>
      </button>
    </nav>
  );
}