import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import API_BASE from "../../services/api";

import CardDark from "../../components/ui/CardDark";
import GoldBadge from "../../components/ui/GoldBadge";
import AvatarCircle from "../../components/ui/AvatarCircle";
import PublicHeader from "../../components/ui/PublicHeader";
import PublicBottomNav from "../../components/ui/PublicBottomNav";
import PageFooter from "../../components/ui/PageFooter";
import ModalReserva from "../../components/ui/ModalReserva";

import { getImageUrl } from "../../utils/imageUrl";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation, FreeMode } from "swiper/modules";

import {
  Clock,
  Globe,
  MapPin,
  Scissors,
  Search,
  Sparkles,
  Star,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import {
  FaFacebookF,
  FaInstagram,
  FaWhatsapp,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css/free-mode";

const HORARIOS_NEGOCIO = {
  1: { abierto: true, inicio: "09:00", fin: "20:00", label: "Lunes" },
  2: { abierto: true, inicio: "09:00", fin: "20:00", label: "Martes" },
  3: { abierto: true, inicio: "09:00", fin: "20:00", label: "Miércoles" },
  4: { abierto: true, inicio: "09:00", fin: "20:00", label: "Jueves" },
  5: { abierto: true, inicio: "09:00", fin: "20:00", label: "Viernes" },
  6: { abierto: true, inicio: "10:00", fin: "18:00", label: "Sábado" },
  0: { abierto: false, inicio: "", fin: "", label: "Domingo" },
};

export default function LandingNegocio() {
  const { slug } = useParams();
  const location = useLocation();

  const [data, setData] = useState(null);
  const [mostrarHorariosModal, setMostrarHorariosModal] = useState(false);
  const [busquedaMobile, setBusquedaMobile] = useState("");

  const [mostrarModalReserva, setMostrarModalReserva] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [trabajadorSeleccionadoModal, setTrabajadorSeleccionadoModal] =
    useState(null);
  const [servicioFlipId, setServicioFlipId] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch(`${API_BASE}/Negocios/publico-slug/${slug}`);
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error(error);
      }
    };

    cargar();
  }, [slug]);

  useEffect(() => {
    const scrollTo = location.state?.scrollTo;
    if (!scrollTo) return;

    const timer = setTimeout(() => {
      const element = document.getElementById(scrollTo);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [location.state, data]);

  const horarios = useMemo(
    () => data?.negocio?.horariosAtencion || HORARIOS_NEGOCIO,
    [data]
  );

  const servicios = useMemo(() => data?.servicios || [], [data]);
  const trabajadores = useMemo(() => data?.trabajadores || [], [data]);

  const serviciosDestacados = useMemo(() => {
    return servicios
      .filter((s) => Boolean(s.destacado || s.Destacado))
      .slice(0, 3);
  }, [servicios]);

  const serviciosPreview = useMemo(() => {
    const destacadosIds = serviciosDestacados.map(
      (s) => s.idServicio || s.IdServicio
    );

    const restantes = servicios.filter(
      (s) => !destacadosIds.includes(s.idServicio || s.IdServicio)
    );

    return [...restantes]
      .sort((a, b) => {
        const idA = Number(a.idServicio || a.IdServicio || 0);
        const idB = Number(b.idServicio || b.IdServicio || 0);
        return idB - idA;
      })
      .slice(0, 3);
  }, [servicios, serviciosDestacados]);

  const trabajadoresPreview = useMemo(() => {
    const destacados = trabajadores.filter((t) =>
      Boolean(t.destacado || t.Destacado)
    );

    return destacados.length > 0
      ? destacados.slice(0, 6)
      : trabajadores.slice(0, 6);
  }, [trabajadores]);

  const serviciosFiltradosMobile = useMemo(() => {
    const q = busquedaMobile.trim().toLowerCase();

    if (!q) return serviciosDestacados;

    return servicios.filter((s) => {
      const nombre = String(s.nombre || s.Nombre || "").toLowerCase();
      const descripcion = String(
        s.descripcionCorta ||
        s.DescripcionCorta ||
        s.descripcion ||
        s.Descripcion ||
        ""
      ).toLowerCase();

      const precio = String(s.precioBase || s.PrecioBase || "").toLowerCase();

      return nombre.includes(q) || descripcion.includes(q) || precio.includes(q);
    });
  }, [busquedaMobile, servicios, serviciosDestacados]);

  if (!data) return null;

  const idNegocio = data.negocio?.idNegocio || data.negocio?.IdNegocio;
  const slugNegocio = data.negocio?.slug || data.negocio?.Slug || slug;
  const logo = data.negocio.logoUrl ? getImageUrl(data.negocio.logoUrl) : "";
  const imagenesCarrusel = data.imagenes || [];
  const numeroWhatsApp = data.negocio.whatsappNegocio || data.negocio.telefono;

  const mensajeWhatsAppLanding = encodeURIComponent(
    `Hola, ${data.negocio.nombre}. Estoy interesado en sus servicios. ¿Me podrían brindar más información?`
  );

  const abrirModalReserva = ({ servicio = null, trabajador = null } = {}) => {
    setServicioSeleccionado(servicio);
    setTrabajadorSeleccionadoModal(trabajador);
    setMostrarModalReserva(true);
  };

  const cerrarModalReserva = () => {
    setMostrarModalReserva(false);
    setServicioSeleccionado(null);
    setTrabajadorSeleccionadoModal(null);
  };

  const convertirMinutos = (hora) => {
    if (!hora) return 0;
    const [h, m] = hora.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const formatearHora = (hora) => {
    if (!hora) return "Cerrado";

    const [h, m] = hora.split(":").map(Number);
    const date = new Date();
    date.setHours(h || 0, m || 0, 0, 0);

    return date
      .toLocaleTimeString("en-US", {
        hour: "numeric",
        hour12: true,
      })
      .replace(" ", "");
  };

  const obtenerProximaApertura = (diaActual, horariosConfig) => {
    for (let i = 1; i <= 7; i += 1) {
      const siguiente = (diaActual + i) % 7;
      const horario = horariosConfig[siguiente];

      if (horario?.abierto) {
        const nombreDia =
          i === 1 ? "mañana" : horario.label?.toLowerCase() || "próximamente";

        return `Abre ${nombreDia} ${formatearHora(horario.inicio)}`;
      }
    }

    return "Sin horarios disponibles";
  };

  const obtenerEstado = () => {
    const ahora = new Date();
    const dia = ahora.getDay();
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
    const horarioHoy = horarios[dia];

    if (!horarioHoy || !horarioHoy.abierto) {
      return {
        abierto: false,
        texto: "Cerrado hoy",
        detalle: obtenerProximaApertura(dia, horarios),
      };
    }

    const inicio = convertirMinutos(horarioHoy.inicio);
    const fin = convertirMinutos(horarioHoy.fin);

    if (minutosAhora >= inicio && minutosAhora < fin) {
      return {
        abierto: true,
        texto: `Abierto hasta ${formatearHora(horarioHoy.fin)}`,
        detalle: `${formatearHora(horarioHoy.inicio)} - ${formatearHora(
          horarioHoy.fin
        )}`,
      };
    }

    if (minutosAhora < inicio) {
      return {
        abierto: false,
        texto: `Abre hoy ${formatearHora(horarioHoy.inicio)}`,
        detalle: `${formatearHora(horarioHoy.inicio)} - ${formatearHora(
          horarioHoy.fin
        )}`,
      };
    }

    return {
      abierto: false,
      texto: obtenerProximaApertura(dia, horarios),
      detalle: `${formatearHora(horarioHoy.inicio)} - ${formatearHora(
        horarioHoy.fin
      )}`,
    };
  };

  const estado = obtenerEstado();

  const obtenerImagenServicio = (s) => {
    const imagenRaw = s?.imagenUrl || s?.ImagenUrl || "";
    return imagenRaw ? getImageUrl(imagenRaw) : "";
  };

  const obtenerFotoTrabajador = (t) => {
    const raw = t?.fotoPerfilUrl || t?.FotoPerfilUrl || "";
    return raw ? getImageUrl(raw) : "";
  };

  const horariosResumen = [
    {
      label: "Lun - Vie",
      abierto: true,
      inicio: horarios[1]?.inicio || "09:00",
      fin: horarios[1]?.fin || "20:00",
    },
    {
      label: "Sábado",
      abierto: horarios[6]?.abierto,
      inicio: horarios[6]?.inicio,
      fin: horarios[6]?.fin,
    },
    {
      label: "Domingo",
      abierto: horarios[0]?.abierto,
      inicio: horarios[0]?.inicio,
      fin: horarios[0]?.fin,
    },
  ];

  const textoQuienesSomos =
    data.negocio?.descripcionPublica ||
    data.negocio?.descripcion ||
    "Creamos una experiencia cómoda, moderna y personalizada para que cada visita se sienta especial.";

  const renderSectionHead = ({ title, subtitle, badge, to }) => (
    <div className="landing-pro-section-head">
      <div>
        <h3 className="section-title mb-1">{title}</h3>
        <p className="section-subtitle mb-0">{subtitle}</p>
      </div>

      <div className="landing-pro-section-actions">
        {badge && <GoldBadge>{badge}</GoldBadge>}

        {to && (
          <Link to={to} className="btn btn-dark-outline btn-sm">
            Ver todos
          </Link>
        )}
      </div>
    </div>
  );

  const renderServicioDestacadoCard = (s, modo = "desktop") => {
    const idServicio = s.idServicio || s.IdServicio;
    const nombre = s.nombre || s.Nombre;
    const imagenServicio = obtenerImagenServicio(s);
    const precio = Number(s.precioBase || s.PrecioBase || 0).toFixed(2);
    const duracion = s.duracionMinutos || s.DuracionMinutos;

    const descripcion =
      s.descripcionCorta ||
      s.DescripcionCorta ||
      s.descripcion ||
      s.Descripcion ||
      "Servicio profesional con atención personalizada.";

    const estaVolteada = servicioFlipId === idServicio;

    return (
      <article
        className={`landing-featured-service-card ${modo} ${estaVolteada ? "flipped" : ""
          }`}
      >
        <button
          type="button"
          className="landing-featured-flip-area"
          onClick={() => setServicioFlipId(estaVolteada ? null : idServicio)}
          aria-label="Ver detalle del servicio"
        >
          <div className="landing-featured-front">
            <div className="landing-featured-image">
              {imagenServicio ? (
                <img src={imagenServicio} alt={nombre} loading="lazy" />
              ) : (
                <Scissors size={38} />
              )}

              <span className="landing-featured-badge">
                <Star size={13} />
                Destacado
              </span>

              <div className="landing-featured-front-info">
                <h4>{nombre}</h4>
                <strong>S/ {precio}</strong>
                <small>Toca para ver detalles</small>
              </div>
            </div>
          </div>

          <div className="landing-featured-back">
            <h4>{nombre}</h4>
            <p>{descripcion}</p>

            {duracion && (
              <span className="landing-featured-duration">
                <Clock size={15} />
                {duracion} min
              </span>
            )}

            <small>Toca para volver</small>
          </div>
        </button>

        <button
          type="button"
          className="landing-featured-reserve-btn"
          onClick={() => abrirModalReserva({ servicio: s })}
        >
          Reservar
        </button>
      </article>
    );
  };

  const renderHorariosModal = () => {
    if (!mostrarHorariosModal) return null;

    const dias = [
      { key: 1, label: "Lunes" },
      { key: 2, label: "Martes" },
      { key: 3, label: "Miércoles" },
      { key: 4, label: "Jueves" },
      { key: 5, label: "Viernes" },
      { key: 6, label: "Sábado" },
      { key: 0, label: "Domingo" },
    ];

    return (
      <div
        className="landing-hours-modal-overlay"
        onClick={() => setMostrarHorariosModal(false)}
      >
        <div
          className="landing-hours-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="landing-hours-modal-head">
            <div>
              <h2>Horarios</h2>
              <p>{estado.detalle || "Consulta los horarios de atención."}</p>
            </div>

            <button type="button" onClick={() => setMostrarHorariosModal(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="landing-hours-modal-list">
            {dias.map((d) => {
              const h = horarios[d.key];
              const abierto = Boolean(h?.abierto);

              return (
                <div className="landing-hours-modal-row" key={d.key}>
                  <strong>{d.label}</strong>

                  <span className={abierto ? "open" : "closed"}>
                    {abierto
                      ? `${formatearHora(h.inicio)} - ${formatearHora(h.fin)}`
                      : "Cerrado"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-shell landing-public-page landing-pro-page">
      <section className="landing-mobile-app">
        <header className="mobile-app-header">
          <Link to={`/negocio/${slug}`} className="mobile-app-brand">
            {logo ? (
              <img src={logo} alt={data.negocio.nombre} />
            ) : (
              <Scissors size={22} />
            )}
          </Link>

          <div className="mobile-search-wrap">
            <div className="mobile-search-box">
              <Search size={17} />
              <input
                value={busquedaMobile}
                onChange={(e) => setBusquedaMobile(e.target.value)}
                placeholder="Buscar servicios..."
              />
            </div>

            {busquedaMobile.trim() && (
              <div className="mobile-search-results">
                {serviciosFiltradosMobile.length > 0 ? (
                  serviciosFiltradosMobile.map((s) => (
                    <button
                      key={s.idServicio || s.IdServicio}
                      type="button"
                      onClick={() => {
                        setBusquedaMobile("");
                        abrirModalReserva({ servicio: s });
                      }}
                    >
                      <span>{s.nombre || s.Nombre}</span>
                      <b>S/ {Number(s.precioBase || s.PrecioBase || 0).toFixed(2)}</b>
                    </button>
                  ))
                ) : (
                  <p>No se encontraron servicios.</p>
                )}
              </div>
            )}
          </div>
        </header>

        <main id="mobile-inicio" className="mobile-app-main">
          <section className="mobile-business-hero-card">
            <div className="mobile-business-image-wrap">
              {imagenesCarrusel.length > 0 ? (
                <Swiper
                  modules={[Autoplay, Pagination]}
                  slidesPerView={1}
                  loop={imagenesCarrusel.length > 1}
                  autoplay={{ delay: 3500, disableOnInteraction: false }}
                  pagination={{ clickable: true }}
                  className="mobile-photo-swiper"
                >
                  {imagenesCarrusel.map((img) => (
                    <SwiperSlide key={img.idImagen || img.IdImagen}>
                      <div className="mobile-business-image">
                        <img
                          src={getImageUrl(img.urlImagen || img.UrlImagen)}
                          alt={img.descripcion || data.negocio.nombre}
                        />
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              ) : (
                <div className="mobile-business-image empty">
                  <Scissors size={42} />
                </div>
              )}

              <div className="mobile-business-image-gradient" />

              <div className="mobile-business-overlay-content">
                <span
                  className={`mobile-business-status ${estado.abierto ? "open" : "closed"
                    }`}
                >
                  {estado.abierto ? "Abierto ahora" : "Cerrado ahora"}
                </span>

                <h1>{data.negocio.nombre}</h1>

                <p>
                  <MapPin size={16} />
                  {data.negocio.direccion || "Dirección no registrada"}
                </p>

                <button type="button" onClick={() => setMostrarHorariosModal(true)}>
                  <Clock size={16} />
                  Ver horarios
                </button>
              </div>
            </div>
          </section>

          {serviciosDestacados.length > 0 && (
            <section className="mobile-section" id="mobile-servicios">
              <div className="mobile-section-head">
                <h2>Servicios destacados</h2>

                {idNegocio && (
                  <Link to={`/catalogo-servicios/${idNegocio}`}>
                    Ver todos →
                  </Link>
                )}
              </div>

              <Swiper
                modules={[FreeMode, Pagination]}
                spaceBetween={14}
                slidesPerView={1.08}
                freeMode
                pagination={{ clickable: true }}
                className="mobile-featured-services-swiper"
              >
                {serviciosDestacados.map((s) => (
                  <SwiperSlide key={s.idServicio || s.IdServicio}>
                    {renderServicioDestacadoCard(s, "mobile")}
                  </SwiperSlide>
                ))}
              </Swiper>
            </section>
          )}

          <section className="mobile-section">
            <div className="mobile-section-head">
              <h2>Nuestros profesionales</h2>

              {idNegocio && (
                <Link to={`/catalogo-trabajadores/${idNegocio}`}>
                  Ver todos →
                </Link>
              )}
            </div>

            <div className="mobile-workers-row">
              {trabajadoresPreview.length > 0 ? (
                trabajadoresPreview.map((t) => {
                  const fotoTrabajador = obtenerFotoTrabajador(t);
                  const idTrabajador = t.idTrabajador || t.IdTrabajador;
                  const nombre = t.nombre || t.Nombre;

                  return (
                    <div className="mobile-worker-mini-wrap" key={idTrabajador}>
                      <Link
                        to={`/trabajador-publico/${idTrabajador}`}
                        className="mobile-worker-mini"
                      >
                        <AvatarCircle
                          src={fotoTrabajador}
                          alt={nombre}
                          fallback={nombre?.charAt(0)?.toUpperCase() || "T"}
                          size="md"
                        />

                        <span>{nombre}</span>
                      </Link>


                    </div>
                  );
                })
              ) : (
                <div className="mobile-empty-state">
                  <UsersRound size={24} />
                  <p>Aún no hay trabajadores visibles.</p>
                </div>
              )}
            </div>
          </section>

          {(data.redesSociales || []).length > 0 && (
            <section className="mobile-social-section">           

            <div className="mobile-social-icons">
                {(data.redesSociales || []).map((r) => {
                  const tipo = String(r.tipo || r.Tipo || "").toLowerCase();

                  return (
                    <a
                      key={
                        r.idRedSocial ||
                        r.IdRedSocial ||
                        r.url ||
                        r.Url
                      }
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

                      {![
                        "facebook",
                        "instagram",
                        "whatsapp",
                        "tiktok",
                        "youtube",
                      ].includes(tipo) && (
                          <Globe size={18} />
                        )}
                    </a>
                  );
                })}
              </div>
            </section>
          )}
        </main>

        <PublicBottomNav
          idNegocio={idNegocio}
          slugNegocio={slugNegocio}
          active="inicio"
        />
      </section>

      <section className="landing-desktop-page">
        <PublicHeader
          negocio={data.negocio}
          idNegocio={idNegocio}
          slugNegocio={slugNegocio}
          onReservar={() => abrirModalReserva()}
        />

        <main id="inicio" className="landing-page-main">
          <div className="container py-4 landing-main-container">
            <CardDark className="landing-hero-card">
              <div className="landing-hero-carousel landing-hero-mobile-full landing-pro-hero">
                {imagenesCarrusel.length > 0 ? (
                  <Swiper
                    modules={[Autoplay, Pagination, Navigation]}
                    slidesPerView={1}
                    loop={imagenesCarrusel.length > 1}
                    autoplay={{ delay: 3500, disableOnInteraction: false }}
                    pagination={{ clickable: true }}
                    navigation={false}
                  >
                    {imagenesCarrusel.map((img) => (
                      <SwiperSlide key={img.idImagen || img.IdImagen}>
                        <div className="landing-hero-slide">
                          <img
                            src={getImageUrl(img.urlImagen || img.UrlImagen)}
                            alt={img.descripcion || data.negocio.nombre}
                            className="landing-hero-img"
                            loading="eager"
                          />
                        </div>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                ) : (
                  <div className="landing-hero-slide landing-hero-empty" />
                )}

                <div className="landing-hero-overlay landing-pro-overlay">
                  <div className="landing-hero-content landing-pro-content">
                    {logo && (
                      <img
                        src={logo}
                        alt="Logo"
                        className="landing-hero-logo landing-pro-logo"
                      />
                    )}

                    <span
                      className={`landing-live-status ${estado.abierto ? "open" : "closed"
                        }`}
                    >
                      {estado.abierto ? "Atendiendo ahora" : "Sin atención ahora"}
                    </span>

                    <h1 className="landing-hero-title">{data.negocio.nombre}</h1>

                    <p className="landing-hero-address">
                      <MapPin size={18} />
                      {data.negocio.direccion}
                    </p>

                    <div className="landing-schedule-box landing-pro-schedule">
                      <div
                        className={`landing-status-box landing-pro-status ${estado.abierto ? "open" : "closed"
                          }`}
                      >
                        <div className="landing-status-dot" />

                        <div>
                          <h5>{estado.abierto ? "Abierto ahora" : "Cerrado"}</h5>
                          <p>{estado.texto}</p>
                        </div>
                      </div>

                      <div className="landing-hours-box landing-pro-hours">
                        {horariosResumen.map((h) => (
                          <div className="landing-hour-row" key={h.label}>
                            <span>{h.label}</span>

                            <strong className={!h.abierto ? "closed" : ""}>
                              {h.abierto
                                ? `${formatearHora(h.inicio)} - ${formatearHora(h.fin)}`
                                : "Cerrado"}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="landing-hero-buttons">
                      <button
                        className="btn btn-gold"
                        onClick={() => abrirModalReserva()}
                      >
                        Reservar ahora
                      </button>

                      <a
                        href={`https://wa.me/${numeroWhatsApp}?text=${mensajeWhatsAppLanding}`}
                        className="btn btn-dark-outline landing-whatsapp-btn"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FaWhatsapp />
                        WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </CardDark>

            {serviciosDestacados.length > 0 && (
              <CardDark className="mt-4" id="servicios">
                {renderSectionHead({
                  title: "Servicios destacados",
                  subtitle: "Los favoritos para reservar rápido.",
                  badge: `${serviciosDestacados.length} destacados`,
                  to: idNegocio ? `/catalogo-servicios/${idNegocio}` : "",
                })}

                <Swiper
                  modules={[FreeMode, Pagination, Navigation]}
                  spaceBetween={22}
                  slidesPerView={1}
                  freeMode
                  navigation
                  pagination={{ clickable: true }}
                  breakpoints={{
                    768: { slidesPerView: 2 },
                    1024: { slidesPerView: 3 },
                  }}
                  className="landing-featured-services-swiper"
                >
                  {serviciosDestacados.map((s) => (
                    <SwiperSlide key={s.idServicio || s.IdServicio}>
                      {renderServicioDestacadoCard(s, "desktop")}
                    </SwiperSlide>
                  ))}
                </Swiper>
              </CardDark>
            )}

            <CardDark className="mt-4" id="catalogo-servicios">
              {renderSectionHead({
                title: "Nuestros servicios",
                subtitle: "Explora más opciones disponibles para tu próxima cita.",
                badge: `${servicios.length} servicios`,
                to: idNegocio ? `/catalogo-servicios/${idNegocio}` : "",
              })}

              {serviciosPreview.length > 0 ? (
                <div className="landing-mini-services-grid">
                  {serviciosPreview.map((s) => {
                    const imagenServicio = obtenerImagenServicio(s);
                    const idServicio = s.idServicio || s.IdServicio;
                    const nombre = s.nombre || s.Nombre;

                    return (
                      <article
                        key={idServicio}
                        className="landing-mini-service-card"
                      >
                        <div className="landing-mini-service-img">
                          {imagenServicio ? (
                            <img src={imagenServicio} alt={nombre} loading="lazy" />
                          ) : (
                            <Scissors size={24} />
                          )}
                        </div>

                        <div>
                          <h4>{nombre}</h4>

                          <p>
                            S/ {Number(s.precioBase || s.PrecioBase || 0).toFixed(2)}
                            {s.duracionMinutos || s.DuracionMinutos
                              ? ` · ${s.duracionMinutos || s.DuracionMinutos} min`
                              : ""}
                          </p>

                          <button
                            type="button"
                            className="landing-mini-reserve-btn"
                            onClick={() => abrirModalReserva({ servicio: s })}
                          >
                            Reservar
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="landing-empty-mini">
                  <Scissors size={34} />
                  <p>Aún no hay más servicios disponibles.</p>
                </div>
              )}
            </CardDark>

            <CardDark className="mt-4" id="profesionales">
              {renderSectionHead({
                title: "Nuestros profesionales",
                subtitle: "Profesionales recomendados para tu atención.",
                badge: `${trabajadoresPreview.length} visibles`,
                to: idNegocio ? `/catalogo-trabajadores/${idNegocio}` : "",
              })}

              {trabajadoresPreview.length > 0 ? (
                <div className="landing-pro-workers-grid">
                  {trabajadoresPreview.slice(0, 3).map((t) => {
                    const fotoTrabajador = obtenerFotoTrabajador(t);
                    const esDestacado = Boolean(t.destacado || t.Destacado);
                    const idTrabajador = t.idTrabajador || t.IdTrabajador;
                    const nombre = t.nombre || t.Nombre;

                    return (
                      <article
                        key={idTrabajador}
                        className="landing-pro-worker-card"
                      >
                        {esDestacado && (
                          <span className="landing-specialist-verified compact">
                            🏆 Destacado
                          </span>
                        )}

                        <AvatarCircle
                          src={fotoTrabajador}
                          alt={nombre}
                          fallback={nombre?.charAt(0)?.toUpperCase() || "T"}
                          selected={esDestacado}
                          size="lg"
                        />

                        <h4>{nombre}</h4>

                        <p>
                          {t.descripcion ||
                            t.Descripcion ||
                            "Especialista con atención profesional."}
                        </p>

                        <Link
                          to={`/trabajador-publico/${idTrabajador}`}
                          className="btn btn-gold w-100 mt-auto"
                        >
                          Ver perfil
                        </Link>

                        <button
                          type="button"
                          className="btn btn-dark-outline w-100 mt-2"
                          onClick={() => abrirModalReserva({ trabajador: t })}
                        >
                          Reservar
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="landing-empty-mini">
                  <UserRound size={34} />
                  <p>Aún no hay profesionales disponibles.</p>
                </div>
              )}
            </CardDark>

            <CardDark className="mt-3 landing-about-card" id="nosotros">
              <div className="landing-about-content">
                <div>
                  <span className="landing-about-badge">
                    <Sparkles size={15} />
                    Quiénes somos
                  </span>

                  <h2>Una experiencia pensada para que reserves con confianza</h2>

                  <p>{textoQuienesSomos}</p>
                </div>

                <div className="landing-about-stats">
                  <div>
                    <strong>{servicios.length}</strong>
                    <span>servicios</span>
                  </div>

                  <div>
                    <strong>{trabajadores.length}</strong>
                    <span>profesionales</span>
                  </div>

                  <div>
                    <strong>Online</strong>
                    <span>reservas</span>
                  </div>
                </div>
              </div>
            </CardDark>
          </div>
        </main>

        <div id="contacto" className="landing-negocio-footer-wrap">
          <PageFooter
            nombreNegocio={data.negocio.nombre}
            redesSociales={data.redesSociales || []}
          />
        </div>
      </section>

      <ModalReserva
        abierto={mostrarModalReserva}
        onClose={cerrarModalReserva}
        apiBase={API_BASE}
        servicios={servicios}
        trabajadores={trabajadores}
        servicioInicial={servicioSeleccionado}
        trabajadorInicial={trabajadorSeleccionadoModal}
      />

      {renderHorariosModal()}
    </div>
  );
}