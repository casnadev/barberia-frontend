import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import API_BASE from "../../services/api";

import CardDark from "../../components/ui/CardDark";
import GoldBadge from "../../components/ui/GoldBadge";
import AvatarCircle from "../../components/ui/AvatarCircle";

import { getImageUrl } from "../../utils/imageUrl";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation, FreeMode } from "swiper/modules";

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Play,
  Scissors,
  Sparkles,
  Star,
  UserRound,
  X,
} from "lucide-react";

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
  const [data, setData] = useState(null);

  const [mostrarModalReserva, setMostrarModalReserva] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);

  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState("");
  const [fechaReserva, setFechaReserva] = useState("");
  const [horaReserva, setHoraReserva] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [correoCliente, setCorreoCliente] = useState("");
  const [comentario, setComentario] = useState("");

  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  const [reservaConfirmada, setReservaConfirmada] = useState(false);
  const [datosReservaConfirmada, setDatosReservaConfirmada] = useState(null);
  const [guardandoReserva, setGuardandoReserva] = useState(false);

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
    if (!trabajadorSeleccionado || !fechaReserva) {
      setHorariosDisponibles([]);
      setHoraReserva("");
      return;
    }

    const cargarHorarios = async () => {
      try {
        setHoraReserva("");

        const res = await fetch(
          `${API_BASE}/Reservas/horarios-disponibles/${trabajadorSeleccionado}?fecha=${fechaReserva}`
        );

        const dataHorarios = await res.json();
        setHorariosDisponibles(Array.isArray(dataHorarios) ? dataHorarios : []);
      } catch (error) {
        console.error(error);
        setHorariosDisponibles([]);
      }
    };

    cargarHorarios();
  }, [trabajadorSeleccionado, fechaReserva]);

  const horarios = useMemo(() => {
    return data?.negocio?.horariosAtencion || HORARIOS_NEGOCIO;
  }, [data]);

  const servicios = useMemo(() => data?.servicios || [], [data]);
  const trabajadores = useMemo(() => data?.trabajadores || [], [data]);

  const serviciosDestacados = useMemo(() => {
    return servicios.filter((s) => Boolean(s.destacado || s.Destacado));
  }, [servicios]);

  const serviciosPreview = useMemo(() => {
    return servicios.slice(0, 3);
  }, [servicios]);

  const trabajadoresPreview = useMemo(() => {
    const destacados = trabajadores.filter((t) => Boolean(t.destacado || t.Destacado));
    return destacados.length > 0 ? destacados.slice(0, 3) : trabajadores.slice(0, 3);
  }, [trabajadores]);

  if (!data) return null;

  const idNegocio = data.negocio?.idNegocio || data.negocio?.IdNegocio;
  const logo = data.negocio.logoUrl ? getImageUrl(data.negocio.logoUrl) : "";
  const imagenesCarrusel = data.imagenes || [];

  const numeroWhatsApp = data.negocio.whatsappNegocio || data.negocio.telefono;
  const whatsappUrl = `https://wa.me/${numeroWhatsApp || ""}`;

  const mensajeWhatsAppLanding = encodeURIComponent(
    `Hola, ${data.negocio.nombre}. Estoy interesado en sus servicios. ¿Me podrían brindar más información?`
  );

  const cerrarModal = () => {
    setMostrarModalReserva(false);
    setServicioSeleccionado(null);
    setTrabajadorSeleccionado("");
    setFechaReserva("");
    setHoraReserva("");
    setNombreCliente("");
    setTelefonoCliente("");
    setCorreoCliente("");
    setComentario("");
    setHorariosDisponibles([]);
    setReservaConfirmada(false);
    setDatosReservaConfirmada(null);
    setGuardandoReserva(false);
  };

  const abrirModalReserva = (servicio = null) => {
    setServicioSeleccionado(servicio);
    setMostrarModalReserva(true);
    setReservaConfirmada(false);
    setDatosReservaConfirmada(null);
  };

  const validarReserva = () => {
    const telefono = telefonoCliente.trim();
    const correo = correoCliente.trim();

    if (!servicioSeleccionado) return "Selecciona un servicio.";
    if (!trabajadorSeleccionado) return "Selecciona un especialista.";
    if (!fechaReserva) return "Selecciona una fecha.";
    if (!horaReserva) return "Selecciona una hora.";
    if (!nombreCliente.trim()) return "Ingresa tu nombre.";
    if (!/^[0-9]{9}$/.test(telefono)) return "El teléfono debe tener 9 dígitos.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return "Ingresa un correo válido.";

    return "";
  };

  const confirmarReserva = async () => {
    const validacion = validarReserva();

    if (validacion) {
      alert(validacion);
      return;
    }

    try {
      setGuardandoReserva(true);

      const payload = {
        idTrabajador: Number(trabajadorSeleccionado),
        idServicio: Number(servicioSeleccionado.idServicio),
        nombreCliente: nombreCliente.trim(),
        telefonoCliente: telefonoCliente.trim(),
        correoCliente: correoCliente.trim(),
        fechaReserva,
        horaReserva: `${horaReserva}:00`,
      };

      const res = await fetch(`${API_BASE}/Reservas/crear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const respuesta = await res.json();

      if (!res.ok) {
        alert(respuesta.mensaje || "No se pudo registrar la reserva");
        return;
      }

      const trabajador = trabajadores.find(
        (t) => Number(t.idTrabajador) === Number(trabajadorSeleccionado)
      );

      setDatosReservaConfirmada({
        servicio: servicioSeleccionado,
        trabajador,
        fecha: fechaReserva,
        hora: horaReserva,
        cliente: nombreCliente.trim(),
        telefono: telefonoCliente.trim(),
        correo: correoCliente.trim(),
        estado: "Pendiente",
        whatsappUrl: respuesta.whatsappUrl,
      });

      setReservaConfirmada(true);
    } catch (error) {
      console.error(error);
      alert("Error de conexión al registrar la reserva");
    } finally {
      setGuardandoReserva(false);
    }
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

    return date.toLocaleTimeString("es-PE", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const obtenerProximaApertura = (diaActual, horariosConfig) => {
    for (let i = 1; i <= 7; i += 1) {
      const siguiente = (diaActual + i) % 7;
      const horario = horariosConfig[siguiente];

      if (horario?.abierto) {
        const nombreDia = i === 1 ? "mañana" : horario.label?.toLowerCase() || "próximamente";
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
        detalle: `${formatearHora(horarioHoy.inicio)} - ${formatearHora(horarioHoy.fin)}`,
      };
    }

    if (minutosAhora < inicio) {
      return {
        abierto: false,
        texto: `Abre hoy ${formatearHora(horarioHoy.inicio)}`,
        detalle: `${formatearHora(horarioHoy.inicio)} - ${formatearHora(horarioHoy.fin)}`,
      };
    }

    return {
      abierto: false,
      texto: obtenerProximaApertura(dia, horarios),
      detalle: `${formatearHora(horarioHoy.inicio)} - ${formatearHora(horarioHoy.fin)}`,
    };
  };

  const estado = obtenerEstado();

  const obtenerImagenServicio = (s) => {
    const imagenRaw = s?.imagenUrl || s?.ImagenUrl || "";
    return imagenRaw ? getImageUrl(imagenRaw) : "";
  };

  const obtenerFotoTrabajador = (t) => {
    return t?.fotoPerfilUrl ? getImageUrl(t.fotoPerfilUrl) : "";
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
    "Creamos una experiencia cómoda, moderna y personalizada para que cada visita se sienta especial. Nuestro equipo combina técnica, cuidado y buen trato para ayudarte a renovar tu imagen con confianza.";

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

  const renderFooter = () => (
    <footer className="landing-footer-clean">
      <div className="landing-footer-clean-inner">
        <div className="landing-footer-clean-main">
          <span className="landing-footer-clean-badge">Reserva online</span>
          <p>
            Elige tu servicio, selecciona un especialista y confirma tu cita en minutos.
          </p>
        </div>

        {(data.redesSociales || []).length > 0 && (
          <div className="landing-footer-clean-social">
            {(data.redesSociales || []).map((r) => (
              <a
                key={r.idRedSocial}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                aria-label={r.tipo}
              >
                {r.tipo === "facebook" && <span>f</span>}
                {r.tipo === "instagram" && <span>◎</span>}
                {r.tipo === "whatsapp" && <MessageCircle size={18} />}
                {r.tipo === "tiktok" && <span>♪</span>}
                {r.tipo === "youtube" && <Play size={18} />}
                {!["facebook", "instagram", "whatsapp", "tiktok", "youtube"].includes(r.tipo) && (
                  <Globe size={18} />
                )}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="landing-footer-clean-bottom">
        <span>© 2026 {data.negocio.nombre}</span>
        <span>Servicios y reservas disponibles online</span>
      </div>
    </footer>
  );

  return (
    <div className="page-shell landing-public-page landing-pro-page">
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
                  <SwiperSlide key={img.idImagen}>
                    <div className="landing-hero-slide">
                      <img
                        src={getImageUrl(img.urlImagen)}
                        alt={img.descripcion || data.negocio.nombre}
                        className="landing-hero-img"
                        loading="eager"
                      />

                      {img.descripcion && (
                        <div className="landing-img-description">
                          <h4>{img.descripcion}</h4>
                          <p>Vive la experiencia en nuestro local</p>
                        </div>
                      )}
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

                <GoldBadge>{estado.abierto ? "Disponible ahora" : "Agenda disponible"}</GoldBadge>

                <h1 className="landing-hero-title">{data.negocio.nombre}</h1>

                <p className="landing-hero-address">
                  <MapPin size={18} />
                  {data.negocio.direccion}
                </p>

                <div className="landing-schedule-box landing-pro-schedule">
                  <div className={`landing-status-box landing-pro-status ${estado.abierto ? "open" : "closed"}`}>
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
                  <button className="btn btn-gold" onClick={() => abrirModalReserva()}>
                    Reservar ahora
                  </button>

                  <a
                    href={`https://wa.me/${numeroWhatsApp}?text=${mensajeWhatsAppLanding}`}
                    className="btn btn-dark-outline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle size={17} />
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
              subtitle: "Los servicios principales para reservar rápido.",
              badge: `${serviciosDestacados.length} destacados`,
              to: idNegocio ? `/catalogo-servicios/${idNegocio}` : "",
            })}

            <Swiper
              modules={[FreeMode, Pagination, Navigation]}
              spaceBetween={22}
              slidesPerView={1.08}
              freeMode={true}
              navigation={true}
              pagination={{ clickable: true }}
              loop={serviciosDestacados.length > 3}
              breakpoints={{
                576: { slidesPerView: 1.4 },
                768: { slidesPerView: 2.15 },
                1024: { slidesPerView: 3.05 },
              }}
              className="landing-services-swiper"
            >
              {serviciosDestacados.map((s) => {
                const imagenServicio = obtenerImagenServicio(s);

                return (
                  <SwiperSlide key={s.idServicio}>
                    <div className="landing-service-card">
                      <div className="landing-service-bg">
                        {imagenServicio ? (
                          <img src={imagenServicio} alt={s.nombre} loading="lazy" />
                        ) : (
                          <div className="landing-service-empty">
                            <Scissors size={64} />
                          </div>
                        )}

                        <div className="landing-service-gradient" />
                      </div>

                      <div className="landing-service-top">
                        <div>
                          <span className="landing-service-featured">
                            <Star size={13} />
                            Destacado
                          </span>
                        </div>

                        <div className="landing-service-price">
                          S/ {Number(s.precioBase || 0).toFixed(2)}
                        </div>
                      </div>

                      <div className="landing-service-content">
                        <h4>{s.nombre}</h4>

                        <div className="landing-service-meta">
                          {s.duracionMinutos && (
                            <span>
                              <Clock size={13} />
                              {s.duracionMinutos} min
                            </span>
                          )}

                          <span>Reserva online</span>
                        </div>

                        <p>
                          {s.descripcionCorta ||
                            "Servicio profesional con atención personalizada."}
                        </p>

                        <button className="btn btn-gold w-100" onClick={() => abrirModalReserva(s)}>
                          Quiero este servicio
                        </button>
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </CardDark>
        )}

        <CardDark className="mt-4">
          {renderSectionHead({
            title: "Nuestros servicios",
            subtitle: "Explora las opciones disponibles para tu próxima cita.",
            badge: `${servicios.length} servicios`,
            to: idNegocio ? `/catalogo-servicios/${idNegocio}` : "",
          })}

          {serviciosPreview.length > 0 ? (
            <div className="landing-mini-services-grid">
              {serviciosPreview.map((s) => {
                const imagenServicio = obtenerImagenServicio(s);

                return (
                  <article key={s.idServicio} className="landing-mini-service-card">
                    <div className="landing-mini-service-img">
                      {imagenServicio ? (
                        <img src={imagenServicio} alt={s.nombre} loading="lazy" />
                      ) : (
                        <Scissors size={24} />
                      )}
                    </div>

                    <div>
                      <h4>{s.nombre}</h4>
                      <p>
                        S/ {Number(s.precioBase || 0).toFixed(2)}
                        {s.duracionMinutos ? ` · ${s.duracionMinutos} min` : ""}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="landing-empty-mini">
              <Scissors size={34} />
              <p>Aún no hay servicios disponibles.</p>
            </div>
          )}
        </CardDark>

        <CardDark className="mt-4">
          {renderSectionHead({
            title: "Nuestros profesionales",
            subtitle: "Profesionales recomendados para tu atención.",
            badge: `${trabajadoresPreview.length} visibles`,
            to: idNegocio ? `/catalogo-trabajadores/${idNegocio}` : "",
          })}

          {trabajadoresPreview.length > 0 ? (
            <div className="landing-pro-workers-grid">
              {trabajadoresPreview.map((t) => {
                const fotoTrabajador = obtenerFotoTrabajador(t);
                const esDestacado = Boolean(t.destacado || t.Destacado);

                return (
                  <article key={t.idTrabajador} className="landing-pro-worker-card">
                    {esDestacado && (
                      <span className="landing-specialist-verified compact">
                        🏆 Destacado
                      </span>
                    )}

                    <AvatarCircle
                      src={fotoTrabajador}
                      alt={t.nombre}
                      fallback={t.nombre?.charAt(0)?.toUpperCase() || "T"}
                      selected={esDestacado}
                      size="lg"
                    />

                    <h4>{t.nombre}</h4>

                    <p>{t.descripcion || "Especialista con atención profesional."}</p>

                    <Link
                      to={`/trabajador-publico/${t.idTrabajador}`}
                      className="btn btn-gold w-100 mt-auto"
                    >
                      Ver perfil
                    </Link>
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

        <CardDark className="mt-4 landing-about-card">
          <div className="landing-about-content">
            <div>
              <span className="landing-about-badge">
                <Sparkles size={15} />
                Quiénes somos
              </span>

              <h3>Una experiencia pensada para que reserves con confianza</h3>

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

      {renderFooter()}

      <div className="mobile-bottom-actions">
        <button
          type="button"
          className="mobile-action-btn mobile-action-reserva"
          onClick={() => abrirModalReserva()}
        >
          Reservar
        </button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="mobile-action-btn mobile-action-whatsapp"
        >
          WhatsApp
        </a>
      </div>

      {mostrarModalReserva && (
        <div className="modal-reserva-overlay landing-booking-overlay">
          <div className="modal-reserva landing-booking-modal">
            {reservaConfirmada && datosReservaConfirmada ? (
              <>
                <div className="modal-success-header">
                  <CheckCircle2 size={42} />
                  <h2>Reserva registrada</h2>
                  <p>Tu cita fue guardada correctamente. Recibirás la confirmación por correo.</p>
                </div>

                <div className="modal-success-card">
                  <h4>{datosReservaConfirmada.servicio?.nombre}</h4>

                  <p>
                    {datosReservaConfirmada.servicio?.descripcionCorta ||
                      "Servicio profesional con atención personalizada."}
                  </p>

                  <div className="modal-info-row">
                    <span>Precio</span>
                    <b>S/ {Number(datosReservaConfirmada.servicio?.precioBase || 0).toFixed(2)}</b>
                  </div>

                  <div className="modal-info-row">
                    <span>Duración</span>
                    <b>{datosReservaConfirmada.servicio?.duracionMinutos || "-"} min</b>
                  </div>
                </div>

                <div className="modal-success-worker">
                  <AvatarCircle
                    src={
                      datosReservaConfirmada.trabajador?.fotoPerfilUrl
                        ? getImageUrl(datosReservaConfirmada.trabajador.fotoPerfilUrl)
                        : ""
                    }
                    alt={datosReservaConfirmada.trabajador?.nombre}
                    fallback={
                      datosReservaConfirmada.trabajador?.nombre?.charAt(0)?.toUpperCase() || "T"
                    }
                    size="md"
                  />

                  <div>
                    <p>Te atenderá</p>
                    <h5>{datosReservaConfirmada.trabajador?.nombre}</h5>
                  </div>
                </div>

                <div className="modal-success-details">
                  <div className="modal-info-row">
                    <span>Cliente</span>
                    <b>{datosReservaConfirmada.cliente}</b>
                  </div>

                  <div className="modal-info-row">
                    <span>Correo</span>
                    <b>{datosReservaConfirmada.correo}</b>
                  </div>

                  <div className="modal-info-row">
                    <span>Teléfono</span>
                    <b>{datosReservaConfirmada.telefono}</b>
                  </div>

                  <div className="modal-info-row">
                    <span>Fecha</span>
                    <b>{datosReservaConfirmada.fecha}</b>
                  </div>

                  <div className="modal-info-row">
                    <span>Hora</span>
                    <b>{datosReservaConfirmada.hora}</b>
                  </div>

                  <div className="modal-info-row">
                    <span>Estado</span>
                    <b className="text-gold">Pendiente</b>
                  </div>
                </div>

                {datosReservaConfirmada?.whatsappUrl && (
                  <a
                    href={datosReservaConfirmada.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-dark-outline w-100 mb-2"
                  >
                    Confirmación WhatsApp
                  </a>
                )}

                <button className="btn btn-gold w-100" onClick={cerrarModal}>
                  Regresar al inicio
                </button>
              </>
            ) : (
              <>
                <div className="landing-booking-head">
                  <div>
                    <h3>Reservar cita</h3>
                    <p>Elige servicio, especialista y horario.</p>
                  </div>

                  <button className="landing-booking-close" onClick={cerrarModal}>
                    <X size={18} />
                  </button>
                </div>

                <label className="label-gold">Servicio</label>

                <Swiper
                  modules={[FreeMode]}
                  spaceBetween={12}
                  slidesPerView={1.3}
                  freeMode={true}
                  breakpoints={{
                    576: { slidesPerView: 1.8 },
                    768: { slidesPerView: 2.4 },
                    1024: { slidesPerView: 3.1 },
                  }}
                  className="landing-reserva-service-swiper"
                >
                  {servicios.map((s) => {
                    const imagenServicio = obtenerImagenServicio(s);
                    const seleccionado =
                      Number(servicioSeleccionado?.idServicio) === Number(s.idServicio);

                    return (
                      <SwiperSlide key={s.idServicio}>
                        <button
                          type="button"
                          className={`landing-reserva-service-option ${seleccionado ? "selected" : ""}`}
                          onClick={() => setServicioSeleccionado(s)}
                        >
                          <div className="landing-reserva-service-img">
                            {imagenServicio ? (
                              <img src={imagenServicio} alt={s.nombre} />
                            ) : (
                              <Scissors size={26} />
                            )}
                          </div>

                          <h4>{s.nombre}</h4>

                          <p>
                            S/ {Number(s.precioBase || 0).toFixed(2)}
                            {s.duracionMinutos ? ` · ${s.duracionMinutos} min` : ""}
                          </p>

                          <span>{seleccionado ? "Seleccionado" : "Elegir"}</span>
                        </button>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>

                {servicioSeleccionado && (
                  <div className="landing-booking-service">
                    {servicioSeleccionado?.imagenUrl ? (
                      <img
                        src={getImageUrl(servicioSeleccionado.imagenUrl)}
                        alt={servicioSeleccionado.nombre}
                      />
                    ) : (
                      <div className="landing-booking-service-placeholder">
                        <Scissors size={26} />
                      </div>
                    )}

                    <div>
                      <strong>{servicioSeleccionado?.nombre}</strong>
                      <span>
                        S/ {Number(servicioSeleccionado?.precioBase || 0).toFixed(2)}
                        {servicioSeleccionado?.duracionMinutos
                          ? ` · ${servicioSeleccionado.duracionMinutos} min`
                          : ""}
                      </span>
                    </div>
                  </div>
                )}

                <label className="label-gold">Especialista</label>

                <Swiper
                  modules={[FreeMode]}
                  spaceBetween={12}
                  slidesPerView={2.1}
                  freeMode={true}
                  breakpoints={{
                    576: { slidesPerView: 2.5 },
                    768: { slidesPerView: 3.2 },
                    1024: { slidesPerView: 3.5 },
                  }}
                  className="landing-worker-swiper"
                >
                  {trabajadores.map((t) => {
                    const fotoTrabajador = obtenerFotoTrabajador(t);
                    const seleccionado = Number(trabajadorSeleccionado) === Number(t.idTrabajador);

                    return (
                      <SwiperSlide key={t.idTrabajador}>
                        <button
                          type="button"
                          className={`worker-card ${seleccionado ? "selected" : ""}`}
                          onClick={() => {
                            setTrabajadorSeleccionado(String(t.idTrabajador));
                            setFechaReserva("");
                            setHoraReserva("");
                            setHorariosDisponibles([]);
                          }}
                        >
                          <AvatarCircle
                            src={fotoTrabajador}
                            alt={t.nombre}
                            fallback={t.nombre?.charAt(0)?.toUpperCase() || "T"}
                            selected={seleccionado}
                            size="md"
                          />

                          <div className="worker-name" title={t.nombre}>
                            {t.nombre}
                          </div>

                          <div className="worker-status">
                            {seleccionado ? "Seleccionado" : "Elegir"}
                          </div>
                        </button>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>

                <div className="landing-booking-grid">
                  <div>
                    <label className="label-gold">Fecha</label>
                    <input
                      type="date"
                      className="form-control input-dark"
                      value={fechaReserva}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => {
                        setFechaReserva(e.target.value);
                        setHoraReserva("");
                      }}
                    />
                  </div>

                  <div>
                    <label className="label-gold">Hora</label>
                    <select
                      className="form-control input-dark"
                      value={horaReserva}
                      onChange={(e) => setHoraReserva(e.target.value)}
                      disabled={!trabajadorSeleccionado || !fechaReserva}
                    >
                      <option value="">
                        {!trabajadorSeleccionado
                          ? "Selecciona especialista"
                          : !fechaReserva
                            ? "Selecciona fecha"
                            : horariosDisponibles.length === 0
                              ? "Sin horarios"
                              : "Seleccionar horario"}
                      </option>

                      {horariosDisponibles.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="label-gold">Tus datos</label>

                <div className="landing-booking-grid">
                  <div className="perfil-reserva-input-icon">
                    <UserRound size={16} />
                    <input
                      placeholder="Nombre completo"
                      value={nombreCliente}
                      maxLength={120}
                      onChange={(e) => setNombreCliente(e.target.value)}
                    />
                  </div>

                  <div className="perfil-reserva-input-icon">
                    <Phone size={16} />
                    <input
                      placeholder="Teléfono / WhatsApp"
                      value={telefonoCliente}
                      maxLength={9}
                      inputMode="numeric"
                      onChange={(e) => setTelefonoCliente(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>

                  <div className="perfil-reserva-input-icon">
                    <Mail size={16} />
                    <input
                      placeholder="Correo"
                      type="email"
                      value={correoCliente}
                      maxLength={150}
                      onChange={(e) => setCorreoCliente(e.target.value)}
                    />
                  </div>

                  <textarea
                    placeholder="Comentario adicional opcional"
                    className="form-control input-dark"
                    rows="2"
                    value={comentario}
                    maxLength={250}
                    onChange={(e) => setComentario(e.target.value)}
                  />
                </div>

                <div className="landing-booking-actions">
                  <button
                    className="btn btn-gold"
                    onClick={confirmarReserva}
                    disabled={guardandoReserva}
                  >
                    {guardandoReserva ? "Registrando..." : "Confirmar reserva"}
                  </button>

                  <button
                    className="btn btn-dark-outline"
                    onClick={cerrarModal}
                    disabled={guardandoReserva}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
