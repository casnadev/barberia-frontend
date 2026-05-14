import { Link, useNavigate } from "react-router-dom";
import { Scissors } from "lucide-react";
import { getImageUrl } from "../../utils/imageUrl";
import "../../styles/components/publicheader.css";

export default function PublicHeader({
  negocio = {},
  logoUrl = "",
  idNegocio = null,
  slugNegocio = "",
  onReservar,
  showReservar = true,
}) {
  const navigate = useNavigate();

  const nombreNegocio =
    negocio?.nombre || negocio?.Nombre || "Negocio";

  const slug =
    slugNegocio ||
    negocio?.slug ||
    negocio?.Slug ||
    "";

  const id =
    idNegocio ||
    negocio?.idNegocio ||
    negocio?.IdNegocio ||
    "";

  const logoRaw =
    logoUrl ||
    negocio?.logoUrl ||
    negocio?.LogoUrl ||
    "";

  const logo = logoRaw ? getImageUrl(logoRaw) : "";

  const urlInicio = slug ? `/negocio/${slug}` : "/";
  const urlServicios = id ? `/catalogo-servicios/${id}` : urlInicio;
  const urlTrabajadores = id ? `/catalogo-trabajadores/${id}` : urlInicio;

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
    <header className="public-header">
      <Link to={urlInicio} className="public-header-brand">
        {logo ? (
          <img src={logo} alt={nombreNegocio} />
        ) : (
          <span className="public-header-logo-fallback">
            <Scissors size={22} />
          </span>
        )}

        <strong>{nombreNegocio}</strong>
      </Link>

      <nav className="public-header-nav">
        <Link to={urlServicios}>Servicios</Link>
        <Link to={urlTrabajadores}>Profesionales</Link>

        <Link to={urlInicio} state={{ scrollTo: "nosotros" }}>
          Nosotros
        </Link>

        <Link to={urlInicio} state={{ scrollTo: "contacto" }}>
          Contacto
        </Link>

        <button type="button" onClick={irAPerfil}>
          Perfil
        </button>

        {showReservar && (
          <button
            type="button"
            className="public-header-reserve"
            onClick={onReservar}
          >
            Reservar
          </button>
        )}
      </nav>
    </header>
  );
}