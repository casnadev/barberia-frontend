import { useCallback, useEffect, useMemo, useState } from "react";
import API_BASE from "../../services/api";
import authFetch from "../../services/authFetch";

import CardDark from "../../components/ui/CardDark";
import PageHeader from "../../components/ui/PageHeader";
import GoldBadge from "../../components/ui/GoldBadge";
import Toast from "../../components/ui/Toast";
import AvatarCircle from "../../components/ui/AvatarCircle";
import AnimatedNumber from "../../components/ui/AnimatedNumber";

import { getImageUrl } from "../../utils/imageUrl";

import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Clock,
  Mail,
  MessageCircle,
  Phone,
  Scissors,
  Search,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

const ESTADOS = ["Todos", "Pendiente", "Confirmada", "Atendida", "Cancelada"];

function ModalReserva({ abierto, reserva, onClose, onAccion, procesando }) {
  if (!abierto || !reserva) return null;

  const imgServicio =
    reserva.servicioImagenUrl ||
    reserva.imagenServicio ||
    reserva.imagenUrlServicio ||
    reserva.servicioImagen ||
    "";

  const imgTrabajador =
    reserva.trabajadorFotoUrl ||
    reserva.fotoTrabajador ||
    reserva.fotoPerfilUrl ||
    reserva.trabajadorImagen ||
    "";

  return (
    <div className="admin-agenda-modal-backdrop">
      <div className="admin-agenda-modal">
        <div className="admin-agenda-modal-header">
          <h4>Detalle de reserva</h4>

          <button className="admin-agenda-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="admin-agenda-modal-body">
          <div className="admin-agenda-modal-cover">
            {imgServicio ? (
              <img src={getImageUrl(imgServicio)} alt={reserva.servicio || "Servicio"} />
            ) : (
              <Scissors size={42} />
            )}

            <span className={`admin-agenda-status ${estadoClass(reserva.estado)}`}>
              {reserva.estado || "Pendiente"}
            </span>
          </div>

          <div className="admin-agenda-modal-info">
            <h3>{reserva.nombreCliente || "Cliente sin nombre"}</h3>
            <p>{reserva.servicio || "Servicio no especificado"}</p>
          </div>

          <div className="admin-agenda-modal-grid">
            <div>
              <span>Fecha</span>
              <b>
                {reserva.fechaReserva
                  ? new Date(reserva.fechaReserva).toLocaleDateString("es-PE")
                  : "-"}
              </b>
            </div>

            <div>
              <span>Hora</span>
              <b>{reserva.horaReserva || "--:--"}</b>
            </div>

            <div>
              <span>Teléfono</span>
              <b>{reserva.telefonoCliente || "-"}</b>
            </div>

            <div>
              <span>Correo</span>
              <b>{reserva.correoCliente || "-"}</b>
            </div>
          </div>

          <div className="admin-agenda-worker-box">
            <AvatarCircle
              src={imgTrabajador ? getImageUrl(imgTrabajador) : ""}
              alt={reserva.trabajador || "Trabajador"}
              fallback={reserva.trabajador?.charAt(0)?.toUpperCase() || "T"}
              size="md"
            />

            <div>
              <span>Atiende</span>
              <b>{reserva.trabajador || "No asignado"}</b>
            </div>
          </div>

          <div className="admin-agenda-modal-actions">
            {reserva.estado === "Pendiente" && (
              <>
                <button
                  className="btn btn-gold"
                  disabled={procesando}
                  onClick={() => onAccion(reserva.idReserva, "confirmar")}
                >
                  <CheckCircle2 size={16} />
                  Confirmar
                </button>

                <button
                  className="btn btn-dark-outline"
                  disabled={procesando}
                  onClick={() => onAccion(reserva.idReserva, "cancelar")}
                >
                  <XCircle size={16} />
                  Cancelar
                </button>
              </>
            )}

            {reserva.estado === "Confirmada" && (
              <button
                className="btn btn-gold w-100"
                disabled={procesando}
                onClick={() => onAccion(reserva.idReserva, "atendida")}
              >
                <CircleCheckBig size={16} />
                Marcar como atendida
              </button>
            )}

            {(reserva.estado === "Atendida" || reserva.estado === "Cancelada") && (
              <button className="btn btn-dark-outline w-100" disabled>
                Sin acciones pendientes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function estadoClass(estado) {
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
}

export default function AgendaReservasAdmin() {
  const [lista, setLista] = useState([]);
  const [whatsappCliente, setWhatsappCliente] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);

  const hoyISO = new Date().toISOString().substring(0, 10);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyISO);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("Todos");

  const [modalReserva, setModalReserva] = useState(false);
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);

  const leerJsonSeguro = async (res, valorDefecto) => {
    try {
      if (!res) return valorDefecto;
      return await res.json();
    } catch {
      return valorDefecto;
    }
  };

  const cargarReservas = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await authFetch(`${API_BASE}/Reservas/mis-reservas`);
      if (!res) return;

      const data = await leerJsonSeguro(res, []);

      if (!res.ok) {
        setError(data.mensaje || "No se pudieron cargar las reservas.");
        return;
      }

      setLista(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Error al cargar reservas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarReservas();
  }, [cargarReservas]);

  const cambiarEstado = async (id, accion) => {
    setWhatsappCliente("");
    setMensaje("");
    setError("");
    setProcesandoId(id);

    try {
      const res = await authFetch(`${API_BASE}/Reservas/${accion}/${id}`, {
        method: "PATCH",
      });

      if (!res) return;

      const data = await leerJsonSeguro(res, {});

      if (!res.ok) {
        setError(data.mensaje || "No se pudo procesar la reserva.");
        return;
      }

      setMensaje(data.mensaje || "Acción realizada correctamente.");

      if (data.whatsappUrl) {
        setWhatsappCliente(data.whatsappUrl);
      }

      setModalReserva(false);
      setReservaSeleccionada(null);

      await cargarReservas();
    } catch (err) {
      console.error(err);
      setError("Error procesando reserva.");
    } finally {
      setProcesandoId(null);
    }
  };

  const fechaReservaISO = (r) => r.fechaReserva?.substring(0, 10) || "";

  const normalizarHora = (hora) => {
    if (!hora) return 0;

    const limpio = String(hora).trim();

    if (limpio.includes(":")) {
      const [h, m] = limpio.split(":").map(Number);
      return (Number(h) || 0) * 60 + (Number(m) || 0);
    }

    const numero = Number(limpio);
    return Number.isNaN(numero) ? 0 : numero * 60;
  };

  const reservasDiaBase = useMemo(() => {
    return lista
      .filter((r) => fechaReservaISO(r) === fechaSeleccionada)
      .sort((a, b) => normalizarHora(a.horaReserva) - normalizarHora(b.horaReserva));
  }, [lista, fechaSeleccionada]);

  const reservasDia = useMemo(() => {
    return reservasDiaBase.filter((r) => {
      if (estadoFiltro !== "Todos" && r.estado !== estadoFiltro) return false;

      if (busqueda.trim()) {
        const texto = `${r.nombreCliente || ""} ${r.servicio || ""} ${r.trabajador || ""} ${
          r.telefonoCliente || ""
        } ${r.correoCliente || ""}`.toLowerCase();

        if (!texto.includes(busqueda.toLowerCase())) return false;
      }

      return true;
    });
  }, [reservasDiaBase, estadoFiltro, busqueda]);

  const reservasPorFecha = useMemo(() => {
    const map = new Map();

    lista.forEach((r) => {
      const fecha = fechaReservaISO(r);
      if (!fecha) return;
      map.set(fecha, (map.get(fecha) || 0) + 1);
    });

    return map;
  }, [lista]);

  const imagenTrabajador = (r) =>
    r.trabajadorFotoUrl ||
    r.fotoTrabajador ||
    r.fotoPerfilUrl ||
    r.trabajadorImagen ||
    "";

  const imagenServicio = (r) =>
    r.servicioImagenUrl ||
    r.imagenServicio ||
    r.imagenUrlServicio ||
    r.servicioImagen ||
    "";

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

    return Array.from(new Set([...horasBase, ...horasReservas])).sort((a, b) => a - b);
  }, [reservasDia]);

  const estadisticasDia = useMemo(() => {
    const total = reservasDiaBase.length;
    const pendientes = reservasDiaBase.filter((r) => r.estado === "Pendiente").length;
    const confirmadas = reservasDiaBase.filter((r) => r.estado === "Confirmada").length;
    const atendidas = reservasDiaBase.filter((r) => r.estado === "Atendida").length;
    const canceladas = reservasDiaBase.filter((r) => r.estado === "Cancelada").length;

    return { total, pendientes, confirmadas, atendidas, canceladas };
  }, [reservasDiaBase]);

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

  const formatearHoraBloque = (hora) => `${String(hora).padStart(2, "0")}:00`;

  const abrirDetalle = (reserva) => {
    setReservaSeleccionada(reserva);
    setModalReserva(true);
  };

  const ReservaCard = ({ reserva, compact = false }) => {
    const imgServicio = imagenServicio(reserva);
    const imgTrabajador = imagenTrabajador(reserva);
    const enProceso = procesandoId === reserva.idReserva;

    return (
      <div
        className={`admin-agenda-reserva-card ${estadoClass(reserva.estado)} ${
          compact ? "compact" : ""
        }`}
        onClick={() => abrirDetalle(reserva)}
        role="button"
        tabIndex={0}
      >
        <div className="admin-agenda-reserva-head">
          {imgServicio ? (
            <img
              src={getImageUrl(imgServicio)}
              alt={reserva.servicio || "Servicio"}
              className="admin-agenda-service-img"
            />
          ) : (
            <div className="admin-agenda-service-placeholder">
              <Scissors size={18} />
            </div>
          )}

          <div className="admin-agenda-reserva-main">
            <div className="admin-agenda-reserva-time">
              <Clock size={13} />
              {reserva.horaReserva || "--:--"}
            </div>

            <h5 title={reserva.nombreCliente}>
              {reserva.nombreCliente || "Cliente sin nombre"}
            </h5>

            <p title={reserva.servicio}>{reserva.servicio || "Servicio"}</p>
          </div>
        </div>

        <div className="admin-agenda-reserva-worker">
          {imgTrabajador ? (
            <img src={getImageUrl(imgTrabajador)} alt={reserva.trabajador || "Trabajador"} />
          ) : (
            <span>{reserva.trabajador?.charAt(0)?.toUpperCase() || "T"}</span>
          )}

          <b>{reserva.trabajador || "No asignado"}</b>
        </div>

        {!compact && (
          <div className="admin-agenda-reserva-contact">
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
        )}

        <div className="admin-agenda-reserva-bottom">
          <span className={`admin-agenda-status ${estadoClass(reserva.estado)}`}>
            {reserva.estado || "Pendiente"}
          </span>
        </div>

        <div className="admin-agenda-reserva-actions" onClick={(e) => e.stopPropagation()}>
          {reserva.estado === "Pendiente" && (
            <>
              <button
                className="btn btn-gold btn-sm"
                disabled={enProceso}
                onClick={() => cambiarEstado(reserva.idReserva, "confirmar")}
              >
                <CheckCircle2 size={14} />
                Confirmar
              </button>

              <button
                className="btn btn-dark-outline btn-sm"
                disabled={enProceso}
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
              disabled={enProceso}
              onClick={() => cambiarEstado(reserva.idReserva, "atendida")}
            >
              <CircleCheckBig size={14} />
              Marcar atendida
            </button>
          )}

          {(reserva.estado === "Atendida" || reserva.estado === "Cancelada") && (
            <button className="btn btn-dark-outline btn-sm w-100" disabled>
              Sin acciones
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page-shell admin-agenda-page">
      <div className="container-fluid py-4">
        <CardDark className="admin-agenda-header-card mb-4">
          <div className="admin-agenda-header-row">
            <PageHeader
              title="Agenda de reservas"
              subtitle="Control diario de citas por trabajador, con historial pasado y futuro."
            />

            <div className="admin-agenda-header-actions">
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
            className="btn btn-gold mb-4 admin-agenda-whatsapp-btn"
          >
            <MessageCircle size={16} />
            Enviar WhatsApp al cliente
          </a>
        )}

        <section className="admin-agenda-kpi-grid mb-4">
          <CardDark className="admin-agenda-kpi-card gold">
            <div className="admin-agenda-kpi-icon">
              <CalendarDays size={22} />
            </div>
            <p>Total citas</p>
            <h2>
              <AnimatedNumber value={estadisticasDia.total} decimals={0} />
            </h2>
            <span>Reservas del día seleccionado</span>
          </CardDark>

          <CardDark className="admin-agenda-kpi-card pending">
            <div className="admin-agenda-kpi-icon">
              <Clock size={22} />
            </div>
            <p>Pendientes</p>
            <h2>
              <AnimatedNumber value={estadisticasDia.pendientes} decimals={0} />
            </h2>
            <span>Esperan confirmación</span>
          </CardDark>

          <CardDark className="admin-agenda-kpi-card success">
            <div className="admin-agenda-kpi-icon">
              <CheckCircle2 size={22} />
            </div>
            <p>Confirmadas</p>
            <h2>
              <AnimatedNumber value={estadisticasDia.confirmadas} decimals={0} />
            </h2>
            <span>Listas para atender</span>
          </CardDark>

          <CardDark className="admin-agenda-kpi-card info">
            <div className="admin-agenda-kpi-icon">
              <UserRound size={22} />
            </div>
            <p>Trabajadores</p>
            <h2>
              <AnimatedNumber value={trabajadoresDia.length} decimals={0} />
            </h2>
            <span>Con agenda en esta fecha</span>
          </CardDark>
        </section>

        <CardDark className="admin-agenda-toolbar-card mb-4">
          <div className="admin-agenda-toolbar">
            <div>
              <h4 className="section-title text-capitalize mb-1">
                {formatearFecha(fechaSeleccionada)}
              </h4>
              <p className="section-subtitle">
                Cambia la fecha para revisar citas pasadas, actuales o futuras.
              </p>
            </div>

            <div className="admin-agenda-date-controls">
              <button className="btn btn-dark-outline" onClick={() => cambiarDia(-1)}>
                <ChevronLeft size={16} />
              </button>

              <div className="admin-agenda-date-input-wrap">
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

          <div className="admin-agenda-filter-grid">
            <div className="admin-agenda-search-box">
              <Search size={16} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar cliente, servicio, trabajador..."
              />
            </div>

            <select
              className="form-control input-dark"
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
            >
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          {reservasPorFecha.size > 0 && (
            <div className="admin-agenda-history-strip">
              {Array.from(reservasPorFecha.entries())
                .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                .slice(0, 14)
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
        ) : reservasDia.length > 0 ? (
          <CardDark className="admin-agenda-calendar-card">
            <div className="admin-agenda-calendar-head">
              <div>
                <h4 className="section-title mb-1">Calendario diario</h4>
                <p className="section-subtitle">
                  Visualiza citas por hora y trabajador. Al marcar atendida se mantiene el flujo hacia ventas, dashboard y pagos.
                </p>
              </div>

              <GoldBadge>{reservasDia.length} visibles</GoldBadge>
            </div>

            <div className="admin-agenda-desktop-board">
              <div
                className="admin-agenda-calendar-grid"
                style={{
                  gridTemplateColumns: `88px repeat(${trabajadoresDia.length}, minmax(230px, 1fr))`,
                }}
              >
                <div className="admin-agenda-time-header">Hora</div>

                {trabajadoresDia.map((t) => (
                  <div className="admin-agenda-worker-header" key={t.key}>
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
                  <div className="admin-agenda-grid-row" key={hora}>
                    <div className="admin-agenda-time-cell">
                      {formatearHoraBloque(hora)}
                    </div>

                    {trabajadoresDia.map((t) => {
                      const reservasCelda = reservasPorTrabajadorYHora(t.key, hora);

                      return (
                        <div className="admin-agenda-worker-cell" key={`${t.key}-${hora}`}>
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

            <div className="admin-agenda-mobile-board">
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
                  <div className="admin-agenda-mobile-worker-card" key={t.key}>
                    <div className="admin-agenda-mobile-worker-head">
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

                    <div className="admin-agenda-mobile-reservas">
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
          <CardDark className="admin-agenda-empty-card">
            <CalendarDays size={38} />
            <h4>No hay reservas para esta fecha</h4>
            <p>Cambia el calendario o limpia filtros para revisar citas pasadas o futuras.</p>
          </CardDark>
        )}

        <ModalReserva
          abierto={modalReserva}
          reserva={reservaSeleccionada}
          onClose={() => {
            setModalReserva(false);
            setReservaSeleccionada(null);
          }}
          onAccion={cambiarEstado}
          procesando={procesandoId === reservaSeleccionada?.idReserva}
        />
      </div>
    </div>
  );
}
