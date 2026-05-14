import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API_BASE from "../../services/api";

import PublicHeader from "../../components/ui/PublicHeader";
import PublicBottomNav from "../../components/ui/PublicBottomNav";
import PageFooter from "../../components/ui/PageFooter";
import ModalReserva from "../../components/ui/ModalReserva";

import { getImageUrl } from "../../utils/imageUrl";

import {
  Award,
  CalendarDays,
  Eye,
  EyeOff,
  ImageIcon,
  LockKeyhole,
  Mail,
  Scissors,
  Search,
  Sparkles,
  Star,
  UserRound,
  X,
} from "lucide-react";

import "../../styles/pages/perfilpublicotrabajador.css";

export default function PerfilPublicoTrabajador() {
  const { id } = useParams();

  const [perfil, setPerfil] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [redesSociales, setRedesSociales] = useState([]);
  const [idNegocioPerfil, setIdNegocioPerfil] = useState(null);
  const [negocioPublico, setNegocioPublico] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [mostrarLoginModal, setMostrarLoginModal] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [loginCorreo, setLoginCorreo] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [mostrarModalReserva, setMostrarModalReserva] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);

  useEffect(() => {
    const cargarPerfil = async () => {
      try {
        setLoading(true);
        setError("");

        const resPerfil = await fetch(
          `${API_BASE}/Trabajadores/${id}/perfil-publico`
        );

        const dataPerfil = await resPerfil.json().catch(() => ({}));

        if (!resPerfil.ok) {
          setError(dataPerfil.mensaje || "No se pudo cargar el perfil.");
          return;
        }

        setPerfil(dataPerfil);

        const idNegocioCargado =
          dataPerfil.idNegocio ||
          dataPerfil.IdNegocio ||
          dataPerfil.idNegocioTrabajador ||
          dataPerfil.IdNegocioTrabajador ||
          dataPerfil.negocio?.idNegocio ||
          dataPerfil.Negocio?.IdNegocio;

        setIdNegocioPerfil(idNegocioCargado || null);

        if (idNegocioCargado) {
          const resNegocio = await fetch(
            `${API_BASE}/Negocios/publico/${idNegocioCargado}`
          );

          const dataNegocio = await resNegocio.json().catch(() => null);

          if (resNegocio.ok && dataNegocio) {
            setNegocioPublico(dataNegocio?.negocio || dataNegocio?.Negocio || null);

            setRedesSociales(
              Array.isArray(dataNegocio.redesSociales)
                ? dataNegocio.redesSociales
                : Array.isArray(dataNegocio.RedesSociales)
                  ? dataNegocio.RedesSociales
                  : []
            );
          }
        }

        const resServicios = await fetch(
          `${API_BASE}/Servicios/publicos-por-trabajador/${id}`
        );

        const dataServicios = await resServicios.json().catch(() => []);

        if (resServicios.ok) {
          setServicios(Array.isArray(dataServicios) ? dataServicios : []);
        }
      } catch (err) {
        console.error(err);
        setError("Error de conexión.");
      } finally {
        setLoading(false);
      }
    };

    cargarPerfil();
  }, [id]);

  const get = (...keys) => {
    for (const key of keys) {
      if (perfil?.[key] !== undefined && perfil?.[key] !== null) {
        return perfil[key];
      }
    }

    return null;
  };

  const fotoRaw = get("fotoPerfilUrl", "FotoPerfilUrl");
  const fotoPerfil = fotoRaw ? getImageUrl(fotoRaw) : "";

  const logoRaw = get("logoUrl", "LogoUrl", "negocioLogoUrl", "NegocioLogoUrl");
  const logoNegocio = logoRaw ? getImageUrl(logoRaw) : "";

  const nombreNegocio =
    get("nombreNegocio", "NombreNegocio", "negocioNombre", "NegocioNombre") ||
    "Barbería";

  const slugNegocio =
    get("slugNegocio", "SlugNegocio", "slug", "Slug") || idNegocioPerfil;

  const nombreTrabajador = get("nombre", "Nombre") || "Trabajador";
  const especialidad = get("especialidad", "Especialidad");
  const experiencia = get("experiencia", "Experiencia");
  const destacado = Boolean(get("destacado", "Destacado"));
  const descripcion = get(
    "descripcionPublica",
    "DescripcionPublica",
    "descripcion",
    "Descripcion"
  );

  const totalServicios = get("totalServiciosRealizados", "TotalServiciosRealizados") || 0;
  const totalResenas = get("totalResenas", "TotalResenas") || 0;
  const calificacion = get("calificacionPromedio", "CalificacionPromedio") || 0;
  const distincion = get("distincion", "Distincion");

  const imagenesRaw = get("imagenes", "Imagenes") || [];
  const trabajos = Array.isArray(imagenesRaw) ? imagenesRaw.slice(0, 10) : [];

  const negocioHeader = useMemo(() => {
    return (
      negocioPublico || {
        idNegocio: idNegocioPerfil,
        IdNegocio: idNegocioPerfil,
        nombre: nombreNegocio,
        Nombre: nombreNegocio,
        slug: slugNegocio,
        Slug: slugNegocio,
        logoUrl: logoRaw,
        LogoUrl: logoRaw,
      }
    );
  }, [negocioPublico, idNegocioPerfil, nombreNegocio, slugNegocio, logoRaw]);

  const trabajadorReserva = useMemo(() => {
    if (!perfil) return null;

    return {
      ...perfil,
      idTrabajador: Number(id),
      IdTrabajador: Number(id),
      nombre: nombreTrabajador,
      Nombre: nombreTrabajador,
      fotoPerfilUrl: fotoRaw,
      FotoPerfilUrl: fotoRaw,
      especialidad,
      Especialidad: especialidad,
    };
  }, [perfil, id, nombreTrabajador, fotoRaw, especialidad]);

  const trabajadoresReserva = useMemo(() => {
    return trabajadorReserva ? [trabajadorReserva] : [];
  }, [trabajadorReserva]);

  const obtenerImagenServicio = (servicio) => {
    const raw = servicio?.imagenUrl || servicio?.ImagenUrl || "";
    return raw ? getImageUrl(raw) : "";
  };

  const abrirReservaConServicio = (idServicio) => {
    const servicio =
      servicios.find(
        (s) => Number(s.idServicio || s.IdServicio) === Number(idServicio)
      ) || null;

    setServicioSeleccionado(servicio);
    setMostrarModalReserva(true);
  };

  const cerrarModalReserva = () => {
    setMostrarModalReserva(false);
    setServicioSeleccionado(null);
  };

  const renderMobileHeader = () => (
    <header className="perfil-publico-mobile-header">
      <Link to={`/negocio/${slugNegocio}`} className="perfil-publico-mobile-logo">
        {logoNegocio ? (
          <img src={logoNegocio} alt={nombreNegocio} />
        ) : (
          <Scissors size={22} />
        )}
      </Link>

      <div className="perfil-publico-mobile-search">
        <Search size={17} />
        <span>{nombreTrabajador}</span>
      </div>
    </header>
  );

  const renderLoginModal = () => {
    if (!mostrarLoginModal) return null;

    return (
      <div className="perfil-login-overlay" onClick={() => setMostrarLoginModal(false)}>
        <div className="perfil-login-modal" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="perfil-login-close"
            onClick={() => setMostrarLoginModal(false)}
          >
            <X size={18} />
          </button>

          <div className="perfil-login-logo">
            {logoNegocio ? (
              <img src={logoNegocio} alt={nombreNegocio} />
            ) : (
              <Scissors size={32} />
            )}
          </div>

          <h2>Bienvenido</h2>
          <p>Accede a tu panel de Barber.pe</p>

          <div className="perfil-login-field">
            <label>Correo</label>

            <div>
              <Mail size={16} />
              <input
                type="email"
                placeholder="Email Here"
                value={loginCorreo}
                onChange={(e) => setLoginCorreo(e.target.value)}
              />
            </div>
          </div>

          <div className="perfil-login-field">
            <label>Contraseña</label>

            <div>
              <LockKeyhole size={16} />
              <input
                type={mostrarPassword ? "text" : "password"}
                placeholder="Password Here"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />

              <button type="button" onClick={() => setMostrarPassword((v) => !v)}>
                {mostrarPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                <span>{mostrarPassword ? "Ocultar" : "Mostrar"}</span>
              </button>
            </div>
          </div>

          <button type="button" className="perfil-login-forgot">
            ¿Olvidaste tu contraseña?
          </button>

          <button type="button" className="perfil-login-submit">
            Ingresar
          </button>

          <span className="perfil-login-copy">
            Barber.pe SaaS · Gestión profesional para barberías
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="perfil-publico-page">
        <div className="perfil-publico-loading">
          <UserRound size={36} />
          <p>Cargando perfil profesional...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="perfil-publico-page">
        <div className="perfil-publico-error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="perfil-publico-page">
      <section className="perfil-publico-desktop-public-header">
        <PublicHeader
          negocio={negocioHeader}
          idNegocio={idNegocioPerfil}
          slugNegocio={slugNegocio}
          onReservar={() => setMostrarModalReserva(true)}
        />
      </section>

      {renderMobileHeader()}

      <main className="perfil-publico-main">
        <section
          className="perfil-publico-pro-hero"
          style={{
            "--perfil-bg": fotoPerfil ? `url(${fotoPerfil})` : "none",
          }}
        >
          <div className="perfil-publico-pro-photo-area">
            <button
              type="button"
              className="perfil-publico-pro-photo"
              onClick={() =>
                fotoPerfil &&
                setImagenPreview({
                  url: fotoPerfil,
                  descripcion: nombreTrabajador,
                })
              }
            >
              {fotoPerfil ? (
                <img src={fotoPerfil} alt={nombreTrabajador} />
              ) : (
                <UserRound size={54} />
              )}
            </button>
          </div>

          <div className="perfil-publico-pro-info">
            <span className="perfil-publico-pro-kicker">
              {destacado ? "Profesional destacado" : "Profesional"}
            </span>

            <h1>{nombreTrabajador}</h1>

            <p className="perfil-publico-pro-subtitle">
              {especialidad || "Barbero / Estilista profesional"}
            </p>

            <p className="perfil-publico-pro-description">
              {descripcion ||
                "Profesional especializado en atención personalizada, cuidado de imagen y servicios de belleza."}
            </p>

            <div className="perfil-publico-pro-rating">
              <div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={17} fill="currentColor" />
                ))}
              </div>

              <strong>{Number(calificacion || 0).toFixed(1)}</strong>
              <span>({totalResenas} reseñas)</span>
            </div>

            <div className="perfil-publico-pro-specialties">
              <article>
                <Scissors size={24} />
                <h3>Especialidad</h3>
                <p>{especialidad || "Atención personalizada"}</p>
              </article>

              <article>
                <Award size={24} />
                <h3>Perfil</h3>
                <p>{distincion || experiencia || "Profesional verificado"}</p>
              </article>

              <article>
                <Sparkles size={24} />
                <h3>Servicios</h3>
                <p>{totalServicios} realizados</p>
              </article>
            </div>

            <button
              className="perfil-publico-pro-cta"
              onClick={() => setMostrarModalReserva(true)}
            >
              <CalendarDays size={20} />
              Reservar cita
            </button>
          </div>
        </section>

        <section className="perfil-publico-card perfil-publico-work-card" id="portafolio">
          <div className="perfil-publico-section-head">
            <div>
              <h2>Portafolio</h2>
              <p>Trabajos reales del especialista.</p>
            </div>

            <span>{trabajos.length} fotos</span>
          </div>

          {trabajos.length > 0 ? (
            <div className="perfil-publico-work-row">
              {trabajos.map((img) => {
                const raw = img.urlImagen || img.UrlImagen || "";
                const url = raw ? getImageUrl(raw) : "";
                const descripcionImg = img.descripcion || img.Descripcion || "Trabajo";

                return (
                  <button
                    type="button"
                    className="perfil-publico-work-item"
                    key={img.idImagen || img.IdImagen || raw}
                    onClick={() => {
                      if (url) {
                        setImagenPreview({
                          url,
                          descripcion: descripcionImg,
                        });
                      }
                    }}
                  >
                    <div>
                      {url ? <img src={url} alt={descripcionImg} /> : <ImageIcon size={34} />}
                    </div>

                    <span>{descripcionImg}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="perfil-publico-empty">
              <ImageIcon size={34} />
              <p>Aún no hay imágenes registradas.</p>
            </div>
          )}
        </section>

        <section className="perfil-publico-card perfil-publico-services-card" id="servicios">
          <div className="perfil-publico-section-head">
            <div>
              <h2>Nuestros servicios</h2>
              <p>También puedes elegir primero el servicio.</p>
            </div>

            <Link to={`/catalogo-servicios/${idNegocioPerfil || slugNegocio}`}>
              Ver todos <span>→</span>
            </Link>
          </div>

          {servicios.length > 0 ? (
            <div className="perfil-publico-services-row">
              {servicios.map((s) => {
                const idServicio = s.idServicio || s.IdServicio;
                const nombre = s.nombre || s.Nombre;
                const imagenServicio = obtenerImagenServicio(s);

                return (
                  <button
                    type="button"
                    className="perfil-publico-service-mini"
                    onClick={() => abrirReservaConServicio(idServicio)}
                    title={nombre}
                    key={idServicio}
                  >
                    <div>
                      {imagenServicio ? (
                        <img src={imagenServicio} alt={nombre} loading="lazy" />
                      ) : (
                        <Scissors size={24} />
                      )}
                    </div>

                    <strong>{nombre}</strong>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="perfil-publico-empty">
              <Scissors size={34} />
              <p>Este profesional aún no tiene servicios disponibles.</p>
            </div>
          )}
        </section>
      </main>

      <div id="contacto">
        <PageFooter
          nombreNegocio={nombreNegocio}
          redesSociales={redesSociales || []}
        />
      </div>

      <PublicBottomNav
        idNegocio={idNegocioPerfil}
        slugNegocio={slugNegocio}
        active="trabajadores"
        onPerfilClick={() => setMostrarLoginModal(true)}
      />

      <ModalReserva
        abierto={mostrarModalReserva}
        onClose={cerrarModalReserva}
        apiBase={API_BASE}
        servicios={servicios}
        trabajadores={trabajadoresReserva}
        servicioInicial={servicioSeleccionado}
        trabajadorInicial={trabajadorReserva}
      />

      {renderLoginModal()}

      {imagenPreview && (
        <div className="perfil-image-preview-overlay" onClick={() => setImagenPreview(null)}>
          <div className="perfil-image-preview-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="perfil-image-preview-close"
              onClick={() => setImagenPreview(null)}
            >
              <X size={18} />
            </button>

            <img src={imagenPreview.url} alt={imagenPreview.descripcion || "Imagen"} />
            <h3>{imagenPreview.descripcion || "Imagen"}</h3>
          </div>
        </div>
      )}
    </div>
  );
}