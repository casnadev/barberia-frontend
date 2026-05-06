import { useEffect, useState } from "react";
import API_BASE from "../../services/api";
import authFetch from "../../services/authFetch";
import PageHeader from "../../components/ui/PageHeader";
import CardDark from "../../components/ui/CardDark";
import GoldBadge from "../../components/ui/GoldBadge";
import Toast from "../../components/ui/Toast";
import { Plus, Pencil, Power, X, Building2, Users, Crown, Clock } from "lucide-react";

function ModalSA({ abierto, titulo, children, onClose, ancho = "760px" }) {
  if (!abierto) return null;

  return (
    <div className="sa-modal-backdrop">
      <div className="sa-modal" style={{ maxWidth: ancho }}>
        <div className="sa-modal-header">
          <h4>{titulo}</h4>
          <button className="sa-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="sa-modal-body">{children}</div>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [resumen, setResumen] = useState(null);
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("success");

  const [modalCrear, setModalCrear] = useState(false);
  const [modalPlan, setModalPlan] = useState(false);
  const [negocioSeleccionado, setNegocioSeleccionado] = useState(null);

  const [creando, setCreando] = useState(false);
  const [guardandoPlan, setGuardandoPlan] = useState(false);

  const [formCrear, setFormCrear] = useState({
    nombreNegocio: "",
    telefono: "",
    direccion: "",
    whatsappNegocio: "",
    nombreAdmin: "",
    correoAdmin: "",
    planNombre: "Demo",
    limiteTrabajadores: "1",
    esDemo: true,
    diasDemo: 7,
  });

  const [formPlan, setFormPlan] = useState({
    planNombre: "Demo",
    limiteTrabajadores: "1",
    esDemo: true,
    diasDemo: 7,
  });

  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

  const cargarDatos = async () => {
    try {
      setLoading(true);

      const [resDashboard, resNegocios] = await Promise.all([
        authFetch(`${API_BASE}/SuperAdmin/dashboard`),
        authFetch(`${API_BASE}/SuperAdmin/negocios`),
      ]);

      if (!resDashboard || !resNegocios) return;

      const dataDashboard = await resDashboard.json();
      const dataNegocios = await resNegocios.json();

      if (!resDashboard.ok) {
        setTipoMensaje("error");
        setMensaje(dataDashboard.mensaje || "No se pudo cargar el resumen.");
        return;
      }

      if (!resNegocios.ok) {
        setTipoMensaje("error");
        setMensaje(dataNegocios.mensaje || "No se pudo cargar negocios.");
        return;
      }

      setResumen(dataDashboard);
      setNegocios(dataNegocios || []);
    } catch (error) {
      console.error(error);
      setTipoMensaje("error");
      setMensaje("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cambiarCampoCrear = (campo, valor) => {
    setFormCrear((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const cambiarCampoPlan = (campo, valor) => {
    setFormPlan((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const normalizarLimite = (valor) => {
    if (valor === "infinito") return null;
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
  };

  const limpiarCrear = () => {
    setFormCrear({
      nombreNegocio: "",
      telefono: "",
      direccion: "",
      whatsappNegocio: "",
      nombreAdmin: "",
      correoAdmin: "",
      planNombre: "Demo",
      limiteTrabajadores: "1",
      esDemo: true,
      diasDemo: 7,
    });
  };

  const crearNegocio = async () => {
    setMensaje("");

    if (!formCrear.nombreNegocio.trim()) {
      setTipoMensaje("error");
      setMensaje("El nombre del negocio es obligatorio.");
      return;
    }

    if (!formCrear.nombreAdmin.trim()) {
      setTipoMensaje("error");
      setMensaje("El nombre del administrador es obligatorio.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formCrear.correoAdmin.trim())) {
      setTipoMensaje("error");
      setMensaje("Ingresa un correo válido para el administrador.");
      return;
    }

    try {
      setCreando(true);

      const res = await authFetch(`${API_BASE}/SuperAdmin/crear-negocio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formCrear,
          nombreNegocio: formCrear.nombreNegocio.trim(),
          telefono: formCrear.telefono.trim(),
          direccion: formCrear.direccion.trim(),
          whatsappNegocio: formCrear.whatsappNegocio.trim(),
          nombreAdmin: formCrear.nombreAdmin.trim(),
          correoAdmin: formCrear.correoAdmin.trim().toLowerCase(),
          limiteTrabajadores: normalizarLimite(formCrear.limiteTrabajadores),
          diasDemo: Number(formCrear.diasDemo || 7),
        }),
      });

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setMensaje(data.mensaje || "No se pudo crear el negocio.");
        return;
      }

      setTipoMensaje("success");
      setMensaje(data.mensaje || "Negocio creado correctamente.");
      setModalCrear(false);
      limpiarCrear();
      await cargarDatos();
    } catch (error) {
      console.error(error);
      setTipoMensaje("error");
      setMensaje("Error al crear negocio.");
    } finally {
      setCreando(false);
    }
  };

  const abrirEditarPlan = (negocio) => {
    setNegocioSeleccionado(negocio);
    setFormPlan({
      planNombre: negocio.planNombre || "Demo",
      limiteTrabajadores:
        negocio.limiteTrabajadores === null || negocio.limiteTrabajadores === undefined
          ? "infinito"
          : String(negocio.limiteTrabajadores),
      esDemo: !!negocio.esDemo,
      diasDemo: 7,
    });
    setModalPlan(true);
  };

  const actualizarPlan = async () => {
    if (!negocioSeleccionado) return;

    try {
      setGuardandoPlan(true);

      const res = await authFetch(
        `${API_BASE}/SuperAdmin/actualizar-plan/${negocioSeleccionado.idNegocio}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planNombre: formPlan.planNombre,
            limiteTrabajadores: normalizarLimite(formPlan.limiteTrabajadores),
            esDemo: formPlan.esDemo,
            diasDemo: Number(formPlan.diasDemo || 7),
          }),
        }
      );

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setMensaje(data.mensaje || "No se pudo actualizar el plan.");
        return;
      }

      setTipoMensaje("success");
      setMensaje(data.mensaje || "Plan actualizado correctamente.");
      setModalPlan(false);
      setNegocioSeleccionado(null);
      await cargarDatos();
    } catch (error) {
      console.error(error);
      setTipoMensaje("error");
      setMensaje("Error al actualizar plan.");
    } finally {
      setGuardandoPlan(false);
    }
  };

  const cambiarEstado = async (idNegocio) => {
    try {
      const res = await authFetch(
        `${API_BASE}/SuperAdmin/cambiar-estado-negocio/${idNegocio}`,
        {
          method: "PATCH",
        }
      );

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setMensaje(data.mensaje || "No se pudo cambiar el estado.");
        return;
      }

      setTipoMensaje("success");
      setMensaje(data.mensaje || "Estado actualizado.");
      cargarDatos();
    } catch (error) {
      console.error(error);
      setTipoMensaje("error");
      setMensaje("Error al cambiar estado.");
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "/login";
  };

  return (
    <div className="page-shell">
      <div className="container-fluid py-4">
        <PageHeader
          title="Panel SuperAdmin"
          subtitle={`Gestión global de Barber.pe • ${usuario.nombre || ""}`}
        />

        <div className="d-flex justify-content-end mb-3 gap-2 flex-wrap">
          <button className="btn btn-gold" onClick={() => setModalCrear(true)}>
            <Plus size={17} />
            Crear negocio
          </button>

          <button className="btn btn-dark-outline" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>

        {loading ? (
          <CardDark>
            <p className="text-center mb-0">Cargando panel...</p>
          </CardDark>
        ) : (
          <>
            <div className="sa-resumen-grid mb-4">
              <div className="sa-card">
                <Building2 size={24} />
                <span>Total negocios</span>
                <h2>{resumen?.totalNegocios ?? 0}</h2>
              </div>

              <div className="sa-card">
                <Power size={24} />
                <span>Activos</span>
                <h2>{resumen?.activos ?? 0}</h2>
              </div>

              <div className="sa-card">
                <Clock size={24} />
                <span>Demos</span>
                <h2>{resumen?.demos ?? 0}</h2>
              </div>

              <div className="sa-card">
                <Users size={24} />
                <span>Trabajadores</span>
                <h2>{resumen?.totalTrabajadores ?? 0}</h2>
              </div>
            </div>

            <div className="sa-plans-carousel mb-4">
              <div className="sa-plan-card">
                <small>Plan 1</small>
                <h4>Starter</h4>
                <p>Para negocios pequeños con un solo profesional.</p>
              </div>

              <div className="sa-plan-card">
                <small>Plan 5</small>
                <h4>Growth</h4>
                <p>Ideal para barberías en crecimiento.</p>
              </div>

              <div className="sa-plan-card">
                <small>Plan 10</small>
                <h4>Pro</h4>
                <p>Para equipos con operación diaria intensa.</p>
              </div>

              <div className="sa-plan-card">
                <small>∞</small>
                <h4>Enterprise</h4>
                <p>Para marcas grandes o multi-equipo.</p>
              </div>
            </div>

            <CardDark>
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div>
                  <h3 className="section-title mb-1">Negocios registrados</h3>
                  <p className="section-subtitle mb-0">
                    Control de planes, demos, límites y estados.
                  </p>
                </div>
              </div>

              <div className="sa-business-grid">
                {negocios.length > 0 ? (
                  negocios.map((n) => (
                    <div className="sa-business-card" key={n.idNegocio}>
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                        <div>
                          <h5 title={n.nombre}>{n.nombre}</h5>
                          <p>{n.telefono || "Sin teléfono"}</p>
                        </div>

                        <span
                          className={n.estado ? "badge bg-success" : "badge bg-danger"}
                        >
                          {n.estado ? "Activo" : "Suspendido"}
                        </span>
                      </div>

                      <div className="modal-success-details mb-3">
                        <div className="modal-info-row">
                          <span>Plan</span>
                          <b>{n.planNombre || "Sin plan"}</b>
                        </div>

                        <div className="modal-info-row">
                          <span>Trabajadores</span>
                          <b>
                            {n.totalTrabajadores} / {n.limiteTrabajadores ?? "∞"}
                          </b>
                        </div>

                        <div className="modal-info-row">
                          <span>Suscripción</span>
                          <b>{n.estadoSuscripcion || "No definida"}</b>
                        </div>

                        <div className="modal-info-row">
                          <span>Demo</span>
                          <b>{n.esDemo ? "Sí" : "No"}</b>
                        </div>
                      </div>

                      <div className="sa-slug">
                        <code>{n.slug || "sin-slug"}</code>
                      </div>

                      <div className="actions-grid mt-3">
                        <button
                          className="btn-action-dark"
                          onClick={() => abrirEditarPlan(n)}
                        >
                          <Pencil size={16} />
                          <span>Plan</span>
                        </button>

                        <button
                          className={n.estado ? "btn-action-danger" : "btn-action-dark"}
                          onClick={() => cambiarEstado(n.idNegocio)}
                        >
                          <Power size={16} />
                          <span>{n.estado ? "Suspender" : "Activar"}</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center section-subtitle py-4">
                    No hay negocios registrados.
                  </p>
                )}
              </div>
            </CardDark>
          </>
        )}

        <ModalSA
          abierto={modalCrear}
          titulo="Crear nuevo negocio"
          onClose={() => setModalCrear(false)}
          ancho="860px"
        >
          <div className="row g-3">
            <div className="col-md-6">
              <label className="label-gold">Nombre del negocio</label>
              <input
                className="form-control input-dark"
                value={formCrear.nombreNegocio}
                onChange={(e) => cambiarCampoCrear("nombreNegocio", e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <label className="label-gold">Teléfono</label>
              <input
                className="form-control input-dark"
                value={formCrear.telefono}
                onChange={(e) => cambiarCampoCrear("telefono", e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <label className="label-gold">WhatsApp</label>
              <input
                className="form-control input-dark"
                value={formCrear.whatsappNegocio}
                onChange={(e) =>
                  cambiarCampoCrear("whatsappNegocio", e.target.value)
                }
              />
            </div>

            <div className="col-12">
              <label className="label-gold">Dirección</label>
              <input
                className="form-control input-dark"
                value={formCrear.direccion}
                onChange={(e) => cambiarCampoCrear("direccion", e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="label-gold">Nombre del Admin</label>
              <input
                className="form-control input-dark"
                value={formCrear.nombreAdmin}
                onChange={(e) => cambiarCampoCrear("nombreAdmin", e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="label-gold">Correo del Admin</label>
              <input
                className="form-control input-dark"
                value={formCrear.correoAdmin}
                onChange={(e) => cambiarCampoCrear("correoAdmin", e.target.value)}
                placeholder="admin@negocio.com"
              />
            </div>

            <div className="col-md-4">
              <label className="label-gold">Plan</label>
              <select
                className="form-control input-dark"
                value={formCrear.planNombre}
                onChange={(e) => cambiarCampoCrear("planNombre", e.target.value)}
              >
                <option value="Demo">Demo</option>
                <option value="Starter">Starter</option>
                <option value="Growth">Growth</option>
                <option value="Pro">Pro</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="label-gold">Límite trabajadores</label>
              <select
                className="form-control input-dark"
                value={formCrear.limiteTrabajadores}
                onChange={(e) =>
                  cambiarCampoCrear("limiteTrabajadores", e.target.value)
                }
              >
                <option value="1">1 trabajador</option>
                <option value="5">5 trabajadores</option>
                <option value="10">10 trabajadores</option>
                <option value="infinito">Ilimitado</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="label-gold">Días demo</label>
              <input
                type="number"
                className="form-control input-dark"
                value={formCrear.diasDemo}
                onChange={(e) => cambiarCampoCrear("diasDemo", e.target.value)}
              />
            </div>

            <div className="col-12">
              <div className="form-check form-switch">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={formCrear.esDemo}
                  onChange={(e) => cambiarCampoCrear("esDemo", e.target.checked)}
                  id="crearDemo"
                />

                <label
                  className="form-check-label fw-bold"
                  htmlFor="crearDemo"
                  style={{ color: "#c9a227" }}
                >
                  Crear como demo
                </label>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 flex-wrap">
            <button className="btn btn-dark-outline" onClick={() => setModalCrear(false)}>
              Cancelar
            </button>

            <button className="btn btn-gold" onClick={crearNegocio} disabled={creando}>
              {creando ? "Creando..." : "Crear negocio"}
            </button>
          </div>
        </ModalSA>

        <ModalSA
          abierto={modalPlan}
          titulo={`Editar plan: ${negocioSeleccionado?.nombre || ""}`}
          onClose={() => setModalPlan(false)}
          ancho="620px"
        >
          <div className="row g-3">
            <div className="col-md-6">
              <label className="label-gold">Plan</label>
              <select
                className="form-control input-dark"
                value={formPlan.planNombre}
                onChange={(e) => cambiarCampoPlan("planNombre", e.target.value)}
              >
                <option value="Demo">Demo</option>
                <option value="Starter">Starter</option>
                <option value="Growth">Growth</option>
                <option value="Pro">Pro</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="label-gold">Límite trabajadores</label>
              <select
                className="form-control input-dark"
                value={formPlan.limiteTrabajadores}
                onChange={(e) => cambiarCampoPlan("limiteTrabajadores", e.target.value)}
              >
                <option value="1">1 trabajador</option>
                <option value="5">5 trabajadores</option>
                <option value="10">10 trabajadores</option>
                <option value="infinito">Ilimitado</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="label-gold">Días demo</label>
              <input
                type="number"
                className="form-control input-dark"
                value={formPlan.diasDemo}
                onChange={(e) => cambiarCampoPlan("diasDemo", e.target.value)}
              />
            </div>

            <div className="col-md-6 d-flex align-items-end">
              <div className="form-check form-switch mb-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={formPlan.esDemo}
                  onChange={(e) => cambiarCampoPlan("esDemo", e.target.checked)}
                  id="editarDemo"
                />

                <label
                  className="form-check-label fw-bold"
                  htmlFor="editarDemo"
                  style={{ color: "#c9a227" }}
                >
                  Mantener como demo
                </label>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 flex-wrap">
            <button className="btn btn-dark-outline" onClick={() => setModalPlan(false)}>
              Cancelar
            </button>

            <button
              className="btn btn-gold"
              onClick={actualizarPlan}
              disabled={guardandoPlan}
            >
              {guardandoPlan ? "Guardando..." : "Guardar plan"}
            </button>
          </div>
        </ModalSA>

        <style>{`
          .sa-resumen-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }

          .sa-card {
            background: linear-gradient(135deg, #fffdf5, #f3e7bd);
            border: 1px solid rgba(212, 175, 55, 0.35);
            border-radius: 24px;
            padding: 22px;
            box-shadow: 0 12px 32px rgba(0,0,0,.08);
          }

          .sa-card svg {
            color: #c9a227;
            margin-bottom: 10px;
          }

          .sa-card span {
            color: #8b6f10;
            font-weight: 900;
            font-size: .88rem;
          }

          .sa-card h2 {
            color: #111827;
            font-weight: 950;
            margin: 8px 0 0;
          }

          .sa-plans-carousel {
            display: flex;
            gap: 14px;
            overflow-x: auto;
            padding-bottom: 8px;
          }

          .sa-plan-card {
            min-width: 245px;
            border-radius: 22px;
            padding: 20px;
            background: #111;
            border: 1px solid rgba(212,175,55,.35);
            box-shadow: 0 14px 35px rgba(0,0,0,.16);
          }

          .sa-plan-card small {
            color: #d4af37;
            font-weight: 900;
          }

          .sa-plan-card h4 {
            color: #fff;
            margin: 6px 0;
            font-weight: 950;
          }

          .sa-plan-card p {
            color: #cfcfcf;
            margin: 0;
            font-size: .9rem;
          }

          .sa-business-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
          }

          .sa-business-card {
            background: #fffdf5;
            border: 1px solid rgba(212, 175, 55, .28);
            border-radius: 24px;
            padding: 20px;
            box-shadow: 0 14px 35px rgba(0,0,0,.07);
          }

          .sa-business-card h5 {
            color: #111827;
            font-weight: 950;
            margin-bottom: 5px;
          }

          .sa-business-card p {
            color: #6b7280;
            margin: 0;
            font-weight: 700;
            font-size: .9rem;
          }

          .sa-slug {
            background: #111;
            border-radius: 14px;
            padding: 10px 12px;
          }

          .sa-slug code {
            color: #d4af37;
            font-weight: 800;
          }

          .sa-modal-backdrop {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: rgba(0,0,0,.68);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 18px;
          }

          .sa-modal {
            width: 100%;
            max-height: 92vh;
            overflow-y: auto;
            border-radius: 24px;
            background: #fffdf5;
            border: 1px solid rgba(212,175,55,.35);
            box-shadow: 0 26px 80px rgba(0,0,0,.45);
          }

          .sa-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 22px;
            border-bottom: 1px solid rgba(212,175,55,.22);
            background: #fff8e1;
          }

          .sa-modal-header h4 {
            color: #111827;
            font-weight: 950;
            margin: 0;
          }

          .sa-modal-body {
            padding: 22px;
          }

          .sa-modal-close {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: 1px solid rgba(212,175,55,.35);
            background: #111;
            color: #d4af37;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          @media (max-width: 992px) {
            .sa-resumen-grid {
              grid-template-columns: repeat(2, 1fr);
            }

            .sa-business-grid {
              display: flex;
              overflow-x: auto;
              scroll-snap-type: x mandatory;
              gap: 14px;
              padding-bottom: 12px;
            }

            .sa-business-card {
              min-width: 86%;
              scroll-snap-align: start;
            }
          }

          @media (max-width: 576px) {
            .sa-resumen-grid {
              grid-template-columns: 1fr;
            }

            .sa-business-card {
              min-width: 92%;
            }

            .sa-modal-backdrop {
              padding: 10px;
              align-items: flex-end;
            }

            .sa-modal {
              border-radius: 22px 22px 0 0;
              max-height: 92vh;
            }

            .btn-gold,
            .btn-dark-outline {
              width: 100%;
            }
          }
        `}</style>
      </div>

      <Toast
        mensaje={mensaje}
        tipo={tipoMensaje}
        onClose={() => setMensaje("")}
      />
    </div>
  );
}