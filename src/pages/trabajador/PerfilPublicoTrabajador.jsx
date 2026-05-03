import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API_BASE from "../../services/api";

import CardDark from "../../components/ui/CardDark";
import GoldBadge from "../../components/ui/GoldBadge";
import AvatarCircle from "../../components/ui/AvatarCircle";

import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, FreeMode } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/free-mode";

export default function PerfilPublicoTrabajador() {
  const { id } = useParams();

  const [perfil, setPerfil] = useState(null);
  const [servicios, setServicios] = useState([]);
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
  const [guardandoReserva, setGuardandoReserva] = useState(false);
  const [reservaConfirmada, setReservaConfirmada] = useState(false);
  const [datosReservaConfirmada, setDatosReservaConfirmada] = useState(null);

  const baseUrl = API_BASE.replace("/api", "");

  useEffect(() => {
    const cargarPerfil = async () => {
      try {
        setLoading(true);
        setError("");

        const resPerfil = await fetch(`${API_BASE}/Trabajadores/${id}/perfil-publico`);
        const dataPerfil = await resPerfil.json();

        if (!resPerfil.ok) {
          setError(dataPerfil.mensaje || "No se pudo cargar el perfil");
          return;
        }

        setPerfil(dataPerfil);

        const resServicios = await fetch(`${API_BASE}/Servicios/publicos-por-trabajador/${id}`);
        const dataServicios = await resServicios.json();

        if (resServicios.ok) {
          setServicios(dataServicios || []);
        }
      } catch (err) {
        console.error(err);
        setError("Error de conexión");
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
        setHoraReserva("");

        const res = await fetch(
          `${API_BASE}/Reservas/horarios-disponibles/${id}?fecha=${fechaReserva}`
        );

        const data = await res.json();
        setHorariosDisponibles(data || []);
      } catch (err) {
        console.error(err);
        setHorariosDisponibles([]);
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

  if (loading) {
    return (
      <div className="page-shell">
        <div className="container py-4">
          <CardDark>
            <p className="section-subtitle mb-0">Cargando perfil profesional...</p>
          </CardDark>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <div className="container py-4">
          <div className="alert alert-danger">{error}</div>
        </div>
      </div>
    );
  }

  const fotoPerfil = get("fotoPerfilUrl", "FotoPerfilUrl")
    ? `${baseUrl}${get("fotoPerfilUrl", "FotoPerfilUrl")}`
    : "";

  const nombreNegocio =
    get("nombreNegocio", "NombreNegocio", "negocioNombre", "NegocioNombre") ||
    "Barbería";

  const logoNegocio = get("logoUrl", "LogoUrl", "negocioLogoUrl", "NegocioLogoUrl")
    ? `${baseUrl}${get("logoUrl", "LogoUrl", "negocioLogoUrl", "NegocioLogoUrl")}`
    : "";

  const nombreTrabajador = get("nombre", "Nombre") || "Trabajador";
  const especialidad = get("especialidad", "Especialidad");
  const experiencia = get("experiencia", "Experiencia");
  const destacado = Boolean(get("destacado", "Destacado"));
  const descripcion = get("descripcionPublica", "DescripcionPublica", "descripcion", "Descripcion");
  const totalServicios = get("totalServiciosRealizados", "TotalServiciosRealizados") || 0;
  const totalResenas = get("totalResenas", "TotalResenas") || 0;
  const calificacion = get("calificacionPromedio", "CalificacionPromedio") || 0;

  const imagenesRaw = get("imagenes", "Imagenes") || [];
  const trabajos = imagenesRaw.slice(0, 10);

  const servicioActual = servicios.find(
    (s) => Number(s.idServicio || s.IdServicio) === Number(servicioSeleccionado)
  );

  const cerrarModal = () => {
    setMostrarModalReserva(false);
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

  const confirmarReserva = async () => {
    if (
      !servicioSeleccionado ||
      !fechaReserva ||
      !horaReserva ||
      !nombreCliente.trim() ||
      !telefonoCliente.trim() ||
      !correoCliente.trim()
    ) {
      alert("Completa servicio, fecha, hora, nombre, teléfono y correo.");
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

      setDatosReservaConfirmada({
        servicio: servicioActual,
        trabajador: perfil,
        fecha: fechaReserva,
        hora: horaReserva,
        cliente: nombreCliente.trim(),
        telefono: telefonoCliente.trim(),
        correo: correoCliente.trim(),
        estado: "Pendiente",
        whatsappUrl: respuesta.whatsappUrl,
      });

      setReservaConfirmada(true);
    } catch (err) {
      console.error(err);
      alert("Error de conexión al registrar la reserva");
    } finally {
      setGuardandoReserva(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="container py-4">
        <CardDark className="mb-4">
          <div className="text-center">
            {logoNegocio && (
              <AvatarCircle
                src={logoNegocio}
                alt={nombreNegocio}
                fallback="B"
                selected
                size="md"
              />
            )}

            <h2 className="mt-2 text-gold fw-bold">
              {nombreNegocio}
            </h2>

            <p className="fw-semibold" style={{ color: "#111827" }}>
              Conoce a tu especialista antes de reservar
            </p>
          </div>
        </CardDark>

        <div className="row g-4">
          <div className="col-lg-4">
            <CardDark>
              <div className="text-center">
                <AvatarCircle
                  src={fotoPerfil}
                  alt={nombreTrabajador}
                  fallback={nombreTrabajador?.charAt(0)?.toUpperCase() || "T"}
                  selected
                  size="lg"
                />

                <h2 className="mt-4 mb-2">{nombreTrabajador}</h2>

                {destacado && (
                  <div className="mb-2">
                    <GoldBadge>⭐ Trabajador destacado</GoldBadge>
                  </div>
                )}

                {especialidad && <p className="text-gold fw-bold mb-2">{especialidad}</p>}

                <h4 style={{ color: "#d4af37" }}>
                  ⭐ {Number(calificacion || 0).toFixed(1)}
                </h4>

                <p className="section-subtitle">{totalResenas} reseñas</p>

                <hr />

                <p className="section-subtitle text-start">
                  {descripcion || "Atención profesional personalizada."}
                </p>

                <div className="mt-3 text-start modal-success-details">
                  <div className="modal-info-row">
                    <span>Especialidad</span>
                    <b>{especialidad || "No especificada"}</b>
                  </div>

                  <div className="modal-info-row">
                    <span>Experiencia</span>
                    <b>{experiencia || "No especificada"}</b>
                  </div>

                  <div className="modal-info-row">
                    <span>Servicios realizados</span>
                    <b>{totalServicios}</b>
                  </div>
                </div>

                <button
                  className="btn btn-gold mt-3 w-100"
                  onClick={() => setMostrarModalReserva(true)}
                >
                  Reservar con este trabajador
                </button>
              </div>
            </CardDark>
          </div>

          <div className="col-lg-8">
            <CardDark>
              <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                  <h3 className="section-title">Trabajos realizados</h3>
                  <p className="section-subtitle">Resultados del especialista</p>
                </div>

                <GoldBadge>{trabajos.length} de 10 trabajos</GoldBadge>
              </div>

              {trabajos.length > 0 ? (
                <Swiper
                  modules={[Pagination, FreeMode]}
                  spaceBetween={16}
                  slidesPerView={1.15}
                  freeMode
                  pagination={{ clickable: true }}
                  breakpoints={{
                    576: { slidesPerView: 1.5 },
                    768: { slidesPerView: 2.2 },
                    1024: { slidesPerView: 3 },
                  }}
                  style={{ paddingBottom: "42px" }}
                >
                  {trabajos.map((img) => {
                    const url = `${baseUrl}${img.urlImagen || img.UrlImagen}`;

                    return (
                      <SwiperSlide key={img.idImagen || img.IdImagen}>
                        <div className="card-image-work">
                          <img
                            src={url}
                            alt={img.descripcion || img.Descripcion || "Trabajo realizado"}
                            className="img-work"
                            style={{ height: "260px", borderRadius: "18px" }}
                          />
                        </div>

                        <p className="text-center mt-2 truncate-one-line">
                          {img.descripcion || img.Descripcion || "Trabajo realizado"}
                        </p>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>
              ) : (
                <p className="text-center py-4 section-subtitle">
                  Este trabajador aún no tiene imágenes registradas.
                </p>
              )}
            </CardDark>
          </div>
        </div>
      </div>

      {mostrarModalReserva && (
        <div className="modal-reserva-overlay">
          <div className="modal-reserva">
            {reservaConfirmada && datosReservaConfirmada ? (
              <>
                <div className="modal-success-header">
                  <h2>Reserva registrada</h2>
                  <p>Tu cita fue guardada correctamente. Recibirás la confirmación por correo.</p>
                </div>

                <div className="modal-success-card">
                  <h4>
                    {datosReservaConfirmada.servicio?.nombre ||
                      datosReservaConfirmada.servicio?.Nombre}
                  </h4>

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

                <p className="modal-success-note">
                  También puedes enviar tu reserva por WhatsApp para una confirmación más rápida.
                </p>

                {datosReservaConfirmada?.whatsappUrl && (
                  <a
                    href={datosReservaConfirmada.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-dark-outline w-100 mb-2"
                  >
                    Enviar reserva por WhatsApp
                  </a>
                )}

                <button className="btn btn-gold w-100" onClick={cerrarModal}>
                  Regresar al inicio
                </button>
              </>
            ) : (
              <>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h3 className="mb-1">Reservar cita</h3>
                    <p className="section-subtitle mb-0">Confirma los datos de tu atención</p>
                  </div>

                  <button className="btn btn-dark-outline btn-sm" onClick={cerrarModal}>
                    ✕
                  </button>
                </div>

                <label className="form-label mb-2" style={{ color: "#d4af37" }}>
                  Servicio
                </label>

                <Swiper
                  modules={[FreeMode]}
                  spaceBetween={12}
                  slidesPerView={1.35}
                  freeMode
                  breakpoints={{
                    576: { slidesPerView: 1.6 },
                    768: { slidesPerView: 2.2 },
                    1024: { slidesPerView: 2.4 },
                  }}
                  style={{ paddingBottom: "10px", marginBottom: "14px" }}
                >
                  {servicios.map((s) => {
                    const idServicio = s.idServicio || s.IdServicio;
                    const nombre = s.nombre || s.Nombre;
                    const precio = s.precioBase || s.PrecioBase || 0;
                    const duracion = s.duracionMinutos || s.DuracionMinutos;
                    const seleccionado = Number(servicioSeleccionado) === Number(idServicio);

                    const imagenRaw = s.imagenUrl || s.ImagenUrl || "";
                    const imagenServicio = imagenRaw ? `${baseUrl}${imagenRaw}` : "";

                    return (
                      <SwiperSlide key={idServicio}>
                        <button
                          type="button"
                          className={`worker-card ${seleccionado ? "selected" : ""}`}
                          onClick={() => setServicioSeleccionado(String(idServicio))}
                        >
                          <AvatarCircle
                            src={imagenServicio}
                            alt={nombre}
                            fallback="✂"
                            selected={seleccionado}
                            size="sm"
                          />

                          <div className="worker-name" title={nombre}>
                            {nombre}
                          </div>

                          <div className="worker-status">
                            S/ {Number(precio).toFixed(2)}
                            {duracion ? ` • ${duracion} min` : ""}
                          </div>

                          <div className="worker-status">
                            {seleccionado ? "Seleccionado" : "Elegir"}
                          </div>
                        </button>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>

                {servicioActual && (
                  <div className="modal-success-card">
                    <h4>{servicioActual.nombre || servicioActual.Nombre}</h4>

                    <div className="modal-info-row">
                      <span>Precio</span>
                      <b>
                        S/{" "}
                        {Number(
                          servicioActual.precioBase || servicioActual.PrecioBase || 0
                        ).toFixed(2)}
                      </b>
                    </div>

                    <div className="modal-info-row">
                      <span>Duración</span>
                      <b>
                        {servicioActual.duracionMinutos ||
                          servicioActual.DuracionMinutos ||
                          "-"}{" "}
                        min
                      </b>
                    </div>
                  </div>
                )}

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label" style={{ color: "#d4af37" }}>
                      Fecha
                    </label>

                    <input
                      type="date"
                      className="form-control input-dark mb-3"
                      value={fechaReserva}
                      onChange={(e) => {
                        setFechaReserva(e.target.value);
                        setHoraReserva("");
                      }}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label" style={{ color: "#d4af37" }}>
                      Hora
                    </label>

                    <select
                      className="form-control input-dark mb-3"
                      value={horaReserva}
                      onChange={(e) => setHoraReserva(e.target.value)}
                      disabled={!fechaReserva}
                    >
                      <option value="">
                        {!fechaReserva
                          ? "Primero selecciona fecha"
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

                <label className="form-label" style={{ color: "#d4af37" }}>
                  Tus datos
                </label>

                <input
                  placeholder="Nombre completo"
                  className="form-control input-dark mb-3"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                />

                <input
                  placeholder="Teléfono / WhatsApp"
                  className="form-control input-dark mb-3"
                  value={telefonoCliente}
                  onChange={(e) => setTelefonoCliente(e.target.value)}
                />

                <input
                  placeholder="Correo"
                  className="form-control input-dark mb-3"
                  value={correoCliente}
                  onChange={(e) => setCorreoCliente(e.target.value)}
                />

                <textarea
                  placeholder="Comentario adicional opcional"
                  className="form-control input-dark mb-3"
                  rows="3"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                />

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-gold w-100"
                    onClick={confirmarReserva}
                    disabled={guardandoReserva}
                  >
                    {guardandoReserva ? "Registrando..." : "Confirmar reserva"}
                  </button>

                  <button
                    className="btn btn-dark-outline w-100"
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