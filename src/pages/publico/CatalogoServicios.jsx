import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API_BASE from "../../services/api";

import AvatarCircle from "../../components/ui/AvatarCircle";
import PublicHeader from "../../components/ui/PublicHeader";
import PublicBottomNav from "../../components/ui/PublicBottomNav";
import PageFooter from "../../components/ui/PageFooter";
import ModalReserva from "../../components/ui/ModalReserva";

import { getImageUrl } from "../../utils/imageUrl";

import {
  ArrowLeft,
  Clock,
  Globe,
  Scissors,
  Search,
  X,
} from "lucide-react";
import {
  FaFacebookF,
  FaInstagram,
  FaWhatsapp,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa";

import "../../styles/pages/catalogoservicios.css";

export default function CatalogoServicios() {
  const { idNegocio } = useParams();
  const destacadosRef = useRef(null);

  const [servicios, setServicios] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [negocio, setNegocio] = useState(null);
  const [redesSociales, setRedesSociales] = useState([]);
  const [loading, setLoading] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [mostrarModalReserva, setMostrarModalReserva] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState(null);

  const [servicioDetalle, setServicioDetalle] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        const res = await fetch(`${API_BASE}/Negocios/publico/${idNegocio}`);
        if (!res.ok) throw new Error("No se pudo cargar el catálogo");

        const data = await res.json();

        setNegocio(data.negocio || data.Negocio || null);

        setServicios(
          Array.isArray(data.servicios)
            ? data.servicios
            : Array.isArray(data.Servicios)
              ? data.Servicios
              : []
        );

        setTrabajadores(
          Array.isArray(data.trabajadores)
            ? data.trabajadores
            : Array.isArray(data.Trabajadores)
              ? data.Trabajadores
              : []
        );

        setRedesSociales(
          Array.isArray(data.redesSociales)
            ? data.redesSociales
            : Array.isArray(data.RedesSociales)
              ? data.RedesSociales
              : []
        );
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (idNegocio) cargarDatos();
  }, [idNegocio]);

  const nombreNegocio = negocio?.nombre || negocio?.Nombre || "Negocio";
  const slugNegocio = negocio?.slug || negocio?.Slug || idNegocio;

  const serviciosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return servicios
      .filter((s) => {
        const texto = `${s.nombre || s.Nombre || ""} ${s.descripcionCorta || s.DescripcionCorta || ""
          } ${s.descripcion || s.Descripcion || ""}`.toLowerCase();

        return texto.includes(q);
      })
      .sort((a, b) => {
        const da = a.destacado || a.Destacado ? 0 : 1;
        const db = b.destacado || b.Destacado ? 0 : 1;
        return da - db;
      });
  }, [servicios, busqueda]);

  const serviciosDestacados = useMemo(() => {
    return servicios.filter((s) => Boolean(s.destacado || s.Destacado));
  }, [servicios]);

  const trabajadoresVisibles = useMemo(() => {
    const destacados = trabajadores.filter((t) =>
      Boolean(t.destacado || t.Destacado)
    );

    return destacados.length > 0 ? destacados : trabajadores;
  }, [trabajadores]);

  const moverDestacados = (direction) => {
    if (!destacadosRef.current) return;

    destacadosRef.current.scrollBy({
      left: direction === "next" ? 280 : -280,
      behavior: "smooth",
    });
  };

  const obtenerImagenServicio = (servicio) => {
    const raw = servicio?.imagenUrl || servicio?.ImagenUrl || "";
    return raw ? getImageUrl(raw) : "";
  };

  const obtenerFotoTrabajador = (trabajador) => {
    const raw = trabajador?.fotoPerfilUrl || trabajador?.FotoPerfilUrl || "";
    return raw ? getImageUrl(raw) : "";
  };

  const obtenerDescripcionServicio = (servicio) => {
    return (
      servicio?.descripcion ||
      servicio?.Descripcion ||
      servicio?.descripcionCorta ||
      servicio?.DescripcionCorta ||
      "Servicio profesional con atención personalizada."
    );
  };

  const obtenerDuracionServicio = (servicio) => {
    return servicio?.duracionMinutos || servicio?.DuracionMinutos || "";
  };

  const abrirModalReserva = ({ servicio = null, trabajador = null } = {}) => {
    setServicioSeleccionado(servicio);
    setTrabajadorSeleccionado(trabajador);
    setMostrarModalReserva(true);
  };

  const cerrarModalReserva = () => {
    setMostrarModalReserva(false);
    setServicioSeleccionado(null);
    setTrabajadorSeleccionado(null);
  };

  const renderServicioCard = (servicio, extraClass = "") => {
    const id = servicio.idServicio || servicio.IdServicio;
    const nombre = servicio.nombre || servicio.Nombre;
    const precio = servicio.precioBase || servicio.PrecioBase || 0;
    const imagen = obtenerImagenServicio(servicio);
    const destacado = Boolean(servicio.destacado || servicio.Destacado);

    return (
      <article className={`catalogo-service-card ${extraClass}`} key={id}>
        <button
          type="button"
          className="catalogo-service-img"
          onClick={() => imagen && setImagenPreview({ url: imagen, nombre })}
          aria-label={`Ver imagen de ${nombre}`}
        >
          {imagen ? (
            <img src={imagen} alt={nombre} loading="lazy" />
          ) : (
            <Scissors size={34} />
          )}

          {destacado && <span className="catalogo-img-badge">★ Destacado</span>}

          <strong className="catalogo-img-price">
            S/ {Number(precio).toFixed(2)}
          </strong>
        </button>

        <div className="catalogo-service-body">
          <button
            type="button"
            className="catalogo-service-title"
            onClick={() => setServicioDetalle(servicio)}
          >
            {nombre}
          </button>

          <button
            type="button"
            className="catalogo-card-cta"
            onClick={() => abrirModalReserva({ servicio })}
          >
            Lo quiero
          </button>
        </div>
      </article>
    );
  };

  const renderImagenPreview = () => {
    if (!imagenPreview) return null;

    return (
      <div
        className="catalogo-image-preview-overlay"
        onClick={() => setImagenPreview(null)}
      >
        <div
          className="catalogo-image-preview-modal"
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

  const renderServicioDetalle = () => {
    if (!servicioDetalle) return null;

    const nombre = servicioDetalle.nombre || servicioDetalle.Nombre;
    const duracion = obtenerDuracionServicio(servicioDetalle);
    const descripcion = obtenerDescripcionServicio(servicioDetalle);

    return (
      <div className="catalogo-details-overlay">
        <div className="catalogo-details-panel">
          <div className="catalogo-details-head">
            <button type="button" onClick={() => setServicioDetalle(null)}>
              <ArrowLeft size={18} />
            </button>

            <span>{nombre}</span>

            <button type="button" onClick={() => setServicioDetalle(null)}>
              <X size={18} />
            </button>
          </div>

          <div className="catalogo-details-content compact">
            <h4>Descripción</h4>
            <p>{descripcion}</p>

            <div className="catalogo-details-bottom-row">
              <div>
                <h4>Duración</h4>

                <div className="catalogo-details-duration">
                  <Clock size={17} />
                  <strong>{duracion ? `${duracion} min` : "Consultar"}</strong>
                </div>
              </div>

              <button
                type="button"
                className="catalogo-primary-btn"
                onClick={() => {
                  setServicioDetalle(null);
                  abrirModalReserva({ servicio: servicioDetalle });
                }}
              >
                Lo quiero
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="catalogo-service-page">
      <section className="catalogo-desktop-public-header">
        <PublicHeader
          negocio={negocio}
          idNegocio={idNegocio}
          slugNegocio={slugNegocio}
          onReservar={() =>
            abrirModalReserva({
              servicio: servicios[0] || null,
            })
          }
        />
      </section>

      <header className="catalogo-service-header">
        <Link
          to={`/negocio/${slugNegocio}`}
          className="catalogo-service-logo-btn"
        >
          {negocio?.logoUrl || negocio?.LogoUrl ? (
            <img
              src={getImageUrl(negocio?.logoUrl || negocio?.LogoUrl)}
              alt={nombreNegocio}
            />
          ) : (
            <Scissors size={22} />
          )}
        </Link>

        <div className="catalogo-service-search">
          <Search size={17} />

          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar servicios..."
          />
        </div>
      </header>

      <main className="catalogo-service-main" id="servicios">
        {serviciosDestacados.length > 0 && (
          <section className="catalogo-featured-section">
            <div className="catalogo-section-head with-arrows">
              <div>
                <h2>Servicios destacados</h2>
                <p>Los favoritos para reservar rápido.</p>
              </div>

              <div className="catalogo-carousel-arrows">
                <button type="button" onClick={() => moverDestacados("prev")}>
                  ‹
                </button>

                <button type="button" onClick={() => moverDestacados("next")}>
                  ›
                </button>
              </div>
            </div>

            <div className="catalogo-featured-track" ref={destacadosRef}>
              {serviciosDestacados.map((s) =>
                renderServicioCard(s, "featured")
              )}
            </div>
          </section>
        )}

        <div className="catalogo-mobile-title">
          <h1>Todos nuestros servicios</h1>
          <p>Elige fácil y reserva fácil.</p>
        </div>

        {loading ? (
          <div className="catalogo-skeleton-grid">
            {[1, 2, 3, 4].map((item) => (
              <div className="catalogo-skeleton-card" key={item}>
                <div className="catalogo-skeleton-img" />
                <div className="catalogo-skeleton-line long" />
                <div className="catalogo-skeleton-line short" />
                <div className="catalogo-skeleton-btn" />
              </div>
            ))}
          </div>
        ) : serviciosFiltrados.length > 0 ? (
          <div className="catalogo-services-grid">
            {serviciosFiltrados.map((s) => renderServicioCard(s))}
          </div>
        ) : (
          <div className="catalogo-empty">
            <Search size={28} />
            <p>No encontramos servicios.</p>
          </div>
        )}

        {trabajadoresVisibles.length > 0 && (
          <section
            className="catalogo-workers-mini-section"
            id="profesionales-mini"
          >
            <div className="catalogo-workers-mini-head">
              <div>
                <h2>Nuestros profesionales</h2>
                <p>Conoce quién puede atenderte.</p>
              </div>

              <Link to={`/catalogo-trabajadores/${idNegocio}`}>
                Ver todos <span>→</span>
              </Link>
            </div>

            <div className="catalogo-workers-mini-marquee">
              <div className="catalogo-workers-mini-track">
                {trabajadoresVisibles.map((t, idx) => {
                  const id = t.idTrabajador || t.IdTrabajador || idx;
                  const nombre = t.nombre || t.Nombre;

                  return (
                    <Link
                      to={`/trabajador-publico/${id}`}
                      className="catalogo-worker-mini"
                      key={`${id}-${idx}`}
                    >
                      <AvatarCircle
                        src={obtenerFotoTrabajador(t)}
                        alt={nombre}
                        fallback={nombre?.charAt(0) || "T"}
                        selected
                        size="md"
                      />

                      <strong>{nombre}</strong>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}
        {(redesSociales || []).length > 0 && (
          <section className="catalogo-mobile-social-section">
            <div className="catalogo-mobile-social-icons">
              {(redesSociales || []).map((r) => {
                const tipo = String(r.tipo || r.Tipo || "").toLowerCase();

                return (
                  <a
                    key={r.idRedSocial || r.IdRedSocial || r.url || r.Url}
                    href={r.url || r.Url}
                    target="_blank"
                    rel="noreferrer"
                    className={`social-${tipo}`}
                    aria-label={tipo}
                  >
                    {tipo === "facebook" && <FaFacebookF />}
                    {tipo === "instagram" && <FaInstagram />}
                    {tipo === "whatsapp" && <FaWhatsapp />}
                    {tipo === "tiktok" && <FaTiktok />}
                    {tipo === "youtube" && <FaYoutube />}

                    {!["facebook", "instagram", "whatsapp", "tiktok", "youtube"].includes(tipo) && (
                      <Globe size={18} />
                    )}
                  </a>
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
        active="servicios"
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

      {renderImagenPreview()}
      {renderServicioDetalle()}
    </div>
  );
}