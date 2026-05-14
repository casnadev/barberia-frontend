import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Scissors,
  UserRound,
  X,
} from "lucide-react";

import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";

import { getImageUrl } from "../../utils/imageUrl";

import "swiper/css";
import "swiper/css/free-mode";
import "../../styles/components/modalreserva.css";

export default function ModalReserva({
  abierto = false,
  onClose,
  apiBase,
  servicios = [],
  trabajadores = [],
  servicioInicial = null,
  trabajadorInicial = null,
}) {
  const [servicioActivo, setServicioActivo] = useState(null);
  const [trabajadorActivo, setTrabajadorActivo] = useState(null);

  const [fechaReserva, setFechaReserva] = useState("");
  const [horaReserva, setHoraReserva] = useState("");

  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [correoCliente, setCorreoCliente] = useState("");
  const [comentario, setComentario] = useState("");

  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [guardandoReserva, setGuardandoReserva] = useState(false);

  const [reservaOk, setReservaOk] = useState(false);
  const [respuestaReserva, setRespuestaReserva] = useState(null);
  const [mensajeError, setMensajeError] = useState("");

  useEffect(() => {
    if (!abierto) return;

    setServicioActivo(servicioInicial || null);
    setTrabajadorActivo(trabajadorInicial || null);

    setFechaReserva("");
    setHoraReserva("");
    setNombreCliente("");
    setTelefonoCliente("");
    setCorreoCliente("");
    setComentario("");

    setReservaOk(false);
    setRespuestaReserva(null);
    setMensajeError("");
  }, [abierto, servicioInicial, trabajadorInicial]);

  useEffect(() => {
    if (!fechaReserva || !trabajadorActivo) {
      setHorariosDisponibles([]);
      setHoraReserva("");
      return;
    }

    const cargarHorarios = async () => {
      try {
        setCargandoHorarios(true);
        setHoraReserva("");

        const idTrabajador =
          trabajadorActivo.idTrabajador || trabajadorActivo.IdTrabajador;

        const res = await fetch(
          `${apiBase}/Reservas/horarios-disponibles/${idTrabajador}?fecha=${fechaReserva}`
        );

        const data = await res.json().catch(() => []);

        setHorariosDisponibles(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        setHorariosDisponibles([]);
      } finally {
        setCargandoHorarios(false);
      }
    };

    cargarHorarios();
  }, [fechaReserva, trabajadorActivo, apiBase]);

  const serviciosOrdenados = useMemo(() => {
    if (!servicioActivo) return servicios;

    const idActivo = servicioActivo.idServicio || servicioActivo.IdServicio;

    return [
      servicioActivo,
      ...servicios.filter(
        (s) => Number(s.idServicio || s.IdServicio) !== Number(idActivo)
      ),
    ];
  }, [servicios, servicioActivo]);

  const trabajadoresOrdenados = useMemo(() => {
    if (!trabajadorActivo) return trabajadores;

    const idActivo =
      trabajadorActivo.idTrabajador || trabajadorActivo.IdTrabajador;

    return [
      trabajadorActivo,
      ...trabajadores.filter(
        (t) =>
          Number(t.idTrabajador || t.IdTrabajador) !== Number(idActivo)
      ),
    ];
  }, [trabajadores, trabajadorActivo]);

  const cerrarTodo = () => {
    onClose?.();
  };

  const validarReserva = () => {
    if (!servicioActivo) return "Selecciona un servicio.";
    if (!trabajadorActivo) return "Selecciona un especialista.";
    if (!fechaReserva) return "Selecciona una fecha.";
    if (!horaReserva) return "Selecciona un horario.";
    if (!nombreCliente.trim()) return "Ingresa tu nombre.";
    if (!telefonoCliente.trim()) return "Ingresa tu teléfono.";

    return "";
  };

  const confirmarReserva = async () => {
    try {
      const error = validarReserva();

      if (error) {
        setMensajeError(error);
        return;
      }

      setMensajeError("");
      setGuardandoReserva(true);

      const payload = {
        idServicio: servicioActivo.idServicio || servicioActivo.IdServicio,
        idTrabajador:
          trabajadorActivo.idTrabajador || trabajadorActivo.IdTrabajador,
        nombreCliente: nombreCliente.trim(),
        telefonoCliente: telefonoCliente.trim(),
        correoCliente: correoCliente.trim(),
        comentario: comentario.trim(),
        fechaReserva,
        horaReserva: horaReserva.length === 5 ? `${horaReserva}:00` : horaReserva,
      };

      const res = await fetch(`${apiBase}/Reservas/crear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMensajeError(data?.mensaje || "No se pudo registrar la reserva.");
        return;
      }

      setRespuestaReserva(data);
      setReservaOk(true);
    } catch (error) {
      console.error(error);
      setMensajeError("Ocurrió un error al registrar la reserva.");
    } finally {
      setGuardandoReserva(false);
    }
  };

  if (!abierto) return null;

  return (
    <div className="modal-reserva-overlay">
      <div className="modal-reserva">
        <button
          type="button"
          className="modal-reserva-close"
          onClick={cerrarTodo}
        >
          <X size={18} />
        </button>

        {!reservaOk ? (
          <>
            <div className="modal-reserva-head">
              <span>Reserva online</span>
              <h2>Reserva tu cita</h2>
              <p>Elige servicio, especialista y completa tus datos.</p>
            </div>

            <section className="modal-reserva-block">
              <div className="modal-reserva-section-title">
                <Scissors size={17} />
                Elige un servicio
              </div>

              <Swiper
                modules={[FreeMode]}
                freeMode
                spaceBetween={12}
                slidesPerView={1.15}
                breakpoints={{
                  640: { slidesPerView: 2.2 },
                  992: { slidesPerView: 3.2 },
                }}
                className="modal-reserva-swiper"
              >
                {serviciosOrdenados.map((s) => {
                  const idServicio = s.idServicio || s.IdServicio;
                  const nombre = s.nombre || s.Nombre;
                  const imagen = s.imagenUrl || s.ImagenUrl;
                  const precio = s.precioBase || s.PrecioBase || s.precio || s.Precio;
                  const duracion = s.duracionMinutos || s.DuracionMinutos;

                  const activo =
                    Number(servicioActivo?.idServicio || servicioActivo?.IdServicio) ===
                    Number(idServicio);

                  return (
                    <SwiperSlide key={idServicio}>
                      <button
                        type="button"
                        className={`modal-service-card ${activo ? "active" : ""}`}
                        onClick={() => setServicioActivo(s)}
                      >
                        <div className="modal-service-image">
                          {imagen ? (
                            <img src={getImageUrl(imagen)} alt={nombre} />
                          ) : (
                            <Scissors size={30} />
                          )}

                          {activo && <span>Seleccionado</span>}
                        </div>

                        <div className="modal-service-info">
                          <h4>{nombre}</h4>

                          <div>
                            <strong>S/ {Number(precio || 0).toFixed(2)}</strong>

                            {duracion && (
                              <small>
                                <Clock3 size={13} />
                                {duracion} min
                              </small>
                            )}
                          </div>
                        </div>
                      </button>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            </section>

            <section className="modal-reserva-block">
              <div className="modal-reserva-section-title">
                <UserRound size={17} />
                Elige un especialista
              </div>

              <Swiper
                modules={[FreeMode]}
                freeMode
                spaceBetween={12}
                slidesPerView={2.2}
                breakpoints={{
                  640: { slidesPerView: 3.4 },
                  992: { slidesPerView: 5.2 },
                }}
                className="modal-reserva-swiper"
              >
                {trabajadoresOrdenados.map((t) => {
                  const idTrabajador = t.idTrabajador || t.IdTrabajador;
                  const nombre = t.nombre || t.Nombre;
                  const foto = t.fotoPerfilUrl || t.FotoPerfilUrl;
                  const especialidad = t.especialidad || t.Especialidad;

                  const activo =
                    Number(
                      trabajadorActivo?.idTrabajador ||
                        trabajadorActivo?.IdTrabajador
                    ) === Number(idTrabajador);

                  return (
                    <SwiperSlide key={idTrabajador}>
                      <button
                        type="button"
                        className={`modal-worker-card ${activo ? "active" : ""}`}
                        onClick={() => setTrabajadorActivo(t)}
                      >
                        <div className="modal-worker-photo">
                          {foto ? (
                            <img src={getImageUrl(foto)} alt={nombre} />
                          ) : (
                            <UserRound size={34} />
                          )}

                          {activo && <span>✓</span>}
                        </div>

                        <strong>{nombre}</strong>
                        <small>{especialidad || "Especialista"}</small>
                      </button>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            </section>

            <section className="modal-reserva-block">
              <div className="modal-reserva-section-title">
                <CalendarDays size={17} />
                Detalles de la reserva
              </div>

              {mensajeError && (
                <div className="modal-reserva-error">{mensajeError}</div>
              )}

              <div className="modal-booking-form">
                <div>
                  <label>Fecha</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={fechaReserva}
                    onChange={(e) => setFechaReserva(e.target.value)}
                  />
                </div>

                <div>
                  <label>Hora</label>
                  <select
                    value={horaReserva}
                    onChange={(e) => setHoraReserva(e.target.value)}
                  >
                    <option value="">
                      {cargandoHorarios ? "Cargando..." : "Seleccionar horario"}
                    </option>

                    {horariosDisponibles.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Nombre</label>
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    value={nombreCliente}
                    onChange={(e) => setNombreCliente(e.target.value)}
                  />
                </div>

                <div>
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    placeholder="Tu teléfono"
                    value={telefonoCliente}
                    onChange={(e) =>
                      setTelefonoCliente(e.target.value.replace(/\D/g, ""))
                    }
                  />
                </div>

                <div>
                  <label>Correo opcional</label>
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={correoCliente}
                    onChange={(e) => setCorreoCliente(e.target.value)}
                  />
                </div>

                <div className="modal-booking-form-full">
                  <label>Comentario opcional</label>
                  <textarea
                    placeholder="Ejemplo: prefiero atención rápida, tengo una consulta, etc."
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="button"
                className="modal-confirm-booking-btn"
                onClick={confirmarReserva}
                disabled={guardandoReserva}
              >
                {guardandoReserva ? "Registrando..." : "Confirmar reserva"}
              </button>
            </section>
          </>
        ) : (
          <div className="modal-reserva-success">
            <CheckCircle2 size={58} />

            <h2>Reserva registrada</h2>

            <p>Tu cita fue registrada correctamente.</p>

            {respuestaReserva?.whatsappUrl && (
              <a
                href={respuestaReserva.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="modal-reserva-whatsapp"
              >
                <MessageCircle size={18} />
                Confirmar por WhatsApp
              </a>
            )}

            <button
              type="button"
              className="modal-reserva-finish"
              onClick={cerrarTodo}
            >
              Finalizar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}