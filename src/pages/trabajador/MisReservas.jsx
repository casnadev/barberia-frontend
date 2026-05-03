import { useEffect, useState, useCallback, useMemo } from "react";
import API_BASE from "../../services/api";
import authFetch from "../../services/authFetch";

import CardDark from "../../components/ui/CardDark";
import PageHeader from "../../components/ui/PageHeader";
import GoldBadge from "../../components/ui/GoldBadge";

export default function MisReservas() {
  const [lista, setLista] = useState([]);
  const [whatsappCliente, setWhatsappCliente] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const baseUrl = API_BASE.replace("/api", "");

  const obtenerUrl = (ruta) => {
    if (!ruta) return "";
    if (ruta.startsWith("http")) return ruta;
    return `${baseUrl}${ruta}`;
  };

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

  const reservasAgrupadas = useMemo(() => {
    const map = new Map();

    lista.forEach((r) => {
      const fecha = r.fechaReserva?.substring(0, 10) || "Sin fecha";

      if (!map.has(fecha)) {
        map.set(fecha, []);
      }

      map.get(fecha).push(r);
    });

    return Array.from(map.entries()).sort(
      (a, b) => new Date(a[0]) - new Date(b[0])
    );
  }, [lista]);

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

  const badgeColor = (estado) => {
    switch (estado) {
      case "Confirmada":
        return "#22c55e";
      case "Atendida":
        return "#38bdf8";
      case "Cancelada":
        return "#ef4444";
      default:
        return "#d4af37";
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha || fecha === "Sin fecha") return "Sin fecha";

    return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
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

  const imagenTrabajador = (r) => {
    return (
      r.trabajadorFotoUrl ||
      r.fotoTrabajador ||
      r.fotoPerfilUrl ||
      r.trabajadorImagen ||
      ""
    );
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Agenda de Reservas"
        subtitle="Gestiona tus citas de forma ordenada por día"
      />

      <div className="container-fluid py-4">
        <style>{`
          .agenda-day-section {
            margin-bottom: 28px;
          }

          .agenda-scroll {
            max-height: 430px;
            overflow-y: auto;
            overflow-x: hidden;
            padding-right: 6px;
          }

          .agenda-scroll::-webkit-scrollbar {
            width: 6px;
          }

          .agenda-scroll::-webkit-scrollbar-thumb {
            background: #d4af37;
            border-radius: 10px;
          }

          .reserva-card-pro {
            background: #ffffff;
            border: 1px solid rgba(212, 175, 55, 0.18);
            border-radius: 20px;
            padding: 16px;
            height: 100%;
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .reserva-card-top {
            display: flex;
            gap: 14px;
            align-items: center;
          }

          .reserva-service-img {
            width: 74px;
            height: 74px;
            border-radius: 16px;
            object-fit: cover;
            border: 1px solid rgba(212, 175, 55, 0.25);
            background: rgba(212, 175, 55, 0.08);
            flex-shrink: 0;
          }

          .reserva-placeholder-img {
            width: 74px;
            height: 74px;
            border-radius: 16px;
            border: 1px solid rgba(212, 175, 55, 0.25);
            background: rgba(212, 175, 55, 0.08);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            flex-shrink: 0;
          }

          .reserva-cliente {
            font-size: 1.08rem;
            font-weight: 900;
            color: #111827;
            margin-bottom: 4px;
          }

          .reserva-servicio {
            font-size: 0.92rem;
            color: #6b7280;
            font-weight: 600;
          }

          .reserva-info-box {
            background: #f9fafb;
            border-radius: 16px;
            padding: 12px;
            border: 1px solid rgba(15,23,42,0.06);
          }

          .reserva-info-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 8px;
            font-size: 0.92rem;
          }

          .reserva-info-row:last-child {
            margin-bottom: 0;
          }

          .reserva-info-row span {
            color: #6b7280;
            font-weight: 600;
          }

          .reserva-info-row b {
            color: #111827;
            text-align: right;
          }

          .trabajador-mini {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .trabajador-avatar {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(212, 175, 55, 0.45);
            background: #111;
          }

          .trabajador-avatar-placeholder {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            border: 2px solid rgba(212, 175, 55, 0.45);
            background: #111;
            color: #d4af37;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
          }

          .estado-pill {
            display: inline-block;
            padding: 7px 14px;
            border-radius: 999px;
            color: #fff;
            font-weight: 800;
            font-size: 0.82rem;
          }

          .reserva-actions {
            margin-top: auto;
            display: flex;
            gap: 8px;
          }

          @media (max-width: 768px) {
            .agenda-scroll {
              max-height: 330px;
              padding-right: 4px;
            }

            .reserva-card-pro {
              padding: 14px;
              border-radius: 18px;
            }

            .reserva-card-top {
              align-items: flex-start;
            }

            .reserva-service-img,
            .reserva-placeholder-img {
              width: 62px;
              height: 62px;
              border-radius: 14px;
            }

            .reserva-actions {
              flex-direction: column;
            }

            .reserva-actions .btn {
              width: 100%;
            }
          }
        `}</style>

        {mensaje && <div className="alert alert-success">{mensaje}</div>}

        {whatsappCliente && (
          <a
            href={whatsappCliente}
            target="_blank"
            rel="noreferrer"
            className="btn btn-gold mb-4"
          >
            Enviar WhatsApp al cliente
          </a>
        )}

        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <CardDark>
            <p className="text-center mb-0">Cargando reservas...</p>
          </CardDark>
        ) : reservasAgrupadas.length > 0 ? (
          reservasAgrupadas.map(([fecha, reservas]) => (
            <section key={fecha} className="agenda-day-section">
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div>
                  <h4 className="section-title mb-1 text-capitalize">
                    {formatearFecha(fecha)}
                  </h4>
                  <p className="section-subtitle mb-0">
                    Reservas programadas para este día
                  </p>
                </div>

                <GoldBadge>{reservas.length} citas</GoldBadge>
              </div>

              <div className="agenda-scroll">
                <div className="row g-3">
                  {reservas.map((r) => {
                    const imgServicio = imagenServicio(r);
                    const imgTrabajador = imagenTrabajador(r);

                    return (
                      <div key={r.idReserva} className="col-xl-4 col-lg-6">
                        <div className="reserva-card-pro">
                          <div className="reserva-card-top">
                            {imgServicio ? (
                              <img
                                src={obtenerUrl(imgServicio)}
                                alt={r.servicio || "Servicio"}
                                className="reserva-service-img"
                              />
                            ) : (
                              <div className="reserva-placeholder-img">✂️</div>
                            )}

                            <div style={{ minWidth: 0 }}>
                              <div className="reserva-cliente">
                                {r.nombreCliente}
                              </div>
                              <div className="reserva-servicio">
                                {r.servicio || "Servicio no especificado"}
                              </div>
                            </div>
                          </div>

                          <div className="reserva-info-box">
                            <div className="reserva-info-row">
                              <span>Hora</span>
                              <b>{r.horaReserva}</b>
                            </div>

                            <div className="reserva-info-row">
                              <span>Trabajador</span>
                              <b>
                                <div className="trabajador-mini">
                                  {imgTrabajador ? (
                                    <img
                                      src={obtenerUrl(imgTrabajador)}
                                      alt={r.trabajador || "Trabajador"}
                                      className="trabajador-avatar"
                                    />
                                  ) : (
                                    <div className="trabajador-avatar-placeholder">
                                      {r.trabajador?.charAt(0)?.toUpperCase() ||
                                        "T"}
                                    </div>
                                  )}
                                  <span>{r.trabajador || "No asignado"}</span>
                                </div>
                              </b>
                            </div>

                            {r.telefonoCliente && (
                              <div className="reserva-info-row">
                                <span>Teléfono</span>
                                <b>{r.telefonoCliente}</b>
                              </div>
                            )}

                            {r.correoCliente && (
                              <div className="reserva-info-row">
                                <span>Correo</span>
                                <b>{r.correoCliente}</b>
                              </div>
                            )}
                          </div>

                          <div>
                            <span
                              className="estado-pill"
                              style={{ background: badgeColor(r.estado) }}
                            >
                              {r.estado}
                            </span>
                          </div>

                          <div className="reserva-actions">
                            {r.estado === "Pendiente" && (
                              <>
                                <button
                                  className="btn btn-gold"
                                  onClick={() =>
                                    cambiarEstado(r.idReserva, "confirmar")
                                  }
                                >
                                  Confirmar
                                </button>

                                <button
                                  className="btn btn-dark-outline"
                                  onClick={() =>
                                    cambiarEstado(r.idReserva, "cancelar")
                                  }
                                >
                                  Cancelar
                                </button>
                              </>
                            )}

                            {r.estado === "Confirmada" && (
                              <button
                                className="btn btn-gold w-100"
                                onClick={() =>
                                  cambiarEstado(r.idReserva, "atendida")
                                }
                              >
                                Marcar atendida
                              </button>
                            )}

                            {(r.estado === "Atendida" ||
                              r.estado === "Cancelada") && (
                              <button
                                className="btn btn-dark-outline w-100"
                                disabled
                              >
                                Sin acciones pendientes
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ))
        ) : (
          <CardDark>
            <p className="text-center mb-0">No hay reservas registradas.</p>
          </CardDark>
        )}
      </div>
    </div>
  );
}