import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import API_BASE from "../../services/api";

import CardDark from "../../components/ui/CardDark";
import GoldBadge from "../../components/ui/GoldBadge";
import AvatarCircle from "../../components/ui/AvatarCircle";
import PageFooter from "../../components/ui/PageFooter";
import FloatingActions from "../../components/ui/FloatingActions";
import { getImageUrl } from "../../utils/imageUrl";

import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";

import {
  ArrowLeft,
  Award,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Mail,
  MessageCircle,
  Phone,
  Scissors,
  Search,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  X,
} from "lucide-react";

import "swiper/css";
import "swiper/css/free-mode";

export default function CatalogoTrabajadores() {
  const { idNegocio } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idServicio = searchParams.get("servicio");

  const [trabajadores, setTrabajadores] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [negocio, setNegocio] = useState(null);
  const [redesSociales, setRedesSociales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filtroRating, setFiltroRating] = useState("todos");
  const [orden, setOrden] = useState("rating");
  const [busqueda, setBusqueda] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [trabajadorPreview, setTrabajadorPreview] = useState(null);

  const [mostrarModalReserva, setMostrarModalReserva] = useState(false);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState(null);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [fechaReserva, setFechaReserva] = useState("");
  const [horaReserva, setHoraReserva] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [correoCliente, setCorreoCliente] = useState("");
  const [comentario, setComentario] = useState("");
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  const [guardandoReserva, setGuardandoReserva] = useState(false);
  const [reservaConfirmada, setReservaConfirmada] = useState(false);
  const [datosReservaConfirmada, setDatosReservaConfirmada] = useState(null);
  const [mensajeErrorReserva, setMensajeErrorReserva] = useState("");

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
          setError(dataTrabajadores?.mensaje || "No se pudieron cargar los profesionales.");
          return;
        }

        setTrabajadores(Array.isArray(dataTrabajadores) ? dataTrabajadores : []);

        if (resNegocio.ok) {
          const dataNegocio = await resNegocio.json().catch(() => null);
          const serviciosNegocio = Array.isArray(dataNegocio?.servicios)
            ? dataNegocio.servicios
            : Array.isArray(dataNegocio?.Servicios)
              ? dataNegocio.Servicios
              : [];

          setNegocio(dataNegocio?.negocio || dataNegocio?.Negocio || null);
          setRedesSociales(
            Array.isArray(dataNegocio?.redesSociales)
              ? dataNegocio.redesSociales
              : Array.isArray(dataNegocio?.RedesSociales)
                ? dataNegocio.RedesSociales
                : []
          );
          setServicios(serviciosNegocio);
        }
      } catch (err) {
        console.error("Error fetching trabajadores:", err);
        setError("No se pudo conectar con el catálogo.");
      } finally {
        setLoading(false);
      }
    };

    if (idNegocio) cargar();
  }, [idNegocio]);

  useEffect(() => {
    if (!trabajadorSeleccionado?.idTrabajador || !fechaReserva) {
      setHorariosDisponibles([]);
      setHoraReserva("");
      return;
    }

    const cargarHorarios = async () => {
      try {
        setHoraReserva("");

        const res = await fetch(
          `${API_BASE}/Reservas/horarios-disponibles/${trabajadorSeleccionado.idTrabajador}?fecha=${fechaReserva}`
        );

        const data = await res.json().catch(() => []);
        setHorariosDisponibles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error cargando horarios:", err);
        setHorariosDisponibles([]);
      }
    };

    cargarHorarios();
  }, [trabajadorSeleccionado, fechaReserva]);

  const trabajadoresProcesados = useMemo(() => {
    let data = [...trabajadores];

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();

      data = data.filter((t) =>
        `${t.nombre || ""} ${t.descripcion || ""} ${t.especialidad || ""} ${t.experiencia || ""} ${t.distincion || ""}`
          .toLowerCase()
          .includes(q)
      );
    }

    if (filtroRating === "4") {
      data = data.filter((t) => Number(t.calificacionPromedio || 0) >= 4);
    } else if (filtroRating === "45") {
      data = data.filter((t) => Number(t.calificacionPromedio || 0) >= 4.5);
    }

    data.sort((a, b) => {
      if (orden === "rating") {
        return Number(b.calificacionPromedio || 0) - Number(a.calificacionPromedio || 0);
      }

      if (orden === "servicios") {
        return Number(b.totalServiciosRealizados || 0) - Number(a.totalServiciosRealizados || 0);
      }

      if (orden === "nombre") {
        return (a.nombre || "").localeCompare(b.nombre || "");
      }

      return 0;
    });

    return data;
  }, [trabajadores, filtroRating, orden, busqueda]);

  const destacados = useMemo(() => {
    return trabajadoresProcesados
      .filter(
        (t) =>
          t.destacado ||
          t.distincion ||
          Number(t.calificacionPromedio || 0) >= 4.8 ||
          Number(t.totalServiciosRealizados || 0) >= 50
      )
      .slice(0, 6);
  }, [trabajadoresProcesados]);

  const servicioPorUrl = useMemo(() => {
    if (!idServicio) return null;

    return servicios.find((s) => Number(s.idServicio || s.IdServicio) === Number(idServicio)) || null;
  }, [idServicio, servicios]);

  const obtenerBadgeExtra = (t) => {
    if (t.distincion) return t.distincion;
    if (Number(t.calificacionPromedio || 0) >= 4.8) return "Mejor valorado";
    if (Number(t.totalServiciosRealizados || 0) >= 50) return "Más solicitado";
    if (t.destacado) return "Destacado";
    return null;
  };

  const getTrabajadorFoto = (t) => {
    return t?.fotoPerfilUrl ? getImageUrl(t.fotoPerfilUrl) : "";
  };

  const obtenerImagenServicio = (s) => {
    const imagenRaw = s?.imagenUrl || s?.ImagenUrl || "";
    return imagenRaw ? getImageUrl(imagenRaw) : "";
  };

  const abrirPreview = (trabajador) => {
    setTrabajadorPreview(trabajador);
    setModalAbierto(true);
  };

  const cerrarPreview = () => {
    setTrabajadorPreview(null);
    setModalAbierto(false);
  };

  const limpiarReserva = () => {
    setTrabajadorSeleccionado(null);
    setServicioSeleccionado(null);
    setFechaReserva("");
    setHoraReserva("");
    setNombreCliente("");
    setTelefonoCliente("");
    setCorreoCliente("");
    setComentario("");
    setHorariosDisponibles([]);
    setGuardandoReserva(false);
    setReservaConfirmada(false);
    setDatosReservaConfirmada(null);
    setMensajeErrorReserva("");
  };

  const cerrarModalReserva = () => {
    setMostrarModalReserva(false);
    limpiarReserva();
  };

  const abrirModalReserva = ({ trabajador = null, servicio = null } = {}) => {
    setTrabajadorSeleccionado(trabajador);
    setServicioSeleccionado(servicio || servicioPorUrl || null);
    setFechaReserva("");
    setHoraReserva("");
    setNombreCliente("");
    setTelefonoCliente("");
    setCorreoCliente("");
    setComentario("");
    setHorariosDisponibles([]);
    setGuardandoReserva(false);
    setReservaConfirmada(false);
    setDatosReservaConfirmada(null);
    setMensajeErrorReserva("");
    setMostrarModalReserva(true);
  };

  const validarReserva = () => {
    const telefono = telefonoCliente.trim();
    const correo = correoCliente.trim();

    if (!trabajadorSeleccionado) return "Selecciona un profesional.";
    if (!servicioSeleccionado) return "Selecciona un servicio.";
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
      setMensajeErrorReserva(validacion);
      return;
    }

    try {
      setGuardandoReserva(true);
      setMensajeErrorReserva("");

      const payload = {
        idTrabajador: Number(trabajadorSeleccionado.idTrabajador),
        idServicio: Number(servicioSeleccionado.idServicio || servicioSeleccionado.IdServicio),
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

      const respuesta = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMensajeErrorReserva(respuesta.mensaje || "No se pudo registrar la reserva.");
        return;
      }

      setDatosReservaConfirmada({
        trabajador: trabajadorSeleccionado,
        servicio: servicioSeleccionado,
        fecha: fechaReserva,
        hora: horaReserva,
        cliente: nombreCliente.trim(),
        telefono: telefonoCliente.trim(),
        correo: correoCliente.trim(),
        comentario: comentario.trim(),
        estado: "Pendiente",
        whatsappUrl: respuesta.whatsappUrl,
      });

      setReservaConfirmada(true);
    } catch (err) {
      console.error("Error registrando reserva:", err);
      setMensajeErrorReserva("Error de conexión al registrar la reserva.");
    } finally {
      setGuardandoReserva(false);
    }
  };

  

  const whatsappRed =
    redesSociales.find((r) => (r.tipo || r.Tipo || "").toLowerCase() === "whatsapp")?.url ||
    redesSociales.find((r) => (r.tipo || r.Tipo || "").toLowerCase() === "whatsapp")?.Url ||
    "#";

  const textoWhatsApp = `Hola, ${negocio?.nombre || negocio?.Nombre || "Negocio"}. Quiero reservar una cita.`;

  const renderHeader = (subtitulo) => {
    const logoNegocio = negocio?.logoUrl || negocio?.LogoUrl
      ? getImageUrl(negocio?.logoUrl || negocio?.LogoUrl)
      : "";

    return (
      <div className="perfil-publico-header-shell container py-4">
        <CardDark className="perfil-publico-brand-card perfil-publico-header-clean mb-4">
          <div className="perfil-publico-header-layout">
            <div className="perfil-publico-header-copy">
              <span>Catálogo profesional</span>
              <h2>{negocio?.nombre || negocio?.Nombre || "Profesionales disponibles"}</h2>
              <p>{subtitulo}</p>
            </div>

            <div className="perfil-publico-header-logo">
              <AvatarCircle
                src={logoNegocio}
                alt={negocio?.nombre || negocio?.Nombre || "Negocio"}
                fallback={(negocio?.nombre || negocio?.Nombre || "N").charAt(0)}
                selected
                size="md"
              />
            </div>

            <div className="perfil-publico-header-action">
              <button
                type="button"
                className="btn btn-gold"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft size={16} />
                Volver
              </button>
            </div>
          </div>
        </CardDark>
      </div>
    );
  };

  const renderCard = (t) => {
    const badgeExtra = obtenerBadgeExtra(t);
    const foto = getTrabajadorFoto(t);

    return (
      <article className="catalogo-trab-card" key={t.idTrabajador}>
        <div className="catalogo-trab-card-top">
          {badgeExtra ? (
            <span className="catalogo-trab-ribbon">
              <Trophy size={13} />
              {badgeExtra}
            </span>
          ) : (
            <span className="catalogo-trab-ribbon muted">
              <UserRound size={13} />
              Profesional
            </span>
          )}
        </div>

        <div className="catalogo-trab-avatar-wrap">
          <AvatarCircle
            src={foto}
            alt={t.nombre || "Profesional"}
            fallback={t.nombre?.charAt(0)?.toUpperCase() || "P"}
            size="xl"
          />
        </div>

        <div className="catalogo-trab-info">
          <h3 title={t.nombre}>{t.nombre}</h3>

          <div className="catalogo-trab-rating">
            <Star size={17} fill="currentColor" />
            <b>{Number(t.calificacionPromedio || 0).toFixed(1)}</b>
            <span>{t.totalResenas || 0} reseñas</span>
          </div>

          <p>{t.descripcion || t.especialidad || "Profesional disponible para atención personalizada."}</p>
        </div>

        <div className="catalogo-trab-stats">
          <div>
            <BriefcaseBusiness size={16} />
            <span>{t.totalServiciosRealizados || 0}</span>
            <small>servicios</small>
          </div>

          <div>
            <Award size={16} />
            <span>{t.distincion || "Verificado"}</span>
            <small>perfil</small>
          </div>
        </div>

        <div className="catalogo-trab-actions">
          <button
            type="button"
            className="btn btn-dark-outline"
            onClick={() => abrirPreview(t)}
          >
            <Eye size={16} />
            Ver
          </button>

          <button
            type="button"
            className="btn btn-gold"
            onClick={() => abrirModalReserva({ trabajador: t })}
          >
            Elegir
          </button>
        </div>
      </article>
    );
  };

  const renderModalReserva = () => {
    if (!mostrarModalReserva) return null;

    return (
      <div className="modal-reserva-overlay landing-booking-overlay">
        <div className="modal-reserva landing-booking-modal">
          {reservaConfirmada && datosReservaConfirmada ? (
            <>
              <div className="modal-success-header">
                <CheckCircle2 size={42} />
                <h2>Reserva registrada</h2>
                <p>Tu cita fue guardada correctamente. Revisa tu correo para confirmar o cancelar.</p>
              </div>

              <div className="modal-success-card">
                <h4>{datosReservaConfirmada.servicio?.nombre || datosReservaConfirmada.servicio?.Nombre}</h4>

                <div className="modal-info-row">
                  <span>Precio</span>
                  <b>
                    S/{" "}
                    {Number(
                      datosReservaConfirmada.servicio?.precioBase ||
                        datosReservaConfirmada.servicio?.PrecioBase ||
                        0
                    ).toFixed(2)}
                  </b>
                </div>

                <div className="modal-info-row">
                  <span>Duración</span>
                  <b>
                    {datosReservaConfirmada.servicio?.duracionMinutos ||
                      datosReservaConfirmada.servicio?.DuracionMinutos ||
                      "-"}{" "}
                    min
                  </b>
                </div>
              </div>

              <div className="modal-success-worker">
                <AvatarCircle
                  src={getTrabajadorFoto(datosReservaConfirmada.trabajador)}
                  alt={datosReservaConfirmada.trabajador?.nombre}
                  fallback={datosReservaConfirmada.trabajador?.nombre?.charAt(0)?.toUpperCase() || "T"}
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
                  <MessageCircle size={16} />
                  Enviar reserva por WhatsApp
                </a>
              )}

              <button className="btn btn-gold w-100" onClick={cerrarModalReserva}>
                Finalizar
              </button>
            </>
          ) : (
            <>
              <div className="landing-booking-head">
                <div>
                  <h3>Reservar cita</h3>
                  <p>Elige servicio, especialista y horario.</p>
                </div>

                <button className="landing-booking-close" onClick={cerrarModalReserva}>
                  <X size={18} />
                </button>
              </div>

              {mensajeErrorReserva && (
                <div className="catalogo-serv-modal-error">
                  {mensajeErrorReserva}
                </div>
              )}

              <label className="label-gold">Servicio</label>

              <Swiper
                modules={[FreeMode]}
                spaceBetween={12}
                slidesPerView={1.3}
                freeMode
                breakpoints={{
                  576: { slidesPerView: 1.8 },
                  768: { slidesPerView: 2.4 },
                  1024: { slidesPerView: 3.1 },
                }}
                className="landing-reserva-service-swiper"
              >
                {servicios.map((s) => {
                  const idServicioItem = s.idServicio || s.IdServicio;
                  const nombre = s.nombre || s.Nombre;
                  const precio = s.precioBase || s.PrecioBase || 0;
                  const duracion = s.duracionMinutos || s.DuracionMinutos;
                  const seleccionado =
                    Number(servicioSeleccionado?.idServicio || servicioSeleccionado?.IdServicio) === Number(idServicioItem);
                  const imagenServicio = obtenerImagenServicio(s);

                  return (
                    <SwiperSlide key={idServicioItem}>
                      <button
                        type="button"
                        className={`landing-reserva-service-option ${seleccionado ? "selected" : ""}`}
                        onClick={() => setServicioSeleccionado(s)}
                      >
                        <div className="landing-reserva-service-img">
                          {imagenServicio ? (
                            <img src={imagenServicio} alt={nombre} />
                          ) : (
                            <Scissors size={26} />
                          )}
                        </div>

                        <h4>{nombre}</h4>

                        <p>
                          S/ {Number(precio).toFixed(2)}
                          {duracion ? ` · ${duracion} min` : ""}
                        </p>

                        <span>{seleccionado ? "Seleccionado" : "Elegir"}</span>
                      </button>
                    </SwiperSlide>
                  );
                })}
              </Swiper>

              <label className="label-gold">Especialista</label>

              <Swiper
                modules={[FreeMode]}
                spaceBetween={12}
                slidesPerView={2.1}
                freeMode
                breakpoints={{
                  576: { slidesPerView: 2.5 },
                  768: { slidesPerView: 3.2 },
                  1024: { slidesPerView: 3.5 },
                }}
                className="landing-worker-swiper"
              >
                {trabajadores.map((t) => {
                  const fotoTrabajador = getTrabajadorFoto(t);
                  const seleccionado =
                    Number(trabajadorSeleccionado?.idTrabajador) === Number(t.idTrabajador);

                  return (
                    <SwiperSlide key={t.idTrabajador}>
                      <button
                        type="button"
                        className={`worker-card ${seleccionado ? "selected" : ""}`}
                        onClick={() => {
                          setTrabajadorSeleccionado(t);
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
                  onClick={cerrarModalReserva}
                  disabled={guardandoReserva}
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="page-shell catalogo-trab-page">
        {renderHeader("Cargando profesionales disponibles...")}

        <div className="container pb-4">
          <div className="catalogo-trab-skeleton-grid">
            <CardDark className="catalogo-trab-skeleton" />
            <CardDark className="catalogo-trab-skeleton" />
            <CardDark className="catalogo-trab-skeleton" />
          </div>
        </div>

        <PageFooter
          nombreNegocio={negocio?.nombre || negocio?.Nombre || "Negocio"}
          redesSociales={redesSociales}
        />
      </div>
    );
  }

  return (
    <div className="page-shell catalogo-trab-page">
      {renderHeader(
        negocio?.nombre
          ? `Selecciona quién te atenderá en ${negocio.nombre}.`
          : "Selecciona el profesional que prefieras."
      )}

      <div className="container pt-1 pb-4">
        {error && (
          <CardDark className="catalogo-trab-error-card mb-4">
            <p>{error}</p>
          </CardDark>
        )}

        {destacados.length > 0 && (
          <section className="catalogo-trab-section mb-4">
            <div className="catalogo-trab-section-head">
              <div>
                <h3 className="section-title">Destacados</h3>
                <p className="section-subtitle">Profesionales con mejor desempeño</p>
              </div>

              <GoldBadge>{destacados.length} destacados</GoldBadge>
            </div>

            <div className="catalogo-trab-featured-carousel">
              {destacados.map(renderCard)}
            </div>
          </section>
        )}

        <CardDark className="catalogo-trab-filter-card mb-4">
          <div className="catalogo-trab-section-head">
            <div>
              <h3 className="section-title">Encuentra tu profesional</h3>
              <p className="section-subtitle">Filtra por nombre, valoración o experiencia.</p>
            </div>

            <div className="catalogo-trab-filter-badge">
              <Filter size={16} />
              {trabajadoresProcesados.length} resultados
            </div>
          </div>

          <div className="catalogo-trab-filter-grid">
            <div className="catalogo-trab-search">
              <Search size={16} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar profesional, especialidad..."
                maxLength={80}
              />
            </div>

            <div>
              <label className="form-label">Calificación</label>
              <select
                className="form-select input-dark"
                value={filtroRating}
                onChange={(e) => setFiltroRating(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="4">Desde 4.0 estrellas</option>
                <option value="45">Desde 4.5 estrellas</option>
              </select>
            </div>

            <div>
              <label className="form-label">Ordenar por</label>
              <select
                className="form-select input-dark"
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
              >
                <option value="rating">Mejor calificación</option>
                <option value="servicios">Más servicios realizados</option>
                <option value="nombre">Nombre</option>
              </select>
            </div>
          </div>
        </CardDark>

        <div className="catalogo-trab-section-head mb-3">
          <div>
            <h3 className="section-title">Todos los profesionales</h3>
            <p className="section-subtitle">Elige quién realizará tu servicio.</p>
          </div>

          <GoldBadge>{trabajadoresProcesados.length} resultados</GoldBadge>
        </div>

        {trabajadoresProcesados.length > 0 ? (
          <div className="catalogo-trab-grid">
            {trabajadoresProcesados.map(renderCard)}
          </div>
        ) : (
          <CardDark className="catalogo-trab-empty-card">
            <UserRound size={38} />
            <h4>Sin profesionales disponibles</h4>
            <p>No hay profesionales que coincidan con el filtro seleccionado.</p>
          </CardDark>
        )}
      </div>

      <PageFooter
        nombreNegocio={negocio?.nombre || negocio?.Nombre || "Negocio"}
        redesSociales={redesSociales}
      />

      <FloatingActions
        onReserve={() => abrirModalReserva()}
        whatsappUrl={whatsappRed}
        whatsappText={textoWhatsApp}
      />

      {renderModalReserva()}

      {modalAbierto && trabajadorPreview && (
        <div className="catalogo-trab-modal-backdrop">
          <div className="catalogo-trab-modal">
            <div className="catalogo-trab-modal-header">
              <h4>Perfil del profesional</h4>

              <button onClick={cerrarPreview} className="catalogo-trab-modal-close">
                <X size={18} />
              </button>
            </div>

            <div className="catalogo-trab-modal-body">
              <div className="catalogo-trab-modal-profile">
                <AvatarCircle
                  src={getTrabajadorFoto(trabajadorPreview)}
                  alt={trabajadorPreview.nombre || "Profesional"}
                  fallback={trabajadorPreview.nombre?.charAt(0)?.toUpperCase() || "P"}
                  size="xl"
                />

                <h3>{trabajadorPreview.nombre}</h3>

                <span>
                  <Sparkles size={15} />
                  {obtenerBadgeExtra(trabajadorPreview) || "Profesional verificado"}
                </span>

                <p>
                  {trabajadorPreview.descripcion ||
                    trabajadorPreview.especialidad ||
                    "Profesional disponible para atención personalizada."}
                </p>
              </div>

              <div className="catalogo-trab-modal-stats">
                <div>
                  <Star size={18} fill="currentColor" />
                  <b>{Number(trabajadorPreview.calificacionPromedio || 0).toFixed(1)}</b>
                  <span>calificación</span>
                </div>

                <div>
                  <CheckCircle2 size={18} />
                  <b>{trabajadorPreview.totalServiciosRealizados || 0}</b>
                  <span>servicios</span>
                </div>

                <div>
                  <Award size={18} />
                  <b>{trabajadorPreview.totalResenas || 0}</b>
                  <span>reseñas</span>
                </div>
              </div>

              <div className="catalogo-trab-modal-actions">
                <button className="btn btn-dark-outline" onClick={cerrarPreview}>
                  Cancelar
                </button>

                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={() => {
                    const trabajador = trabajadorPreview;
                    cerrarPreview();
                    abrirModalReserva({ trabajador });
                  }}
                >
                  Elegir profesional
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
