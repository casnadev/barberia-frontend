import { useEffect, useState, useCallback, useMemo } from "react";
import API_BASE from "../../services/api";
import authFetch from "../../services/authFetch";

import CardDark from "../../components/ui/CardDark";
import PageHeader from "../../components/ui/PageHeader";
import GoldBadge from "../../components/ui/GoldBadge";
import Toast from "../../components/ui/Toast";
import AvatarCircle from "../../components/ui/AvatarCircle";

import { getImageUrl } from "../../utils/imageUrl";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Phone,
  Mail,
  MessageCircle,
  Scissors,
  CheckCircle2,
  XCircle,
  CircleCheckBig,
} from "lucide-react";

export default function MisReservas() {
  const [lista, setLista] = useState([]);
  const [whatsappCliente, setWhatsappCliente] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const hoyISO = new Date().toISOString().substring(0, 10);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyISO);

  const cargarReservas = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await authFetch(`${API_BASE}/Reservas/mis-reservas`);
      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudieron cargar las reservas");
        return;
      }

      setLista(data || []);
    } catch (err) {
      console.error(err);
      setError("Error al cargar reservas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarReservas();
    }, 0);

    return () => clearTimeout(timer);
  }, [cargarReservas]);

  const cambiarEstado = async (id, accion) => {
    setWhatsappCliente("");
    setMensaje("");
    setError("");

    try {
      const res = await authFetch(`${API_BASE}/Reservas/${accion}/${id}`, {
        method: "PATCH",
      });

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo procesar la reserva");
        return;
      }

      setMensaje(data.mensaje || "Acción realizada correctamente");

      if (data.whatsappUrl) {
        setWhatsappCliente(data.whatsappUrl);
      }

      await cargarReservas();
    } catch (err) {
      console.error(err);
      setError("Error procesando reserva");
    }
  };

  const fechaReservaISO = (r) => {
    return r.fechaReserva?.substring(0, 10) || "";
  };

  const reservasDia = useMemo(() => {
    return lista
      .filter((r) => fechaReservaISO(r) === fechaSeleccionada)
      .sort((a, b) => normalizarHora(a.horaReserva) - normalizarHora(b.horaReserva));
  }, [lista, fechaSeleccionada]);

  const reservasPorFecha = useMemo(() => {
    const map = new Map();

    lista.forEach((r) => {
      const fecha = fechaReservaISO(r);
      if (!fecha) return;

      map.set(fecha, (map.get(fecha) || 0) + 1);
    });

    return map;
  }, [lista]);

  const trabajadoresDia = useMemo(() => {
    const map = new Map();

    reservasDia.forEach((r) => {
      const key =
        r.idTrabajador ||
        r.idTrabajadorAsignado ||
        r.trabajadorId ||
        r.trabajador ||
        "sin-asignar";

      if (!map.has(key)) {
        map.set(key, {
          key,
          nombre: r.trabajador || "No asignado",
          foto: imagenTrabajador(r),
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      String(a.nombre).localeCompare(String(b.nombre))
    );
  }, [reservasDia]);

  const horasAgenda = useMemo(() => {
    const horasBase = [];
    for (let h = 8; h <= 21; h += 1) {
      horasBase.push(h);
    }

    const horasReservas = reservasDia
      .map((r) => Math.floor(normalizarHora(r.horaReserva) / 60))
      .filter((h) => !Number.isNaN(h));

    const todas = Array.from(new Set([...horasBase, ...horasReservas])).sort(
      (a, b) => a - b
    );

    return todas;
  }, [reservasDia]);

  const estadisticasDia = useMemo(() => {
    const total = reservasDia.length;
    const pendientes = reservasDia.filter((r) => r.estado === "Pendiente").length;
    const confirmadas = reservasDia.filter((r) => r.estado === "Confirmada").length;
    const atendidas = reservasDia.filter((r) => r.estado === "Atendida").length;
    const canceladas = reservasDia.filter((r) => r.estado === "Cancelada").length;

    return { total, pendientes, confirmadas, atendidas, canceladas };
  }, [reservasDia]);

  const reservasPorTrabajadorYHora = (trabajadorKey, hora) => {
    return reservasDia.filter((r) => {
      const key =
        r.idTrabajador ||
        r.idTrabajadorAsignado ||
        r.trabajadorId ||
        r.trabajador ||
        "sin-asignar";

      const horaReserva = Math.floor(normalizarHora(r.horaReserva) / 60);

      return String(key) === String(trabajadorKey) && horaReserva === hora;
    });
  };

  const cambiarDia = (dias) => {
    const fecha = new Date(`${fechaSeleccionada}T00:00:00`);
    fecha.setDate(fecha.getDate() + dias);
    setFechaSeleccionada(fecha.toISOString().substring(0, 10));
  };

  const volverHoy = () => {
    setFechaSeleccionada(hoyISO);
  };

  const badgeColor = (estado) => {
    switch (estado) {
      case "Confirmada":
        return "#16a34a";
      case "Atendida":
        return "#2563eb";
      case "Cancelada":
        return "#dc2626";
      default:
        return "#d4af37";
    }
  };

  const estadoClass = (estado) => {
    switch (estado) {
      case "Confirmada":
        return "confirmada";
      case "Atendida":
        return "atendida";
      case "Cancelada":
        return "cancelada";
      default:
        return "pendiente";
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "Sin fecha";

    return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatearDiaCorto = (fecha) => {
    if (!fecha) return "";

    return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
    });
  };

  const imagenServicio = (r) => {
    return (
      r.servicioImagenUrl ||
      r.imagenServicio ||
      r.imagenUrlServicio ||
      r.servicioImagen ||
      ""
    );
  };

  function imagenTrabajador(r) {
    return (
      r.trabajadorFotoUrl ||
      r.fotoTrabajador ||
      r.fotoPerfilUrl ||
      r.trabajadorImagen ||
      ""
    );
  }

  function normalizarHora(hora) {
    if (!hora) return 0;

    const limpio = String(hora).trim();

    if (limpio.includes(":")) {
      const [h, m] = limpio.split(":").map(Number);
      return (Number(h) || 0) * 60 + (Number(m) || 0);
    }

    const numero = Number(limpio);
    return Number.isNaN(numero) ? 0 : numero * 60;
  }

  const formatearHoraBloque = (hora) => {
    return `${String(hora).padStart(2, "0")}:00`;
  };

  const ReservaCard = ({ reserva, compact = false }) => {
    const imgServicio = imagenServicio(reserva);
    const imgTrabajador = imagenTrabajador(reserva);

    return (
      <div className={`agenda-reserva-card ${estadoClass(reserva.estado)} ${compact ? "compact" : ""}`}>
        <div className="agenda-reserva-head">
          {imgServicio ? (
            <img
              src={getImageUrl(imgServicio)}
              alt={reserva.servicio || "Servicio"}
              className="agenda-service-img"
            />
          ) : (
            <div className="agenda-service-placeholder">
              <Scissors size={18} />
            </div>
          )}

          <div className="agenda-reserva-main">
            <div className="agenda-reserva-time">
              <Clock size={13} />
              {reserva.horaReserva || "--:--"}
            </div>

            <h5 title={reserva.nombreCliente}>
              {reserva.nombreCliente || "Cliente sin nombre"}
            </h5>

            <p title={reserva.servicio}>
              {reserva.servicio || "Servicio no especificado"}
            </p>
          </div>
        </div>

        <div className="agenda-reserva-worker">
          {imgTrabajador ? (
            <img
              src={getImageUrl(imgTrabajador)}
              alt={reserva.trabajador || "Trabajador"}
            />
          ) : (
            <span>{reserva.trabajador?.charAt(0)?.toUpperCase() || "T"}</span>
          )}

          <b>{reserva.trabajador || "No asignado"}</b>
        </div>

        <div className="agenda-reserva-contact">
          {reserva.telefonoCliente && (
            <span>
              <Phone size={13} />
              {reserva.telefonoCliente}
            </span>
          )}

          {reserva.correoCliente && (
            <span>
              <Mail size={13} />
              {reserva.correoCliente}
            </span>
          )}
        </div>

        <div className="agenda-reserva-bottom">
          <span
            className="agenda-estado-pill"
            style={{ background: badgeColor(reserva.estado) }}
          >
            {reserva.estado}
          </span>
        </div>

        <div className="agenda-reserva-actions">
          {reserva.estado === "Pendiente" && (
            <>
              <button
                className="btn btn-gold btn-sm"
                onClick={() => cambiarEstado(reserva.idReserva, "confirmar")}
              >
                <CheckCircle2 size={14} />
                Confirmar
              </button>

              <button
                className="btn btn-dark-outline btn-sm"
                onClick={() => cambiarEstado(reserva.idReserva, "cancelar")}
              >
                <XCircle size={14} />
                Cancelar
              </button>
            </>
          )}

          {reserva.estado === "Confirmada" && (
            <button
              className="btn btn-gold btn-sm w-100"
              onClick={() => cambiarEstado(reserva.idReserva, "atendida")}
            >
              <CircleCheckBig size={14} />
              Marcar atendida
            </button>
          )}

          {(reserva.estado === "Atendida" || reserva.estado === "Cancelada") && (
            <button className="btn btn-dark-outline btn-sm w-100" disabled>
              Sin acciones pendientes
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page-shell reservas-page">
      <div className="container-fluid py-4">
        <CardDark className="mb-4 reservas-header-card">
          <div className="reservas-header-row">
            <PageHeader
              title="Agenda de Reservas"
              subtitle="Control diario de citas por trabajador, con historial pasado y futuro por fecha."
            />

            <div className="reservas-header-actions">
              <GoldBadge>{estadisticasDia.total} citas del día</GoldBadge>

              <button className="btn btn-dark-outline" onClick={volverHoy}>
                Hoy
              </button>
            </div>
          </div>
        </CardDark>

        <Toast mensaje={mensaje} tipo="success" onClose={() => setMensaje("")} />
        <Toast mensaje={error} tipo="error" onClose={() => setError("")} />

        {whatsappCliente && (
          <a
            href={whatsappCliente}
            target="_blank"
            rel="noreferrer"
            className="btn btn-gold mb-4 reservas-whatsapp-btn"
          >
            <MessageCircle size={16} />
            Enviar WhatsApp al cliente
          </a>
        )}

        <CardDark className="reservas-toolbar-card mb-4">
          <div className="reservas-toolbar">
            <div>
              <h4 className="section-title text-capitalize mb-1">
                {formatearFecha(fechaSeleccionada)}
              </h4>
              <p className="section-subtitle">
                Cambia la fecha para revisar citas pasadas, actuales o futuras.
              </p>
            </div>

            <div className="reservas-date-controls">
              <button className="btn btn-dark-outline" onClick={() => cambiarDia(-1)}>
                <ChevronLeft size={16} />
              </button>

              <div className="reservas-date-input-wrap">
                <CalendarDays size={16} />
                <input
                  type="date"
                  className="form-control input-dark"
                  value={fechaSeleccionada}
                  onChange={(e) => setFechaSeleccionada(e.target.value)}
                />
              </div>

              <button className="btn btn-dark-outline" onClick={() => cambiarDia(1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="reservas-stats-grid">
            <div className="reservas-stat-card">
              <span>Total</span>
              <b>{estadisticasDia.total}</b>
            </div>

            <div className="reservas-stat-card pendiente">
              <span>Pendientes</span>
              <b>{estadisticasDia.pendientes}</b>
            </div>

            <div className="reservas-stat-card confirmada">
              <span>Confirmadas</span>
              <b>{estadisticasDia.confirmadas}</b>
            </div>

            <div className="reservas-stat-card atendida">
              <span>Atendidas</span>
              <b>{estadisticasDia.atendidas}</b>
            </div>

            <div className="reservas-stat-card cancelada">
              <span>Canceladas</span>
              <b>{estadisticasDia.canceladas}</b>
            </div>
          </div>

          {reservasPorFecha.size > 0 && (
            <div className="reservas-history-strip">
              {Array.from(reservasPorFecha.entries())
                .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                .slice(0, 12)
                .map(([fecha, cantidad]) => (
                  <button
                    key={fecha}
                    className={fecha === fechaSeleccionada ? "active" : ""}
                    onClick={() => setFechaSeleccionada(fecha)}
                  >
                    <span>{formatearDiaCorto(fecha)}</span>
                    <b>{cantidad}</b>
                  </button>
                ))}
            </div>
          )}
        </CardDark>

        {loading ? (
          <CardDark>
            <p className="text-center mb-0">Cargando reservas...</p>
          </CardDark>
        ) : estadisticasDia.total > 0 ? (
          <CardDark className="reservas-calendar-card">
            <div className="reservas-calendar-head">
              <div>
                <h4 className="section-title mb-1">Calendario diario</h4>
                <p className="section-subtitle">
                  Visualiza cada cita por hora y por trabajador.
                </p>
              </div>

              <GoldBadge>{trabajadoresDia.length} trabajadores</GoldBadge>
            </div>

            <div className="agenda-desktop-board">
              <div
                className="agenda-calendar-grid"
                style={{
                  gridTemplateColumns: `88px repeat(${trabajadoresDia.length}, minmax(210px, 1fr))`,
                }}
              >
                <div className="agenda-time-header">Hora</div>

                {trabajadoresDia.map((t) => (
                  <div className="agenda-worker-header" key={t.key}>
                    <AvatarCircle
                      src={t.foto ? getImageUrl(t.foto) : ""}
                      alt={t.nombre}
                      fallback={t.nombre?.charAt(0)?.toUpperCase() || "T"}
                      size="sm"
                    />
                    <span>{t.nombre}</span>
                  </div>
                ))}

                {horasAgenda.map((hora) => (
                  <div className="agenda-grid-row" key={hora}>
                    <div className="agenda-time-cell">
                      {formatearHoraBloque(hora)}
                    </div>

                    {trabajadoresDia.map((t) => {
                      const reservasCelda = reservasPorTrabajadorYHora(t.key, hora);

                      return (
                        <div className="agenda-worker-cell" key={`${t.key}-${hora}`}>
                          {reservasCelda.map((r) => (
                            <ReservaCard key={r.idReserva} reserva={r} compact />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="agenda-mobile-board">
              {trabajadoresDia.map((t) => {
                const reservasTrabajador = reservasDia.filter((r) => {
                  const key =
                    r.idTrabajador ||
                    r.idTrabajadorAsignado ||
                    r.trabajadorId ||
                    r.trabajador ||
                    "sin-asignar";

                  return String(key) === String(t.key);
                });

                return (
                  <div className="agenda-mobile-worker-card" key={t.key}>
                    <div className="agenda-mobile-worker-head">
                      <AvatarCircle
                        src={t.foto ? getImageUrl(t.foto) : ""}
                        alt={t.nombre}
                        fallback={t.nombre?.charAt(0)?.toUpperCase() || "T"}
                        size="sm"
                      />

                      <div>
                        <h5>{t.nombre}</h5>
                        <p>{reservasTrabajador.length} citas</p>
                      </div>
                    </div>

                    <div className="agenda-mobile-reservas">
                      {reservasTrabajador.map((r) => (
                        <ReservaCard key={r.idReserva} reserva={r} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardDark>
        ) : (
          <CardDark className="reservas-empty-card">
            <CalendarDays size={38} />
            <h4>No hay reservas para esta fecha</h4>
            <p>
              Cambia el calendario para revisar citas pasadas o futuras.
            </p>
          </CardDark>
        )}
      </div>
    </div>
  );
}
