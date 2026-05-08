import { useEffect, useMemo, useState } from "react";
import API_BASE from "../../services/api";
import authFetch from "../../services/authFetch";

import CardDark from "../../components/ui/CardDark";
import PageHeader from "../../components/ui/PageHeader";
import GoldBadge from "../../components/ui/GoldBadge";
import Toast from "../../components/ui/Toast";

import {
  CalendarOff,
  CheckCircle2,
  Clock,
  Coffee,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

const diasBase = [
  { diaSemana: 1, nombre: "Lunes", corto: "Lun" },
  { diaSemana: 2, nombre: "Martes", corto: "Mar" },
  { diaSemana: 3, nombre: "Miércoles", corto: "Mié" },
  { diaSemana: 4, nombre: "Jueves", corto: "Jue" },
  { diaSemana: 5, nombre: "Viernes", corto: "Vie" },
  { diaSemana: 6, nombre: "Sábado", corto: "Sáb" },
  { diaSemana: 7, nombre: "Domingo", corto: "Dom" },
];

const motivosRapidos = [
  "Almuerzo",
  "Descanso",
  "Cita personal",
  "Capacitación",
  "Vacaciones",
  "Otro",
];

const bloqueoInicial = {
  fecha: "",
  horaInicio: "13:00",
  horaFin: "14:00",
  motivo: "",
};

function ModalDisponibilidad({ abierto, titulo, children, onClose, ancho = "620px" }) {
  if (!abierto) return null;

  return (
    <div className="disp-modal-backdrop">
      <div className="disp-modal" style={{ maxWidth: ancho }}>
        <div className="disp-modal-header">
          <h4>{titulo}</h4>

          <button className="disp-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="disp-modal-body">{children}</div>
      </div>
    </div>
  );
}

function Confirmacion({ abierto, texto, onCancel, onConfirm }) {
  if (!abierto) return null;

  return (
    <ModalDisponibilidad abierto={abierto} titulo="Confirmar acción" onClose={onCancel} ancho="440px">
      <p className="disp-confirm-text">{texto}</p>

      <div className="disp-modal-actions">
        <button type="button" className="btn btn-dark-outline" onClick={onCancel}>
          Cancelar
        </button>

        <button type="button" className="btn disp-danger-btn" onClick={onConfirm}>
          <Trash2 size={16} />
          Eliminar
        </button>
      </div>
    </ModalDisponibilidad>
  );
}

export default function MiDisponibilidad() {
  const [dias, setDias] = useState(
    diasBase.map((d) => ({
      ...d,
      horaInicio: "09:00",
      horaFin: "18:00",
      intervaloMinutos: 60,
      estado: false,
    }))
  );

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [bloqueos, setBloqueos] = useState([]);
  const [bloqueoForm, setBloqueoForm] = useState(bloqueoInicial);
  const [guardandoBloqueo, setGuardandoBloqueo] = useState(false);

  const [modalBloqueo, setModalBloqueo] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [bloqueoEliminar, setBloqueoEliminar] = useState(null);
  const [eliminandoBloqueoId, setEliminandoBloqueoId] = useState(null);

  const leerJsonSeguro = async (res, valorDefecto) => {
    try {
      if (!res || !res.ok) return valorDefecto;
      return await res.json();
    } catch {
      return valorDefecto;
    }
  };

  const obtenerFechaHoy = () => {
    const hoy = new Date();

    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(hoy.getDate()).padStart(2, "0")}`;
  };

  const cargarBloqueos = async () => {
    try {
      const res = await authFetch(`${API_BASE}/Disponibilidad/mis-bloqueos`);
      const data = await leerJsonSeguro(res, []);

      setBloqueos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setBloqueos([]);
    }
  };

  const cargarDisponibilidad = async () => {
    try {
      setError("");

      const res = await authFetch(`${API_BASE}/Disponibilidad/mi-disponibilidad`);
      const data = await leerJsonSeguro(res, []);

      if (!Array.isArray(data)) {
        setError("No se pudo cargar tu horario.");
        return;
      }

      setDias((prev) =>
        prev.map((dia) => {
          const encontrado = data.find((x) => x.diaSemana === dia.diaSemana);

          if (!encontrado) return dia;

          return {
            ...dia,
            horaInicio: encontrado.horaInicio?.substring(0, 5) || "09:00",
            horaFin: encontrado.horaFin?.substring(0, 5) || "18:00",
            intervaloMinutos: encontrado.intervaloMinutos || 60,
            estado: Boolean(encontrado.estado),
          };
        })
      );
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar tu horario.");
    }
  };

  useEffect(() => {
    cargarDisponibilidad();
    cargarBloqueos();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const diasActivos = useMemo(() => dias.filter((d) => d.estado), [dias]);

  const horasSemanales = useMemo(() => {
    return diasActivos.reduce((acc, d) => {
      const inicio = new Date(`2026-01-01T${d.horaInicio}`);
      const fin = new Date(`2026-01-01T${d.horaFin}`);
      const diff = Math.max(0, (fin - inicio) / 1000 / 60 / 60);

      return acc + diff;
    }, 0);
  }, [diasActivos]);

  const proximoBloqueo = useMemo(() => {
    const hoy = obtenerFechaHoy();

    return [...bloqueos]
      .filter((b) => String(b.fecha || "").substring(0, 10) >= hoy)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))[0];
  }, [bloqueos]);

  const actualizarDia = (diaSemana, campo, valor) => {
    setDias((prev) =>
      prev.map((d) =>
        d.diaSemana === diaSemana
          ? {
              ...d,
              [campo]: valor,
            }
          : d
      )
    );
  };

  const activarSemanaLaboral = () => {
    setDias((prev) =>
      prev.map((d) => ({
        ...d,
        estado: d.diaSemana >= 1 && d.diaSemana <= 6,
        horaInicio: d.diaSemana >= 1 && d.diaSemana <= 6 ? "09:00" : d.horaInicio,
        horaFin: d.diaSemana >= 1 && d.diaSemana <= 6 ? "18:00" : d.horaFin,
        intervaloMinutos: d.diaSemana >= 1 && d.diaSemana <= 6 ? 60 : d.intervaloMinutos,
      }))
    );
  };

  const copiarLunesATodos = () => {
    const lunes = dias.find((d) => d.diaSemana === 1);

    if (!lunes) return;

    setDias((prev) =>
      prev.map((d) =>
        d.estado
          ? {
              ...d,
              horaInicio: lunes.horaInicio,
              horaFin: lunes.horaFin,
              intervaloMinutos: lunes.intervaloMinutos,
            }
          : d
      )
    );
  };

  const validarRangos = () => {
    const activos = dias.filter((d) => d.estado);

    if (activos.length === 0) {
      setError("Activa al menos un día de atención.");
      return false;
    }

    const invalido = activos.find((d) => d.horaInicio >= d.horaFin);

    if (invalido) {
      setError(`Revisa el horario de ${invalido.nombre}. La hora final debe ser mayor.`);
      return false;
    }

    return true;
  };

  const guardar = async () => {
    setMensaje("");
    setError("");

    if (!validarRangos()) return;

    try {
      setGuardando(true);

      const body = dias
        .filter((d) => d.estado)
        .map((d) => ({
          diaSemana: d.diaSemana,
          horaInicio: `${d.horaInicio}:00`,
          horaFin: `${d.horaFin}:00`,
          intervaloMinutos: Number(d.intervaloMinutos),
          estado: true,
        }));

      const res = await authFetch(`${API_BASE}/Disponibilidad/guardar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await leerJsonSeguro(res, {});

      if (!res || !res.ok) {
        setError(data.mensaje || "No se pudo guardar tu horario.");
        return;
      }

      setMensaje(data.mensaje || "Horario actualizado correctamente.");
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar tu horario.");
    } finally {
      setGuardando(false);
    }
  };

  const abrirBloqueo = () => {
    setMensaje("");
    setError("");

    setBloqueoForm({
      ...bloqueoInicial,
      fecha: obtenerFechaHoy(),
    });

    setModalBloqueo(true);
  };

  const cerrarBloqueo = () => {
    setModalBloqueo(false);
    setBloqueoForm(bloqueoInicial);
  };

  const bloquearHorario = async () => {
    setMensaje("");
    setError("");

    if (!bloqueoForm.fecha || !bloqueoForm.horaInicio || !bloqueoForm.horaFin) {
      setError("Completa la fecha y el horario del bloqueo.");
      return;
    }

    if (bloqueoForm.horaInicio >= bloqueoForm.horaFin) {
      setError("La hora final del bloqueo debe ser mayor.");
      return;
    }

    try {
      setGuardandoBloqueo(true);

      const res = await authFetch(`${API_BASE}/Disponibilidad/bloquear-horario`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fecha: bloqueoForm.fecha,
          horaInicio: `${bloqueoForm.horaInicio}:00`,
          horaFin: `${bloqueoForm.horaFin}:00`,
          motivo: bloqueoForm.motivo,
        }),
      });

      const data = await leerJsonSeguro(res, {});

      if (!res || !res.ok) {
        setError(data.mensaje || "No se pudo registrar el bloqueo.");
        return;
      }

      setMensaje(data.mensaje || "Bloqueo registrado correctamente.");
      cerrarBloqueo();
      cargarBloqueos();
    } catch (err) {
      console.error(err);
      setError("No se pudo registrar el bloqueo.");
    } finally {
      setGuardandoBloqueo(false);
    }
  };

  const abrirEliminarBloqueo = (bloqueo) => {
    setBloqueoEliminar(bloqueo);
    setModalEliminar(true);
  };

  const cerrarEliminarBloqueo = () => {
    setBloqueoEliminar(null);
    setModalEliminar(false);
  };

  const eliminarBloqueo = async () => {
    if (!bloqueoEliminar) return;

    try {
      setEliminandoBloqueoId(bloqueoEliminar.idBloqueo);

      const res = await authFetch(
        `${API_BASE}/Disponibilidad/eliminar-bloqueo/${bloqueoEliminar.idBloqueo}`,
        {
          method: "PATCH",
        }
      );

      if (!res || !res.ok) {
        setError("No se pudo eliminar el bloqueo.");
        return;
      }

      setMensaje("Bloqueo eliminado correctamente.");
      cerrarEliminarBloqueo();
      cargarBloqueos();
    } catch (err) {
      console.error(err);
      setError("No se pudo eliminar el bloqueo.");
    } finally {
      setEliminandoBloqueoId(null);
    }
  };

  return (
    <div className="page-shell disp-page">
      <div className="container-fluid py-4">
        <CardDark className="disp-header-card mb-4">
          <div className="disp-header-row">
            <PageHeader
              title="Mi disponibilidad"
              subtitle="Define cuándo pueden reservar contigo y bloquea horarios puntuales."
            />

            <div className="disp-header-actions">
              <GoldBadge>{diasActivos.length} días activos</GoldBadge>
              <GoldBadge>{bloqueos.length} bloqueos</GoldBadge>

              <button type="button" className="btn btn-gold" onClick={abrirBloqueo}>
                <Plus size={16} />
                Bloquear horario
              </button>
            </div>
          </div>
        </CardDark>

        <section className="disp-kpi-grid mb-4">
          <CardDark className="disp-kpi-card gold">
            <div className="disp-kpi-icon">
              <Clock size={22} />
            </div>
            <p>Días activos</p>
            <h2>{diasActivos.length}</h2>
            <span>Días disponibles para reservas</span>
          </CardDark>

          <CardDark className="disp-kpi-card success">
            <div className="disp-kpi-icon">
              <CheckCircle2 size={22} />
            </div>
            <p>Horas semanales</p>
            <h2>{horasSemanales.toFixed(0)}</h2>
            <span>Horas aproximadas de atención</span>
          </CardDark>

          <CardDark className="disp-kpi-card info">
            <div className="disp-kpi-icon">
              <CalendarOff size={22} />
            </div>
            <p>Bloqueos</p>
            <h2>{bloqueos.length}</h2>
            <span>Pausas registradas</span>
          </CardDark>

          <CardDark className="disp-kpi-card purple">
            <div className="disp-kpi-icon">
              <Coffee size={22} />
            </div>
            <p>Próxima pausa</p>
            <h2>{proximoBloqueo ? proximoBloqueo.fecha?.substring(5, 10) : "—"}</h2>
            <span>{proximoBloqueo?.motivo || "Sin pausa próxima"}</span>
          </CardDark>
        </section>

        <CardDark className="disp-section-card mb-4">
          <div className="disp-section-head">
            <div>
              <h4 className="section-title">Horario semanal</h4>
              <p className="section-subtitle">
                Activa los días que atiendes y ajusta tus horas.
              </p>
            </div>

            <div className="disp-actions-group">
              <button type="button" className="btn btn-dark-outline" onClick={activarSemanaLaboral}>
                Lun - Sáb
              </button>

              <button type="button" className="btn btn-dark-outline" onClick={copiarLunesATodos}>
                Copiar lunes
              </button>
            </div>
          </div>

          <div className="disp-days-grid">
            {dias.map((d) => (
              <div className={`disp-day-card ${d.estado ? "active" : ""}`} key={d.diaSemana}>
                <div className="disp-day-top">
                  <div className="disp-day-badge">{d.corto}</div>

                  <div>
                    <h5>{d.nombre}</h5>
                    <span>{d.estado ? "Disponible" : "No atiendo"}</span>
                  </div>

                  <label className="disp-switch">
                    <input
                      type="checkbox"
                      checked={d.estado}
                      onChange={(e) => actualizarDia(d.diaSemana, "estado", e.target.checked)}
                    />
                    <span />
                  </label>
                </div>

                <div className="disp-day-form">
                  <div>
                    <label>Inicio</label>
                    <input
                      type="time"
                      className="form-control input-dark"
                      value={d.horaInicio}
                      disabled={!d.estado}
                      onChange={(e) => actualizarDia(d.diaSemana, "horaInicio", e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Fin</label>
                    <input
                      type="time"
                      className="form-control input-dark"
                      value={d.horaFin}
                      disabled={!d.estado}
                      onChange={(e) => actualizarDia(d.diaSemana, "horaFin", e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Cada</label>
                    <select
                      className="form-control input-dark"
                      value={d.intervaloMinutos}
                      disabled={!d.estado}
                      onChange={(e) =>
                        actualizarDia(d.diaSemana, "intervaloMinutos", e.target.value)
                      }
                    >
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="btn btn-gold w-100 mt-4" onClick={guardar} disabled={guardando}>
            <Save size={16} />
            {guardando ? "Guardando..." : "Guardar disponibilidad"}
          </button>
        </CardDark>

        <CardDark className="disp-section-card">
          <div className="disp-section-head">
            <div>
              <h4 className="section-title">Bloqueos puntuales</h4>
              <p className="section-subtitle">
                Usa bloqueos para almuerzo, descansos, citas personales o vacaciones.
              </p>
            </div>

            <button type="button" className="btn btn-gold" onClick={abrirBloqueo}>
              <Plus size={16} />
              Nuevo bloqueo
            </button>
          </div>

          {bloqueos.length > 0 ? (
            <div className="disp-blocks-carousel">
              {bloqueos.map((b) => (
                <div className="disp-block-card" key={b.idBloqueo}>
                  <div className="disp-block-icon">
                    <CalendarOff size={22} />
                  </div>

                  <div className="disp-block-info">
                    <h5>{b.motivo || "Bloqueo"}</h5>
                    <span>{b.fecha?.substring(0, 10)}</span>
                    <p>
                      {b.horaInicio?.substring(0, 5)} - {b.horaFin?.substring(0, 5)}
                    </p>
                  </div>

                  <button
                    className="btn disp-danger-btn w-100"
                    onClick={() => abrirEliminarBloqueo(b)}
                    disabled={eliminandoBloqueoId === b.idBloqueo}
                  >
                    <Trash2 size={16} />
                    {eliminandoBloqueoId === b.idBloqueo ? "Eliminando..." : "Eliminar"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="disp-empty">
              <CalendarOff size={36} />
              <h5>Sin bloqueos activos</h5>
              <p>Cuando necesites pausar reservas, crea un bloqueo puntual.</p>
            </div>
          )}
        </CardDark>

        <ModalDisponibilidad
          abierto={modalBloqueo}
          titulo="Bloquear horario"
          onClose={cerrarBloqueo}
        >
          <div className="disp-modal-intro">
            <CalendarOff size={22} />
            <div>
              <h5>Pausa puntual</h5>
              <p>Este horario no estará disponible para reservas.</p>
            </div>
          </div>

          <div className="disp-reason-group">
            {motivosRapidos.map((motivo) => (
              <button
                type="button"
                key={motivo}
                className={`disp-reason-chip ${bloqueoForm.motivo === motivo ? "selected" : ""}`}
                onClick={() => setBloqueoForm({ ...bloqueoForm, motivo })}
              >
                {motivo}
              </button>
            ))}
          </div>

          <div className="row g-3 mt-1">
            <div className="col-md-4">
              <label className="label-gold">Fecha</label>
              <input
                type="date"
                className="form-control input-dark"
                value={bloqueoForm.fecha}
                onChange={(e) =>
                  setBloqueoForm({
                    ...bloqueoForm,
                    fecha: e.target.value,
                  })
                }
              />
            </div>

            <div className="col-md-4">
              <label className="label-gold">Inicio</label>
              <input
                type="time"
                className="form-control input-dark"
                value={bloqueoForm.horaInicio}
                onChange={(e) =>
                  setBloqueoForm({
                    ...bloqueoForm,
                    horaInicio: e.target.value,
                  })
                }
              />
            </div>

            <div className="col-md-4">
              <label className="label-gold">Fin</label>
              <input
                type="time"
                className="form-control input-dark"
                value={bloqueoForm.horaFin}
                onChange={(e) =>
                  setBloqueoForm({
                    ...bloqueoForm,
                    horaFin: e.target.value,
                  })
                }
              />
            </div>

            <div className="col-12">
              <label className="label-gold">Motivo</label>
              <input
                className="form-control input-dark"
                value={bloqueoForm.motivo}
                maxLength={120}
                placeholder="Ej: Almuerzo"
                onChange={(e) =>
                  setBloqueoForm({
                    ...bloqueoForm,
                    motivo: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="disp-modal-actions">
            <button className="btn btn-dark-outline" onClick={cerrarBloqueo}>
              Cancelar
            </button>

            <button className="btn btn-gold" onClick={bloquearHorario} disabled={guardandoBloqueo}>
              <Plus size={16} />
              {guardandoBloqueo ? "Guardando..." : "Guardar bloqueo"}
            </button>
          </div>
        </ModalDisponibilidad>

        <Confirmacion
          abierto={modalEliminar}
          texto={`¿Eliminar el bloqueo "${bloqueoEliminar?.motivo || "Bloqueo"}"?`}
          onCancel={cerrarEliminarBloqueo}
          onConfirm={eliminarBloqueo}
        />

        <Toast
          mensaje={mensaje || error}
          tipo={error ? "error" : "success"}
          onClose={() => {
            setMensaje("");
            setError("");
          }}
        />
      </div>
    </div>
  );
}
