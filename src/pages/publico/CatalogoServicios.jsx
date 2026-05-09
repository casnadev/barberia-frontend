import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API_BASE from "../../services/api";

import CardDark from "../../components/ui/CardDark";
import GoldBadge from "../../components/ui/GoldBadge";
import AvatarCircle from "../../components/ui/AvatarCircle";
import PageFooter from "../../components/ui/PageFooter";
import FloatingActions from "../../components/ui/FloatingActions";
import { getImageUrl } from "../../utils/imageUrl";

import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Navigation, Pagination } from "swiper/modules";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Mail,
  MessageCircle,
  Phone,
  Scissors,
  Search,
  Star,
  UserRound,
  X,
} from "lucide-react";

import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/navigation";
import "swiper/css/pagination";

export default function CatalogoServicios() {
  const { idNegocio } = useParams();
  const navigate = useNavigate();

  const [servicios, setServicios] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [negocio, setNegocio] = useState(null);
  const [redesSociales, setRedesSociales] = useState([]);
  const [loading, setLoading] = useState(true);

  const [busqueda, setBusqueda] = useState("");
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
  const [mensajeError, setMensajeError] = useState("");

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        const res = await fetch(`${API_BASE}/Negocios/publico/${idNegocio}`);

        if (!res.ok) {
          throw new Error("No se pudo cargar el catálogo de servicios");
        }

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

        const data = await res.json();
        setHorariosDisponibles(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        setHorariosDisponibles([]);
      }
    };

    cargarHorarios();
  }, [trabajadorSeleccionado, fechaReserva]);

  const serviciosDestacados = useMemo(() => {
    return servicios.filter((s) => s.destacado || s.Destacado);
  }, [servicios]);

  const serviciosNoDestacados = useMemo(() => {
    return servicios.filter((s) => !(s.destacado || s.Destacado));
  }, [servicios]);

  const serviciosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    if (!q) return serviciosNoDestacados;

    return serviciosNoDestacados.filter((s) =>
      `${s.nombre || s.Nombre || ""} ${s.descripcionCorta || s.DescripcionCorta || ""} ${s.descripcion || s.Descripcion || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [busqueda, serviciosNoDestacados]);

  const nombreNegocio = negocio?.nombre || negocio?.Nombre || "Negocio";
  const slugNegocio = negocio?.slug || negocio?.Slug || idNegocio;
  const logoNegocio = negocio?.logoUrl || negocio?.LogoUrl ? getImageUrl(negocio?.logoUrl || negocio?.LogoUrl) : "";

  const whatsappRed =
    redesSociales.find((r) => (r.tipo || r.Tipo || "").toLowerCase() === "whatsapp")?.url ||
    redesSociales.find((r) => (r.tipo || r.Tipo || "").toLowerCase() === "whatsapp")?.Url ||
    "";

  const numeroWhatsApp = negocio?.whatsappNegocio || negocio?.WhatsappNegocio || negocio?.telefono || negocio?.Telefono || "";
  const whatsappUrl = whatsappRed || (numeroWhatsApp ? `https://wa.me/${numeroWhatsApp}` : "#");
  const mensajeWhatsApp = `Hola, ${nombreNegocio}. Quiero información sobre sus servicios.`;

  const abrirModalReserva = (servicio = null) => {
    setServicioSeleccionado(servicio);
    setMostrarModalReserva(true);
    setReservaConfirmada(false);
    setDatosReservaConfirmada(null);
    setMensajeError("");
  };

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
    setMensajeError("");
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
      setMensajeError(validacion);
      return;
    }

    try {
      setGuardandoReserva(true);
      setMensajeError("");

      const payload = {
        idTrabajador: Number(trabajadorSeleccionado),
        idServicio: Number(servicioSeleccionado.idServicio || servicioSeleccionado.IdServicio),
        nombreCliente: nombreCliente.trim(),
        telefonoCliente: telefonoCliente.trim(),
        correoCliente: correoCliente.trim(),
        fechaReserva,
        horaReserva: `${horaReserva}:00`,
      };

      const res = await fetch(`${API_BASE}/Reservas/crear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const respuesta = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMensajeError(respuesta.mensaje || "No se pudo registrar la reserva.");
        return;
      }

      const trabajador = trabajadores.find(
        (t) => Number(t.idTrabajador || t.IdTrabajador) === Number(trabajadorSeleccionado)
      );

      setDatosReservaConfirmada({
        servicio: servicioSeleccionado,
        trabajador,
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
    } catch (error) {
      console.error(error);
      setMensajeError("Error de conexión al registrar la reserva.");
    } finally {
      setGuardandoReserva(false);
    }
  };

  const obtenerImagenServicio = (servicio) => {
    const raw = servicio?.imagenUrl || servicio?.ImagenUrl || "";
    return raw ? getImageUrl(raw) : "";
  };

  const obtenerFotoTrabajador = (trabajador) => {
    return trabajador?.fotoPerfilUrl || trabajador?.FotoPerfilUrl
      ? getImageUrl(trabajador.fotoPerfilUrl || trabajador.FotoPerfilUrl)
      : "";
  };

  const renderHeader = (subtitulo) => (
    <div className="perfil-publico-header-shell container py-4">
      <CardDark className="perfil-publico-brand-card perfil-publico-header-clean mb-4">
        <div className="perfil-publico-header-layout">
          <div className="perfil-publico-header-copy">
            <span>Catálogo de servicios</span>
            <h2>{nombreNegocio}</h2>
            <p>{subtitulo}</p>
          </div>

          <div className="perfil-publico-header-logo">
            <AvatarCircle
              src={logoNegocio}
              alt={nombreNegocio}
              fallback={nombreNegocio.charAt(0)}
              selected
              size="md"
            />
          </div>

          <div className="perfil-publico-header-action">
            <button
              type="button"
              className="btn btn-gold"
              onClick={() => navigate(`/negocio/${slugNegocio}`)}
            >
              <ArrowLeft size={16} />
              Volver
            </button>
          </div>
        </div>
      </CardDark>
    </div>
  );

  const renderSectionHead = ({ title, subtitle, badge }) => (
    <div className="catalogo-serv-pro-head">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      {badge && <GoldBadge>{badge}</GoldBadge>}
    </div>
  );

  const renderServicioCard = (servicio, destacado = false) => {
    const imagen = obtenerImagenServicio(servicio);
    const idServicioCard = servicio.idServicio || servicio.IdServicio;
    const nombre = servicio.nombre || servicio.Nombre;
    const precio = servicio.precioBase || servicio.PrecioBase || 0;
    const duracion = servicio.duracionMinutos || servicio.DuracionMinutos;
    const descripcion =
      servicio.descripcionCorta ||
      servicio.DescripcionCorta ||
      servicio.descripcion ||
      servicio.Descripcion ||
      "Servicio profesional con atención personalizada.";

    return (
      <article
        key={idServicioCard}
        className={`catalogo-serv-card ${destacado ? "featured" : ""}`}
      >
        <div className="catalogo-serv-img">
          {imagen ? (
            <img src={imagen} alt={nombre} loading="lazy" />
          ) : (
            <div className="catalogo-serv-placeholder">
              <Scissors size={46} />
            </div>
          )}

          {destacado && (
            <span className="catalogo-serv-ribbon">
              <Star size={13} />
              Destacado
            </span>
          )}

          <span className="catalogo-serv-price">
            S/ {Number(precio).toFixed(2)}
          </span>
        </div>

        <div className="catalogo-serv-body">
          <h3>{nombre}</h3>

          <p>{descripcion}</p>

          <div className="catalogo-serv-meta">
            <span>
              <Clock size={14} />
              {duracion ? `${duracion} min` : "Duración no definida"}
            </span>
            <span>Reserva online</span>
          </div>

          <button className="btn btn-gold w-100 mt-auto" onClick={() => abrirModalReserva(servicio)}>
            Lo quiero
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

                <p>
                  {datosReservaConfirmada.servicio?.descripcionCorta ||
                    datosReservaConfirmada.servicio?.DescripcionCorta ||
                    "Servicio profesional con atención personalizada."}
                </p>

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
                  src={obtenerFotoTrabajador(datosReservaConfirmada.trabajador)}
                  alt={datosReservaConfirmada.trabajador?.nombre || datosReservaConfirmada.trabajador?.Nombre}
                  fallback={(datosReservaConfirmada.trabajador?.nombre || datosReservaConfirmada.trabajador?.Nombre || "T").charAt(0)}
                  size="md"
                />

                <div>
                  <p>Te atenderá</p>
                  <h5>{datosReservaConfirmada.trabajador?.nombre || datosReservaConfirmada.trabajador?.Nombre}</h5>
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

              <button className="btn btn-gold w-100" onClick={cerrarModal}>
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

                <button className="landing-booking-close" onClick={cerrarModal}>
                  <X size={18} />
                </button>
              </div>

              {mensajeError && <div className="catalogo-serv-modal-error">{mensajeError}</div>}

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
                {servicios.map((servicio) => {
                  const idServicioItem = servicio.idServicio || servicio.IdServicio;
                  const imagenServicio = obtenerImagenServicio(servicio);
                  const seleccionado =
                    Number(servicioSeleccionado?.idServicio || servicioSeleccionado?.IdServicio) === Number(idServicioItem);
                  const nombre = servicio.nombre || servicio.Nombre;
                  const precio = servicio.precioBase || servicio.PrecioBase || 0;
                  const duracion = servicio.duracionMinutos || servicio.DuracionMinutos;

                  return (
                    <SwiperSlide key={idServicioItem}>
                      <button
                        type="button"
                        className={`landing-reserva-service-option ${seleccionado ? "selected" : ""}`}
                        onClick={() => setServicioSeleccionado(servicio)}
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
                {trabajadores.map((trabajador) => {
                  const idTrabajadorItem = trabajador.idTrabajador || trabajador.IdTrabajador;
                  const nombre = trabajador.nombre || trabajador.Nombre;
                  const fotoTrabajador = obtenerFotoTrabajador(trabajador);
                  const seleccionado = Number(trabajadorSeleccionado) === Number(idTrabajadorItem);

                  return (
                    <SwiperSlide key={idTrabajadorItem}>
                      <button
                        type="button"
                        className={`worker-card ${seleccionado ? "selected" : ""}`}
                        onClick={() => {
                          setTrabajadorSeleccionado(String(idTrabajadorItem));
                          setFechaReserva("");
                          setHoraReserva("");
                          setHorariosDisponibles([]);
                        }}
                      >
                        <AvatarCircle
                          src={fotoTrabajador}
                          alt={nombre}
                          fallback={nombre?.charAt(0)?.toUpperCase() || "T"}
                          selected={seleccionado}
                          size="md"
                        />

                        <div className="worker-name" title={nombre}>
                          {nombre}
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
                <button className="btn btn-gold" onClick={confirmarReserva} disabled={guardandoReserva}>
                  {guardandoReserva ? "Registrando..." : "Confirmar reserva"}
                </button>

                <button className="btn btn-dark-outline" onClick={cerrarModal} disabled={guardandoReserva}>
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
      <div className="page-shell catalogo-serv-page">
        {renderHeader("Estamos cargando los servicios disponibles.")}

        <PageFooter
          nombreNegocio={nombreNegocio}
          redesSociales={redesSociales}
        />
      </div>
    );
  }

  return (
    <div className="page-shell catalogo-serv-page">
      {renderHeader(
        negocio?.nombre || negocio?.Nombre
          ? `Selecciona el servicio que deseas reservar en ${nombreNegocio}.`
          : "Selecciona el servicio que deseas reservar."
      )}

      <div className="container py-4 pt-1">
        <CardDark className="catalogo-serv-tools mt-2">
          <div className="catalogo-serv-search">
            <Search size={17} />
            <input
              value={busqueda}
              maxLength={80}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar servicio..."
            />
          </div>

          <GoldBadge>{servicios.length} servicios</GoldBadge>
        </CardDark>

        {serviciosDestacados.length > 0 && (
          <section className="catalogo-serv-section mt-4">
            {renderSectionHead({
              title: "Servicios destacados",
              subtitle: "Los más recomendados para reservar rápido.",
              badge: `${serviciosDestacados.length} destacados`,
            })}

            <Swiper
              modules={[FreeMode, Navigation, Pagination]}
              spaceBetween={18}
              slidesPerView={1.05}
              freeMode
              navigation
              pagination={{ clickable: true }}
              breakpoints={{
                576: { slidesPerView: 1.45 },
                768: { slidesPerView: 2.15 },
                1200: { slidesPerView: 4 },
              }}
              className="catalogo-serv-swiper"
            >
              {serviciosDestacados.map((servicio) => (
                <SwiperSlide key={servicio.idServicio || servicio.IdServicio}>
                  {renderServicioCard(servicio, true)}
                </SwiperSlide>
              ))}
            </Swiper>
          </section>
        )}

        <section className="catalogo-serv-section mt-4">
          {renderSectionHead({
            title: "Todos los servicios",
            subtitle: "Elige el servicio que deseas y confirma tu reserva.",
            badge: `${serviciosFiltrados.length} disponibles`,
          })}

          {serviciosFiltrados.length > 0 ? (
            <div className="catalogo-serv-grid">
              {serviciosFiltrados.map((servicio) => renderServicioCard(servicio, false))}
            </div>
          ) : (
            <CardDark className="catalogo-serv-empty">
              <Scissors size={38} />
              <h4>No hay servicios adicionales</h4>
              <p>Prueba limpiar el buscador o revisa los destacados.</p>
            </CardDark>
          )}
        </section>
      </div>

      <PageFooter
        nombreNegocio={nombreNegocio}
        redesSociales={redesSociales}
      />

      <FloatingActions
        onReserve={() => abrirModalReserva()}
        whatsappUrl={whatsappUrl}
        whatsappText={mensajeWhatsApp}
      />

      {renderModalReserva()}
    </div>
  );
}
