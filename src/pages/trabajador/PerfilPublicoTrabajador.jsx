import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API_BASE from "../../services/api";

import CardDark from "../../components/ui/CardDark";
import GoldBadge from "../../components/ui/GoldBadge";
import AvatarCircle from "../../components/ui/AvatarCircle";
import Toast from "../../components/ui/Toast";
import PageFooter from "../../components/ui/PageFooter";
import FloatingActions from "../../components/ui/FloatingActions";

import { getImageUrl } from "../../utils/imageUrl";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, FreeMode } from "swiper/modules";

import {
  Award,
  CalendarDays,
  CheckCircle2,
  Clock,
  ImageIcon,
  Mail,
  MessageCircle,
  Phone,
  Scissors,
  Star,
  UserRound,
  X,
} from "lucide-react";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/free-mode";

export default function PerfilPublicoTrabajador() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [perfil, setPerfil] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [redesSociales, setRedesSociales] = useState([]);
  const [idNegocioPerfil, setIdNegocioPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [mostrarModalReserva, setMostrarModalReserva] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState("");
  const [fechaReserva, setFechaReserva] = useState("");
  const [horaReserva, setHoraReserva] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [correoCliente, setCorreoCliente] = useState("");
  const [comentario, setComentario] = useState("");

  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [guardandoReserva, setGuardandoReserva] = useState(false);
  const [reservaConfirmada, setReservaConfirmada] = useState(false);
  const [datosReservaConfirmada, setDatosReservaConfirmada] = useState(null);
  const [toast, setToast] = useState({ mensaje: "", tipo: "success" });
  const [imagenPreview, setImagenPreview] = useState(null);

  useEffect(() => {
    const cargarPerfil = async () => {
      try {
        setLoading(true);
        setError("");

        const resPerfil = await fetch(`${API_BASE}/Trabajadores/${id}/perfil-publico`);
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
          try {
            const resNegocio = await fetch(`${API_BASE}/Negocios/publico/${idNegocioCargado}`);
            const dataNegocio = await resNegocio.json().catch(() => null);

            if (resNegocio.ok && dataNegocio) {
              setRedesSociales(
                Array.isArray(dataNegocio.redesSociales)
                  ? dataNegocio.redesSociales
                  : Array.isArray(dataNegocio.RedesSociales)
                    ? dataNegocio.RedesSociales
                    : []
              );
            }
          } catch (errNegocio) {
            console.error("Error cargando redes del negocio:", errNegocio);
            setRedesSociales([]);
          }
        }

        const resServicios = await fetch(`${API_BASE}/Servicios/publicos-por-trabajador/${id}`);
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

  useEffect(() => {
    if (!fechaReserva) {
      setHorariosDisponibles([]);
      setHoraReserva("");
      return;
    }

    const cargarHorarios = async () => {
      try {
        setCargandoHorarios(true);
        setHoraReserva("");

        const res = await fetch(
          `${API_BASE}/Reservas/horarios-disponibles/${id}?fecha=${fechaReserva}`
        );

        const data = await res.json().catch(() => []);
        setHorariosDisponibles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setHorariosDisponibles([]);
      } finally {
        setCargandoHorarios(false);
      }
    };

    cargarHorarios();
  }, [fechaReserva, id]);

  const get = (...keys) => {
    for (const key of keys) {
      if (perfil?.[key] !== undefined && perfil?.[key] !== null) return perfil[key];
    }

    return null;
  };

  const fotoRaw = get("fotoPerfilUrl", "FotoPerfilUrl");
  const fotoPerfil = fotoRaw ? getImageUrl(fotoRaw) : "";

  const logoRaw = get("logoUrl", "LogoUrl", "negocioLogoUrl", "NegocioLogoUrl");
  const logoNegocio = logoRaw ? getImageUrl(logoRaw) : "";

  const nombreNegocio =
    get("nombreNegocio", "NombreNegocio", "negocioNombre", "NegocioNombre") || "Barbería";

  const slugNegocio = get("slugNegocio", "SlugNegocio", "slug", "Slug") || idNegocioPerfil;

  const nombreTrabajador = get("nombre", "Nombre") || "Trabajador";

  const whatsappNegocio =
    get("whatsappNegocio", "WhatsappNegocio", "telefonoNegocio", "TelefonoNegocio", "telefono", "Telefono") || "";

  const whatsappUrl = whatsappNegocio ? `https://wa.me/${whatsappNegocio}` : "#";

  const mensajeWhatsApp = `Hola, ${nombreNegocio}. Quiero reservar una cita con ${nombreTrabajador}.`;
  const especialidad = get("especialidad", "Especialidad");
  const experiencia = get("experiencia", "Experiencia");
  const destacado = Boolean(get("destacado", "Destacado"));
  const descripcion = get("descripcionPublica", "DescripcionPublica", "descripcion", "Descripcion");
  const totalServicios = get("totalServiciosRealizados", "TotalServiciosRealizados") || 0;
  const totalResenas = get("totalResenas", "TotalResenas") || 0;
  const calificacion = get("calificacionPromedio", "CalificacionPromedio") || 0;
  const distincion = get("distincion", "Distincion");

  const imagenesRaw = get("imagenes", "Imagenes") || [];
  const trabajos = Array.isArray(imagenesRaw) ? imagenesRaw.slice(0, 10) : [];

  const servicioActual = servicios.find(
    (s) => Number(s.idServicio || s.IdServicio) === Number(servicioSeleccionado)
  );

  const limpiarFormularioReserva = () => {
    setServicioSeleccionado("");
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
  };

  const cerrarModal = () => {
    setMostrarModalReserva(false);
    limpiarFormularioReserva();
  };

  const abrirReservaConServicio = (idServicio) => {
    setServicioSeleccionado(String(idServicio || ""));
    setMostrarModalReserva(true);
  };

  const validarReserva = () => {
    const nombre = nombreCliente.trim();
    const telefono = telefonoCliente.trim();
    const correo = correoCliente.trim();

    if (!servicioSeleccionado) return "Selecciona un servicio.";
    if (!fechaReserva) return "Selecciona una fecha.";
    if (!horaReserva) return "Selecciona una hora.";
    if (!nombre) return "Ingresa tu nombre.";
    if (!/^[0-9]{9}$/.test(telefono)) return "El teléfono debe tener 9 dígitos.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return "Ingresa un correo válido.";

    const hoy = new Date();
    const fechaElegida = new Date(`${fechaReserva}T00:00:00`);
    hoy.setHours(0, 0, 0, 0);

    if (fechaElegida < hoy) return "No puedes reservar en una fecha pasada.";

    return "";
  };

  const confirmarReserva = async () => {
    const validacion = validarReserva();

    if (validacion) {
      setToast({ mensaje: validacion, tipo: "error" });
      return;
    }

    try {
      setGuardandoReserva(true);

      const payload = {
        idTrabajador: Number(id),
        idServicio: Number(servicioSeleccionado),
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
        setToast({
          mensaje: respuesta.mensaje || "No se pudo registrar la reserva.",
          tipo: "error",
        });
        return;
      }

      setDatosReservaConfirmada({
        servicio: servicioActual,
        trabajador: perfil,
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
      setToast({
        mensaje: respuesta.mensaje || "Reserva registrada correctamente.",
        tipo: "success",
      });
    } catch (err) {
      console.error(err);
      setToast({ mensaje: "Error de conexión al registrar la reserva.", tipo: "error" });
    } finally {
      setGuardandoReserva(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell perfil-publico-pro-page">
        <div className="container py-4">
          <CardDark className="perfil-publico-loading">
            <UserRound size={36} />
            <p className="section-subtitle mb-0">Cargando perfil profesional...</p>
          </CardDark>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell perfil-publico-pro-page">
        <div className="container py-4">
          <CardDark className="perfil-publico-error">
            <p>{error}</p>
          </CardDark>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell perfil-publico-pro-page">
      <div className="container py-4">
        <CardDark className="perfil-publico-brand-card perfil-publico-header-clean mb-4">
          <div className="perfil-publico-header-layout">
            <div className="perfil-publico-header-copy">
              <span>Perfil profesional</span>
              <h2>{nombreNegocio}</h2>
              <p>Conoce a tu especialista antes de reservar.</p>
            </div>

            <div className="perfil-publico-header-logo">
              <AvatarCircle
                src={logoNegocio}
                alt={nombreNegocio}
                fallback="B"
                selected
                size="md"
              />
            </div>

            <div className="perfil-publico-header-action">
              <button
                type="button"
                className="btn btn-gold"
                onClick={() => {
                  if (slugNegocio) {
                    navigate(`/negocio/${slugNegocio}`);
                  } else {
                    navigate(-1);
                  }
                }}
              >
                Volver
              </button>
            </div>
          </div>
        </CardDark>

        <section className="perfil-publico-hero mb-4">
          <CardDark className="perfil-publico-profile-card">
            <div className="perfil-publico-profile-top">
              <AvatarCircle
                src={fotoPerfil}
                alt={nombreTrabajador}
                fallback={nombreTrabajador?.charAt(0)?.toUpperCase() || "T"}
                selected
                size="xl"
              />

              <div className="perfil-publico-profile-main">
                <div className="perfil-publico-badges">
                  {destacado && <GoldBadge>⭐ Destacado</GoldBadge>}
                  {distincion && <GoldBadge>{distincion}</GoldBadge>}
                </div>

                <h1>{nombreTrabajador}</h1>

                {especialidad && <p className="perfil-publico-specialty">{especialidad}</p>}

                <p className="perfil-publico-description">
                  {descripcion || "Atención profesional personalizada."}
                </p>

                <button
                  className="btn btn-gold perfil-publico-main-cta"
                  onClick={() => setMostrarModalReserva(true)}
                >
                  <CalendarDays size={17} />
                  Reservar con este profesional
                </button>
              </div>
            </div>
          </CardDark>

          <div className="perfil-publico-stats-grid">
            <CardDark className="perfil-publico-stat-card">
              <Star size={22} fill="currentColor" />
              <h3>{Number(calificacion || 0).toFixed(1)}</h3>
              <p>{totalResenas} reseñas</p>
            </CardDark>

            <CardDark className="perfil-publico-stat-card">
              <Scissors size={22} />
              <h3>{totalServicios}</h3>
              <p>servicios realizados</p>
            </CardDark>

            <CardDark className="perfil-publico-stat-card">
              <Award size={22} />
              <h3>{experiencia || "Pro"}</h3>
              <p>experiencia</p>
            </CardDark>
          </div>
        </section>

        <section className="perfil-publico-content-grid">
          <CardDark className="perfil-publico-work-card">
            <div className="perfil-publico-section-head">
              <div>
                <h3 className="section-title">Trabajos realizados</h3>
                <p className="section-subtitle">Resultados del especialista.</p>
              </div>

              <GoldBadge>{trabajos.length} de 10 trabajos</GoldBadge>
            </div>

            {trabajos.length > 0 ? (
              <Swiper
                modules={[Pagination, FreeMode]}
                spaceBetween={16}
                slidesPerView={1.12}
                freeMode
                pagination={{ clickable: true }}
                breakpoints={{
                  576: { slidesPerView: 1.45 },
                  768: { slidesPerView: 2.15 },
                  1024: { slidesPerView: 2.6 },
                  1280: { slidesPerView: 3 },
                }}
                className="perfil-publico-work-swiper"
              >
                {trabajos.map((img) => {
                  const raw = img.urlImagen || img.UrlImagen || "";
                  const url = raw ? getImageUrl(raw) : "";
                  const descripcionImg = img.descripcion || img.Descripcion || "Trabajo realizado";

                  return (
                    <SwiperSlide key={img.idImagen || img.IdImagen || raw}>
                      <article
                        className="perfil-publico-work-item"
                        onClick={() => {
                          if (url) {
                            setImagenPreview({
                              url,
                              descripcion: descripcionImg,
                            });
                          }
                        }}
                      >
                        <div className="perfil-publico-work-img">
                          {url ? (
                            <img src={url} alt={descripcionImg} />
                          ) : (
                            <ImageIcon size={38} />
                          )}
                        </div>

                        <p title={descripcionImg}>{descripcionImg}</p>
                      </article>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            ) : (
              <div className="perfil-publico-empty">
                <ImageIcon size={34} />
                <p>Este trabajador aún no tiene imágenes registradas.</p>
              </div>
            )}
          </CardDark>
        </section>

        <CardDark className="perfil-publico-mini-services-card mt-4">
          <div className="perfil-publico-section-head">
            <div>
              <h3 className="section-title">Servicios disponibles</h3>
              <p className="section-subtitle">Explora y reserva con este profesional.</p>
            </div>

            <GoldBadge>{servicios.length} servicios</GoldBadge>
          </div>

          {servicios.length > 0 ? (
            <Swiper
              modules={[Autoplay, FreeMode]}
              spaceBetween={14}
              slidesPerView={2.15}
              freeMode
              loop={servicios.length > 4}
              autoplay={
                servicios.length > 4
                  ? {
                    delay: 0,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                  }
                  : false
              }
              speed={3600}
              breakpoints={{
                480: { slidesPerView: 2.6 },
                576: { slidesPerView: 3.2 },
                768: { slidesPerView: 4.2 },
                1024: { slidesPerView: 5.2 },
                1280: { slidesPerView: 6.2 },
              }}
              className="perfil-publico-mini-services-swiper"
            >
              {servicios.map((s) => {
                const idServicio = s.idServicio || s.IdServicio;
                const nombre = s.nombre || s.Nombre;
                const precio = s.precioBase || s.PrecioBase || 0;
                const duracion = s.duracionMinutos || s.DuracionMinutos;
                const imagenRaw = s.imagenUrl || s.ImagenUrl || "";
                const imagenServicio = imagenRaw ? getImageUrl(imagenRaw) : "";

                return (
                  <SwiperSlide key={idServicio}>
                    <button
                      type="button"
                      className="perfil-publico-mini-service"
                      onClick={() => abrirReservaConServicio(idServicio)}
                      title={nombre}
                    >
                      <div className="perfil-publico-mini-service-circle">
                        {imagenServicio ? (
                          <img src={imagenServicio} alt={nombre} />
                        ) : (
                          <Scissors size={26} />
                        )}
                      </div>

                      <h4>{nombre}</h4>

                      <p>S/ {Number(precio).toFixed(2)}</p>

                      <small>
                        <Clock size={12} />
                        {duracion ? `${duracion} min` : "Reservar"}
                      </small>
                    </button>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          ) : (
            <div className="perfil-publico-empty">
              <Scissors size={34} />
              <p>Este profesional aún no tiene servicios disponibles.</p>
            </div>
          )}
        </CardDark>
      </div>

      <PageFooter
        nombreNegocio={nombreNegocio}
        redesSociales={redesSociales}
      />

      <FloatingActions
        onReserve={() => setMostrarModalReserva(true)}
        whatsappUrl={whatsappUrl}
        whatsappText={mensajeWhatsApp}
      />

      {mostrarModalReserva && (
        <div className="perfil-reserva-overlay">
          <div className="perfil-reserva-modal">
            {reservaConfirmada && datosReservaConfirmada ? (
              <>
                <div className="perfil-reserva-modal-header success">
                  <div>
                    <CheckCircle2 size={36} />
                    <h2>Reserva registrada</h2>
                    <p>Tu cita fue guardada correctamente. Recibirás la confirmación por correo.</p>
                  </div>

                  <button className="perfil-reserva-close" onClick={cerrarModal}>
                    <X size={18} />
                  </button>
                </div>

                <div className="perfil-reserva-body">
                  <div className="perfil-reserva-success-service">
                    <h4>
                      {datosReservaConfirmada.servicio?.nombre ||
                        datosReservaConfirmada.servicio?.Nombre ||
                        "Servicio reservado"}
                    </h4>

                    <p>
                      {datosReservaConfirmada.servicio?.descripcionCorta ||
                        datosReservaConfirmada.servicio?.DescripcionCorta ||
                        "Servicio profesional con atención personalizada."}
                    </p>

                    <div className="perfil-reserva-info-row">
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

                    <div className="perfil-reserva-info-row">
                      <span>Duración</span>
                      <b>
                        {datosReservaConfirmada.servicio?.duracionMinutos ||
                          datosReservaConfirmada.servicio?.DuracionMinutos ||
                          "-"}{" "}
                        min
                      </b>
                    </div>
                  </div>

                  <div className="perfil-reserva-worker-box">
                    <AvatarCircle
                      src={fotoPerfil}
                      alt={nombreTrabajador}
                      fallback={nombreTrabajador?.charAt(0)?.toUpperCase() || "T"}
                      selected
                      size="sm"
                    />

                    <div>
                      <p>Te atenderá</p>
                      <h5>{nombreTrabajador}</h5>
                    </div>
                  </div>

                  <div className="perfil-reserva-details">
                    <div className="perfil-reserva-info-row">
                      <span>Cliente</span>
                      <b>{datosReservaConfirmada.cliente}</b>
                    </div>

                    <div className="perfil-reserva-info-row">
                      <span>Correo</span>
                      <b>{datosReservaConfirmada.correo}</b>
                    </div>

                    <div className="perfil-reserva-info-row">
                      <span>Teléfono</span>
                      <b>{datosReservaConfirmada.telefono}</b>
                    </div>

                    <div className="perfil-reserva-info-row">
                      <span>Fecha</span>
                      <b>{datosReservaConfirmada.fecha}</b>
                    </div>

                    <div className="perfil-reserva-info-row">
                      <span>Hora</span>
                      <b>{datosReservaConfirmada.hora}</b>
                    </div>

                    <div className="perfil-reserva-info-row">
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
                </div>
              </>
            ) : (
              <>
                <div className="perfil-reserva-modal-header">
                  <div>
                    <h3>Reservar cita</h3>
                    <p>Confirma servicio, horario y tus datos.</p>
                  </div>

                  <button className="perfil-reserva-close" onClick={cerrarModal}>
                    <X size={18} />
                  </button>
                </div>

                <div className="perfil-reserva-body">
                  <label className="label-gold">Servicio</label>

                  <Swiper
                    modules={[FreeMode]}
                    spaceBetween={12}
                    slidesPerView={1.25}
                    freeMode
                    breakpoints={{
                      576: { slidesPerView: 1.6 },
                      768: { slidesPerView: 2.1 },
                      1024: { slidesPerView: 2.35 },
                    }}
                    className="perfil-reserva-service-swiper"
                  >
                    {servicios.map((s) => {
                      const idServicio = s.idServicio || s.IdServicio;
                      const nombre = s.nombre || s.Nombre;
                      const precio = s.precioBase || s.PrecioBase || 0;
                      const duracion = s.duracionMinutos || s.DuracionMinutos;
                      const seleccionado = Number(servicioSeleccionado) === Number(idServicio);
                      const imagenRaw = s.imagenUrl || s.ImagenUrl || "";
                      const imagenServicio = imagenRaw ? getImageUrl(imagenRaw) : "";

                      return (
                        <SwiperSlide key={idServicio}>
                          <button
                            type="button"
                            className={`perfil-reserva-service-option ${seleccionado ? "selected" : ""}`}
                            onClick={() => setServicioSeleccionado(String(idServicio))}
                          >
                            <div className="perfil-reserva-service-thumb">
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

                  {servicioActual && (
                    <div className="perfil-reserva-selected-service">
                      <h4>{servicioActual.nombre || servicioActual.Nombre}</h4>

                      <div className="perfil-reserva-info-row">
                        <span>Precio</span>
                        <b>
                          S/{" "}
                          {Number(servicioActual.precioBase || servicioActual.PrecioBase || 0).toFixed(2)}
                        </b>
                      </div>

                      <div className="perfil-reserva-info-row">
                        <span>Duración</span>
                        <b>
                          {servicioActual.duracionMinutos || servicioActual.DuracionMinutos || "-"} min
                        </b>
                      </div>
                    </div>
                  )}

                  <div className="perfil-reserva-date-grid">
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
                        disabled={!fechaReserva || cargandoHorarios}
                      >
                        <option value="">
                          {!fechaReserva
                            ? "Primero selecciona fecha"
                            : cargandoHorarios
                              ? "Cargando horarios..."
                              : horariosDisponibles.length === 0
                                ? "Sin horarios disponibles"
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
                    className="form-control input-dark mb-3"
                    rows="3"
                    value={comentario}
                    maxLength={250}
                    onChange={(e) => setComentario(e.target.value)}
                  />

                  <div className="perfil-reserva-actions">
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
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {imagenPreview && (
        <div
          className="work-preview-overlay"
          onClick={() => setImagenPreview(null)}
        >
          <div
            className="work-preview-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="work-preview-close"
              onClick={() => setImagenPreview(null)}
              aria-label="Cerrar imagen"
            >
              <X size={18} />
            </button>

            <img
              src={imagenPreview.url}
              alt={imagenPreview.descripcion || "Trabajo realizado"}
            />

            <p>{imagenPreview.descripcion || "Trabajo realizado"}</p>
          </div>
        </div>
      )}

      <Toast
        mensaje={toast.mensaje}
        tipo={toast.tipo}
        onClose={() => setToast({ mensaje: "", tipo: "success" })}
      />
    </div>
  );
}
