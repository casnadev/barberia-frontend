import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import API_BASE from "../../services/api";

import AvatarCircle from "../../components/ui/AvatarCircle";
import PublicHeader from "../../components/ui/PublicHeader";
import PublicBottomNav from "../../components/ui/PublicBottomNav";
import PageFooter from "../../components/ui/PageFooter";
import ModalReserva from "../../components/ui/ModalReserva";

import { getImageUrl } from "../../utils/imageUrl";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Scissors,
  Search,
  Star,
  Trophy,
  UserRound,
  X,
} from "lucide-react";

import "../../styles/pages/catalogotrabajadores.css";

export default function CatalogoTrabajadores() {
  const { idNegocio } = useParams();
  const [searchParams] = useSearchParams();
  const idServicio = searchParams.get("servicio");

  const destacadosRef = useRef(null);

  const [trabajadores, setTrabajadores] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [negocio, setNegocio] = useState(null);
  const [redesSociales, setRedesSociales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [trabajadorDetalle, setTrabajadorDetalle] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);

  const [mostrarLoginModal, setMostrarLoginModal] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [loginCorreo, setLoginCorreo] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [mostrarModalReserva, setMostrarModalReserva] = useState(false);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState(null);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        setError("");

        const [resTrabajadores, resNegocio] = await Promise.all([
          fetch(`${API_BASE}/Trabajadores/catalogo-publico/${idNegocio}`),
          fetch(`${API_BASE}/Negocios/publico/${idNegocio}`),
        ]);

        const dataTrabajadores = await resTrabajadores.json().catch(() => []);

        if (!resTrabajadores.ok) {
          setError(
            dataTrabajadores?.mensaje ||
              "No se pudieron cargar los profesionales."
          );
          return;
        }

        setTrabajadores(Array.isArray(dataTrabajadores) ? dataTrabajadores : []);

        if (resNegocio.ok) {
          const dataNegocio = await resNegocio.json().catch(() => null);

          setNegocio(dataNegocio?.negocio || dataNegocio?.Negocio || null);

          setServicios(
            Array.isArray(dataNegocio?.servicios)
              ? dataNegocio.servicios
              : Array.isArray(dataNegocio?.Servicios)
                ? dataNegocio.Servicios
                : []
          );

          setRedesSociales(
            Array.isArray(dataNegocio?.redesSociales)
              ? dataNegocio.redesSociales
              : Array.isArray(dataNegocio?.RedesSociales)
                ? dataNegocio.RedesSociales
                : []
          );
        }
      } catch (err) {
        console.error("Error cargando catálogo de trabajadores:", err);
        setError("No se pudo conectar con el catálogo.");
      } finally {
        setLoading(false);
      }
    };

    if (idNegocio) cargar();
  }, [idNegocio]);

  const nombreNegocio = negocio?.nombre || negocio?.Nombre || "Negocio";
  const slugNegocio = negocio?.slug || negocio?.Slug || idNegocio;

  const logoNegocio =
    negocio?.logoUrl || negocio?.LogoUrl
      ? getImageUrl(negocio.logoUrl || negocio.LogoUrl)
      : "";

  const trabajadoresFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return trabajadores
      .filter((t) => {
        const texto = `${t.nombre || t.Nombre || ""} ${
          t.descripcion || t.Descripcion || ""
        } ${t.especialidad || t.Especialidad || ""} ${
          t.experiencia || t.Experiencia || ""
        }`.toLowerCase();

        return texto.includes(q);
      })
      .sort((a, b) => {
        const da = a.destacado || a.Destacado ? 0 : 1;
        const db = b.destacado || b.Destacado ? 0 : 1;
        return da - db;
      });
  }, [trabajadores, busqueda]);

  const trabajadoresDestacados = useMemo(() => {
    return trabajadores.filter(
      (t) =>
        t.destacado ||
        t.Destacado ||
        t.distincion ||
        Number(t.calificacionPromedio || 0) >= 4.8 ||
        Number(t.totalServiciosRealizados || 0) >= 50
    );
  }, [trabajadores]);

  const servicioPorUrl = useMemo(() => {
    if (!idServicio) return null;

    return (
      servicios.find(
        (s) => Number(s.idServicio || s.IdServicio) === Number(idServicio)
      ) || null
    );
  }, [idServicio, servicios]);

  const getIdTrabajador = (t) => t?.idTrabajador || t?.IdTrabajador;
  const getNombreTrabajador = (t) => t?.nombre || t?.Nombre || "Profesional";

  const getTrabajadorFoto = (t) => {
    const raw = t?.fotoPerfilUrl || t?.FotoPerfilUrl || "";
    return raw ? getImageUrl(raw) : "";
  };

  const obtenerImagenServicio = (s) => {
    const raw = s?.imagenUrl || s?.ImagenUrl || "";
    return raw ? getImageUrl(raw) : "";
  };

  const obtenerBadgeExtra = (t) => {
    if (t.distincion) return t.distincion;
    if (t.Distincion) return t.Distincion;
    if (Number(t.calificacionPromedio || 0) >= 4.8) return "Mejor valorado";
    if (Number(t.totalServiciosRealizados || 0) >= 50) return "Más solicitado";
    if (t.destacado || t.Destacado) return "Destacado";
    return "Profesional";
  };

  const obtenerDescripcionTrabajador = (t) => {
    return (
      t?.descripcion ||
      t?.Descripcion ||
      t?.especialidad ||
      t?.Especialidad ||
      "Profesional disponible para atención personalizada."
    );
  };

  const obtenerEspecialidad = (t) => t?.especialidad || t?.Especialidad || "";
  const obtenerExperiencia = (t) => t?.experiencia || t?.Experiencia || "";

  const obtenerPortafolioTrabajador = (t) => {
    const lista =
      t?.imagenes ||
      t?.Imagenes ||
      t?.imagenesTrabajos ||
      t?.ImagenesTrabajos ||
      t?.trabajadorImagenes ||
      t?.TrabajadorImagenes ||
      t?.portafolio ||
      t?.Portafolio ||
      [];

    return Array.isArray(lista) ? lista.slice(0, 10) : [];
  };

  const obtenerImagenPortafolio = (img) => {
    const raw =
      img?.urlImagen || img?.UrlImagen || img?.imagenUrl || img?.ImagenUrl || "";

    return raw ? getImageUrl(raw) : "";
  };

  const moverDestacados = (direction) => {
    if (!destacadosRef.current) return;

    destacadosRef.current.scrollBy({
      left: direction === "next" ? 280 : -280,
      behavior: "smooth",
    });
  };

  const cargarDetalleTrabajador = async (trabajador) => {
    const id = getIdTrabajador(trabajador);

    try {
      setTrabajadorDetalle(trabajador);

      const res = await fetch(`${API_BASE}/Trabajadores/${id}/perfil-publico`);
      const data = await res.json().catch(() => null);

      if (res.ok && data) {
        setTrabajadorDetalle({
          ...trabajador,
          ...data,
        });
      }
    } catch (error) {
      console.error("Error cargando detalle del trabajador:", error);
    }
  };

  const abrirModalReserva = ({ trabajador = null, servicio = null } = {}) => {
    setTrabajadorSeleccionado(trabajador);
    setServicioSeleccionado(servicio || servicioPorUrl || null);
    setMostrarModalReserva(true);
  };

  const cerrarModalReserva = () => {
    setMostrarModalReserva(false);
    setTrabajadorSeleccionado(null);
    setServicioSeleccionado(null);
  };

  const renderCard = (t, extraClass = "") => {
    const id = getIdTrabajador(t);
    const nombre = getNombreTrabajador(t);
    const foto = getTrabajadorFoto(t);
    const badge = obtenerBadgeExtra(t);
    const rating = Number(t.calificacionPromedio || 0).toFixed(1);

    return (
      <article className={`catalogo-trab-card ${extraClass}`} key={id}>
        <button
          type="button"
          className="catalogo-trab-img"
          onClick={() => foto && setImagenPreview({ url: foto, nombre })}
        >
          {foto ? (
            <img src={foto} alt={nombre} loading="lazy" />
          ) : (
            <UserRound size={42} />
          )}

          <span className="catalogo-trab-img-badge">
            <Trophy size={12} />
            {badge}
          </span>

          <strong className="catalogo-trab-img-rating">
            <Star size={12} fill="currentColor" />
            {rating}
          </strong>
        </button>

        <div className="catalogo-trab-body compact">
          <div className="catalogo-trab-name-row">
            <button
              type="button"
              className="catalogo-trab-title"
              onClick={() => cargarDetalleTrabajador(t)}
            >
              {nombre}
            </button>

            <Link
              to={`/trabajador-publico/${id}`}
              className="catalogo-trab-view-btn"
              aria-label={`Ver perfil de ${nombre}`}
            >
              <Eye size={16} />
            </Link>
          </div>

          <button
            type="button"
            className="catalogo-trab-cta"
            onClick={() => abrirModalReserva({ trabajador: t })}
          >
            Elegir
          </button>
        </div>
      </article>
    );
  };

  const renderSkeleton = () => (
    <div className="catalogo-trab-skeleton-grid">
      {[1, 2, 3, 4].map((item) => (
        <div className="catalogo-trab-skeleton-card" key={item}>
          <div className="catalogo-trab-skeleton-img" />
          <div className="catalogo-trab-skeleton-line long" />
          <div className="catalogo-trab-skeleton-line short" />
          <div className="catalogo-trab-skeleton-btn" />
        </div>
      ))}
    </div>
  );

  const renderImagenPreviewModal = () => {
    if (!imagenPreview) return null;

    return (
      <div
        className="catalogo-trab-image-overlay"
        onClick={() => setImagenPreview(null)}
      >
        <div
          className="catalogo-trab-image-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" onClick={() => setImagenPreview(null)}>
            <X size={20} />
          </button>

          <img src={imagenPreview.url} alt={imagenPreview.nombre} />
          <h3>{imagenPreview.nombre}</h3>
        </div>
      </div>
    );
  };

  const renderTrabajadorDetalle = () => {
    if (!trabajadorDetalle) return null;

    const nombre = getNombreTrabajador(trabajadorDetalle);
    const descripcion = obtenerDescripcionTrabajador(trabajadorDetalle);
    const especialidad = obtenerEspecialidad(trabajadorDetalle);
    const experiencia = obtenerExperiencia(trabajadorDetalle);
    const portafolio = obtenerPortafolioTrabajador(trabajadorDetalle);

    return (
      <div className="catalogo-trab-details-overlay">
        <div className="catalogo-trab-details-panel">
          <div className="catalogo-trab-details-head">
            <button type="button" onClick={() => setTrabajadorDetalle(null)}>
              <ArrowLeft size={18} />
            </button>

            <span>{nombre}</span>

            <button type="button" onClick={() => setTrabajadorDetalle(null)}>
              <X size={18} />
            </button>
          </div>

          <div className="catalogo-trab-details-content">
            <h4>Descripción</h4>
            <p>{descripcion}</p>

            <div className="catalogo-trab-detail-tags">
              {especialidad && (
                <div>
                  <strong>Especialidad</strong>
                  <span>{especialidad}</span>
                </div>
              )}

              {experiencia && (
                <div>
                  <strong>Experiencia</strong>
                  <span>{experiencia}</span>
                </div>
              )}
            </div>

            {portafolio.length > 0 && (
              <div className="catalogo-trab-portfolio">
                <div className="catalogo-trab-portfolio-head">
                  <h4>Trabajos realizados</h4>
                  <span>{portafolio.length} trabajos</span>
                </div>

                <div className="catalogo-trab-portfolio-row">
                  {portafolio.map((img) => {
                    const url = obtenerImagenPortafolio(img);
                    const descripcionImg =
                      img?.descripcion || img?.Descripcion || "Trabajo realizado";

                    if (!url) return null;

                    return (
                      <button
                        type="button"
                        key={img.idImagen || img.IdImagen || url}
                        className="catalogo-trab-portfolio-item"
                        onClick={() =>
                          setImagenPreview({
                            url,
                            nombre: descripcionImg,
                          })
                        }
                      >
                        <img src={url} alt={descripcionImg} loading="lazy" />
                        <span>{descripcionImg}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="catalogo-trab-details-bottom-row">
              <Link
                to={`/trabajador-publico/${getIdTrabajador(trabajadorDetalle)}`}
                className="catalogo-trab-secondary-btn"
              >
                Ver perfil
              </Link>

              <button
                type="button"
                className="catalogo-trab-primary-btn"
                onClick={() => {
                  const trabajador = trabajadorDetalle;
                  setTrabajadorDetalle(null);
                  abrirModalReserva({ trabajador });
                }}
              >
                Elegir
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLoginModal = () => {
    if (!mostrarLoginModal) return null;

    return (
      <div
        className="catalogo-trab-login-overlay"
        onClick={() => setMostrarLoginModal(false)}
      >
        <div
          className="catalogo-trab-login-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="catalogo-trab-login-close"
            onClick={() => setMostrarLoginModal(false)}
          >
            <X size={18} />
          </button>

          <div className="catalogo-trab-login-logo">
            {logoNegocio ? (
              <img src={logoNegocio} alt={nombreNegocio} />
            ) : (
              <Scissors size={32} />
            )}
          </div>

          <h2>Bienvenido</h2>
          <p>Accede a tu panel de Barber.pe</p>

          <div className="catalogo-trab-login-field">
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

          <div className="catalogo-trab-login-field">
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

          <button type="button" className="catalogo-trab-login-forgot">
            ¿Olvidaste tu contraseña?
          </button>

          <button type="button" className="catalogo-trab-login-submit">
            Ingresar
          </button>

          <span className="catalogo-trab-login-copy">
            Barber.pe SaaS · Gestión profesional para barberías
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="catalogo-trab-page">
      <section className="catalogo-trab-desktop-public-header">
        <PublicHeader
          negocio={negocio}
          idNegocio={idNegocio}
          slugNegocio={slugNegocio}
          onReservar={() =>
            trabajadores[0] && abrirModalReserva({ trabajador: trabajadores[0] })
          }
        />
      </section>

      <header className="catalogo-trab-mobile-header">
        <Link to={`/negocio/${slugNegocio}`} className="catalogo-trab-mobile-logo">
          {logoNegocio ? (
            <img src={logoNegocio} alt={nombreNegocio} />
          ) : (
            <Scissors size={22} />
          )}
        </Link>

        <div className="catalogo-trab-mobile-search">
          <Search size={17} />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar profesionales..."
          />
        </div>
      </header>

      <main className="catalogo-trab-main" id="profesionales">
        {trabajadoresDestacados.length > 0 && (
          <section className="catalogo-trab-featured-section">
            <div className="catalogo-trab-section-head with-arrows">
              <div>
                <h2>Profesionales destacados</h2>
                <p>Los más recomendados para reservar rápido.</p>
              </div>

              <div className="catalogo-trab-carousel-arrows">
                <button type="button" onClick={() => moverDestacados("prev")}>
                  ‹
                </button>
                <button type="button" onClick={() => moverDestacados("next")}>
                  ›
                </button>
              </div>
            </div>

            <div className="catalogo-trab-featured-track" ref={destacadosRef}>
              {trabajadoresDestacados.map((t) => renderCard(t, "featured"))}
            </div>
          </section>
        )}

        <section className="catalogo-trab-mobile-title">
          <h1>Todos nuestros profesionales</h1>
          <p>Elige el especialista que prefieras.</p>
        </section>

        {loading ? (
          renderSkeleton()
        ) : (
          <>
            {error && <div className="catalogo-trab-error-msg">{error}</div>}

            {trabajadoresFiltrados.length > 0 ? (
              <div className="catalogo-trab-grid">
                {trabajadoresFiltrados.map((t) => renderCard(t))}
              </div>
            ) : (
              <div className="catalogo-trab-empty-card">
                <UserRound size={38} />
                <h4>Sin profesionales disponibles</h4>
                <p>No hay profesionales que coincidan con tu búsqueda.</p>
              </div>
            )}
          </>
        )}

        {servicios.length > 0 && (
          <section className="catalogo-mini-servicios-section">
            <div className="catalogo-mini-servicios-head">
              <div>
                <h2>Nuestros servicios</h2>
                <p>También puedes elegir primero el servicio.</p>
              </div>

              <Link to={`/catalogo-servicios/${idNegocio}`}>
                Ver todos <span>→</span>
              </Link>
            </div>

            <div className="catalogo-mini-servicios-row">
              {servicios.map((s) => {
                const id = s.idServicio || s.IdServicio;
                const nombre = s.nombre || s.Nombre;
                const imagen = obtenerImagenServicio(s);

                return (
                  <Link
                    to={`/catalogo-servicios/${idNegocio}`}
                    className="catalogo-mini-servicio"
                    key={id}
                  >
                    <div>
                      {imagen ? (
                        <img src={imagen} alt={nombre} loading="lazy" />
                      ) : (
                        <Scissors size={22} />
                      )}
                    </div>

                    <strong>{nombre}</strong>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <div id="contacto">
        <PageFooter
          nombreNegocio={nombreNegocio}
          redesSociales={redesSociales || []}
        />
      </div>

      <PublicBottomNav
        idNegocio={idNegocio}
        slugNegocio={slugNegocio}
        active="trabajadores"
        onPerfilClick={() => setMostrarLoginModal(true)}
      />

      <ModalReserva
        abierto={mostrarModalReserva}
        onClose={cerrarModalReserva}
        apiBase={API_BASE}
        servicios={servicios}
        trabajadores={trabajadores}
        servicioInicial={servicioSeleccionado}
        trabajadorInicial={trabajadorSeleccionado}
      />

      {renderImagenPreviewModal()}
      {renderTrabajadorDetalle()}
      {renderLoginModal()}
    </div>
  );
}