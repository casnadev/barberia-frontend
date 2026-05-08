import { useEffect, useMemo, useState } from "react";
import API_BASE from "../../services/api";
import authFetch from "../../services/authFetch";

import PageHeader from "../../components/ui/PageHeader";
import CardDark from "../../components/ui/CardDark";
import GoldBadge from "../../components/ui/GoldBadge";
import Toast from "../../components/ui/Toast";
import AnimatedNumber from "../../components/ui/AnimatedNumber";

import {
  Building2,
  CheckCircle2,
  Clock,
  Crown,
  Pencil,
  Plus,
  Power,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

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

const formCrearInicial = {
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
};

const formPlanInicial = {
  planNombre: "Demo",
  limiteTrabajadores: "1",
  esDemo: true,
  diasDemo: 7,
};

const PLANES = [
  {
    limite: "1",
    nombre: "Starter",
    descripcion: "Para un negocio pequeño o profesional independiente.",
    icono: "1",
  },
  {
    limite: "5",
    nombre: "Growth",
    descripcion: "Para barberías con equipo pequeño en crecimiento.",
    icono: "5",
  },
  {
    limite: "10",
    nombre: "Pro",
    descripcion: "Para locales con operación diaria más intensa.",
    icono: "10",
  },
  {
    limite: "infinito",
    nombre: "Enterprise",
    descripcion: "Para marcas grandes o equipos sin límite.",
    icono: "∞",
  },
];

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
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null);

  const [formCrear, setFormCrear] = useState(formCrearInicial);
  const [formPlan, setFormPlan] = useState(formPlanInicial);

  const usuario = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("usuario") || "{}");
    } catch {
      return {};
    }
  }, []);

  const leerJsonSeguro = async (res, valorDefecto) => {
    try {
      if (!res) return valorDefecto;
      return await res.json();
    } catch {
      return valorDefecto;
    }
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);

      const [resDashboard, resNegocios] = await Promise.all([
        authFetch(`${API_BASE}/SuperAdmin/dashboard`),
        authFetch(`${API_BASE}/SuperAdmin/negocios`),
      ]);

      if (!resDashboard || !resNegocios) return;

      const dataDashboard = await leerJsonSeguro(resDashboard, {});
      const dataNegocios = await leerJsonSeguro(resNegocios, []);

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
      setNegocios(Array.isArray(dataNegocios) ? dataNegocios : []);
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiarCampoCrear = (campo, valor) => {
    setFormCrear((prev) => ({ ...prev, [campo]: valor }));
  };

  const cambiarCampoPlan = (campo, valor) => {
    setFormPlan((prev) => ({ ...prev, [campo]: valor }));
  };

  const normalizarLimite = (valor) => {
    if (valor === "infinito") return null;
    const numero = Number(valor);
    return Number.isFinite(numero) && numero > 0 ? numero : null;
  };

  const normalizarTexto = (valor) => String(valor || "").trim();

  const limpiarCrear = () => {
    setFormCrear(formCrearInicial);
  };

  const validarCorreo = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

  const crearNegocio = async () => {
    setMensaje("");

    const nombreNegocio = normalizarTexto(formCrear.nombreNegocio);
    const nombreAdmin = normalizarTexto(formCrear.nombreAdmin);
    const correoAdmin = normalizarTexto(formCrear.correoAdmin).toLowerCase();

    if (!nombreNegocio) {
      setTipoMensaje("error");
      setMensaje("El nombre del negocio es obligatorio.");
      return;
    }

    if (!nombreAdmin) {
      setTipoMensaje("error");
      setMensaje("El nombre del administrador es obligatorio.");
      return;
    }

    if (!validarCorreo(correoAdmin)) {
      setTipoMensaje("error");
      setMensaje("Ingresa un correo válido para el administrador.");
      return;
    }

    try {
      setCreando(true);

      const res = await authFetch(`${API_BASE}/SuperAdmin/crear-negocio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formCrear,
          nombreNegocio,
          telefono: normalizarTexto(formCrear.telefono),
          direccion: normalizarTexto(formCrear.direccion),
          whatsappNegocio: normalizarTexto(formCrear.whatsappNegocio),
          nombreAdmin,
          correoAdmin,
          limiteTrabajadores: normalizarLimite(formCrear.limiteTrabajadores),
          diasDemo: Number(formCrear.diasDemo || 7),
        }),
      });

      if (!res) return;

      const data = await leerJsonSeguro(res, {});

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

  const abrirCrearNegocio = () => {
    limpiarCrear();
    setMensaje("");
    setModalCrear(true);
  };

  const abrirEditarPlan = (negocio) => {
    setNegocioSeleccionado(negocio);
    setMensaje("");

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planNombre: formPlan.planNombre,
            limiteTrabajadores: normalizarLimite(formPlan.limiteTrabajadores),
            esDemo: formPlan.esDemo,
            diasDemo: Number(formPlan.diasDemo || 7),
          }),
        }
      );

      if (!res) return;

      const data = await leerJsonSeguro(res, {});

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
      setCambiandoEstadoId(idNegocio);

      const res = await authFetch(
        `${API_BASE}/SuperAdmin/cambiar-estado-negocio/${idNegocio}`,
        { method: "PATCH" }
      );

      if (!res) return;

      const data = await leerJsonSeguro(res, {});

      if (!res.ok) {
        setTipoMensaje("error");
        setMensaje(data.mensaje || "No se pudo cambiar el estado.");
        return;
      }

      setTipoMensaje("success");
      setMensaje(data.mensaje || "Estado actualizado.");
      await cargarDatos();
    } catch (error) {
      console.error(error);
      setTipoMensaje("error");
      setMensaje("Error al cambiar estado.");
    } finally {
      setCambiandoEstadoId(null);
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "/login";
  };

  const resumenCards = [
    { label: "Total negocios", value: resumen?.totalNegocios ?? 0, icon: Building2, variant: "gold" },
    { label: "Activos", value: resumen?.activos ?? 0, icon: Power, variant: "success" },
    { label: "Demos", value: resumen?.demos ?? 0, icon: Clock, variant: "info" },
    { label: "Trabajadores", value: resumen?.totalTrabajadores ?? 0, icon: Users, variant: "purple" },
  ];

  const negociosActivos = negocios.filter((n) => n.estado).length;
  const negociosSuspendidos = negocios.filter((n) => !n.estado).length;

  return (
    <div className="page-shell superadmin-page">
      <div className="container-fluid py-4">
        <CardDark className="superadmin-header-card mb-4">
          <div className="superadmin-header-row">
            <PageHeader
              title="Panel SuperAdmin"
              subtitle={`Control global de negocios, planes y accesos. ${usuario.nombre || ""}`}
            />

            <div className="superadmin-header-actions">
              <GoldBadge>{negociosActivos} activos</GoldBadge>
              <GoldBadge>{negociosSuspendidos} suspendidos</GoldBadge>

              <button className="btn btn-gold" onClick={abrirCrearNegocio}>
                <Plus size={17} />
                Crear negocio
              </button>

              <button className="btn btn-dark-outline" onClick={cerrarSesion}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </CardDark>

        {loading ? (
          <CardDark>
            <p className="text-center mb-0">Cargando panel...</p>
          </CardDark>
        ) : (
          <>
            <section className="superadmin-kpi-grid mb-4">
              {resumenCards.map((item) => {
                const Icon = item.icon;
                return (
                  <CardDark className={`superadmin-kpi-card ${item.variant}`} key={item.label}>
                    <div className="superadmin-kpi-icon"><Icon size={24} /></div>
                    <span>{item.label}</span>
                    <h2><AnimatedNumber value={Number(item.value || 0)} decimals={0} /></h2>
                  </CardDark>
                );
              })}
            </section>

            <section className="superadmin-plans-carousel mb-4">
              {PLANES.map((plan) => (
                <div className="superadmin-plan-card" key={plan.nombre}>
                  <div className="superadmin-plan-icon">{plan.icono}</div>
                  <small>Plan {plan.limite === "infinito" ? "∞" : plan.limite}</small>
                  <h4>{plan.nombre}</h4>
                  <p>{plan.descripcion}</p>
                </div>
              ))}
            </section>

            <CardDark className="superadmin-business-panel">
              <div className="superadmin-section-head">
                <div>
                  <h3 className="section-title mb-1">Negocios registrados</h3>
                  <p className="section-subtitle mb-0">Controla planes, demos, límites y estados desde un solo lugar.</p>
                </div>
                <GoldBadge>{negocios.length} negocios</GoldBadge>
              </div>

              <div className="superadmin-business-grid">
                {negocios.length > 0 ? negocios.map((n) => (
                  <div className={`superadmin-business-card ${!n.estado ? "suspended" : ""}`} key={n.idNegocio}>
                    <div className="superadmin-business-top">
                      <div className="superadmin-business-avatar">{String(n.nombre || "N").charAt(0).toUpperCase()}</div>
                      <div className="superadmin-business-main">
                        <h5 title={n.nombre}>{n.nombre}</h5>
                        <p>{n.telefono || "Sin teléfono"}</p>
                      </div>
                      <span className={`superadmin-status-pill ${n.estado ? "active" : "inactive"}`}>{n.estado ? "Activo" : "Suspendido"}</span>
                    </div>

                    <div className="superadmin-business-details">
                      <div><span>Plan</span><b>{n.planNombre || "Sin plan"}</b></div>
                      <div><span>Trabajadores</span><b>{n.totalTrabajadores} / {n.limiteTrabajadores ?? "∞"}</b></div>
                      <div><span>Suscripción</span><b>{n.estadoSuscripcion || "No definida"}</b></div>
                      <div><span>Demo</span><b>{n.esDemo ? "Sí" : "No"}</b></div>
                    </div>

                    <div className="superadmin-slug"><code>{n.slug || "sin-slug"}</code></div>

                    <div className="superadmin-business-actions">
                      <button className="btn-action-dark" onClick={() => abrirEditarPlan(n)}>
                        <Pencil size={16} /><span>Plan</span>
                      </button>
                      <button className={n.estado ? "btn-action-danger" : "btn-action-dark"} onClick={() => cambiarEstado(n.idNegocio)} disabled={cambiandoEstadoId === n.idNegocio}>
                        <Power size={16} />
                        <span>{cambiandoEstadoId === n.idNegocio ? "Procesando..." : n.estado ? "Suspender" : "Activar"}</span>
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="superadmin-empty"><Building2 size={38} /><p>No hay negocios registrados.</p></div>
                )}
              </div>
            </CardDark>
          </>
        )}

        <ModalSA abierto={modalCrear} titulo="Crear nuevo negocio" onClose={() => setModalCrear(false)} ancho="900px">
          <div className="superadmin-modal-intro"><ShieldCheck size={22} /><div><h5>Alta de negocio</h5><p>Crea el negocio y su usuario administrador. Luego podrá iniciar sesión con el correo registrado.</p></div></div>
          <div className="row g-3">
            <div className="col-md-6"><label className="label-gold">Nombre del negocio</label><input className="form-control input-dark" value={formCrear.nombreNegocio} onChange={(e) => cambiarCampoCrear("nombreNegocio", e.target.value)} maxLength={120} /></div>
            <div className="col-md-3"><label className="label-gold">Teléfono</label><input className="form-control input-dark" value={formCrear.telefono} onChange={(e) => cambiarCampoCrear("telefono", e.target.value)} maxLength={30} /></div>
            <div className="col-md-3"><label className="label-gold">WhatsApp</label><input className="form-control input-dark" value={formCrear.whatsappNegocio} onChange={(e) => cambiarCampoCrear("whatsappNegocio", e.target.value)} maxLength={30} /></div>
            <div className="col-12"><label className="label-gold">Dirección</label><input className="form-control input-dark" value={formCrear.direccion} onChange={(e) => cambiarCampoCrear("direccion", e.target.value)} maxLength={200} /></div>
            <div className="col-md-6"><label className="label-gold">Nombre del administrador</label><input className="form-control input-dark" value={formCrear.nombreAdmin} onChange={(e) => cambiarCampoCrear("nombreAdmin", e.target.value)} maxLength={120} /></div>
            <div className="col-md-6"><label className="label-gold">Correo del administrador</label><input className="form-control input-dark" value={formCrear.correoAdmin} onChange={(e) => cambiarCampoCrear("correoAdmin", e.target.value)} placeholder="admin@negocio.com" maxLength={160} /></div>
            <div className="col-md-4"><label className="label-gold">Plan</label><select className="form-control input-dark" value={formCrear.planNombre} onChange={(e) => cambiarCampoCrear("planNombre", e.target.value)}><option value="Demo">Demo</option><option value="Starter">Starter</option><option value="Growth">Growth</option><option value="Pro">Pro</option><option value="Enterprise">Enterprise</option></select></div>
            <div className="col-md-4"><label className="label-gold">Límite trabajadores</label><select className="form-control input-dark" value={formCrear.limiteTrabajadores} onChange={(e) => cambiarCampoCrear("limiteTrabajadores", e.target.value)}><option value="1">1 trabajador</option><option value="5">5 trabajadores</option><option value="10">10 trabajadores</option><option value="infinito">Ilimitado</option></select></div>
            <div className="col-md-4"><label className="label-gold">Días demo</label><input type="number" min="1" className="form-control input-dark" value={formCrear.diasDemo} onChange={(e) => cambiarCampoCrear("diasDemo", e.target.value)} /></div>
            <div className="col-12"><div className="superadmin-switch-card"><div><b>Crear como demo</b><span>Ideal para pruebas temporales del negocio.</span></div><div className="form-check form-switch"><input type="checkbox" className="form-check-input" checked={formCrear.esDemo} onChange={(e) => cambiarCampoCrear("esDemo", e.target.checked)} id="crearDemo" /></div></div></div>
          </div>
          <div className="superadmin-modal-actions"><button className="btn btn-dark-outline" onClick={() => setModalCrear(false)}>Cancelar</button><button className="btn btn-gold" onClick={crearNegocio} disabled={creando}><Plus size={16} />{creando ? "Creando..." : "Crear negocio"}</button></div>
        </ModalSA>

        <ModalSA abierto={modalPlan} titulo={`Editar plan: ${negocioSeleccionado?.nombre || ""}`} onClose={() => setModalPlan(false)} ancho="660px">
          <div className="superadmin-modal-intro"><Crown size={22} /><div><h5>Actualizar plan</h5><p>Modifica el límite de trabajadores, demo y condiciones del negocio.</p></div></div>
          <div className="row g-3">
            <div className="col-md-6"><label className="label-gold">Plan</label><select className="form-control input-dark" value={formPlan.planNombre} onChange={(e) => cambiarCampoPlan("planNombre", e.target.value)}><option value="Demo">Demo</option><option value="Starter">Starter</option><option value="Growth">Growth</option><option value="Pro">Pro</option><option value="Enterprise">Enterprise</option></select></div>
            <div className="col-md-6"><label className="label-gold">Límite trabajadores</label><select className="form-control input-dark" value={formPlan.limiteTrabajadores} onChange={(e) => cambiarCampoPlan("limiteTrabajadores", e.target.value)}><option value="1">1 trabajador</option><option value="5">5 trabajadores</option><option value="10">10 trabajadores</option><option value="infinito">Ilimitado</option></select></div>
            <div className="col-md-6"><label className="label-gold">Días demo</label><input type="number" min="1" className="form-control input-dark" value={formPlan.diasDemo} onChange={(e) => cambiarCampoPlan("diasDemo", e.target.value)} /></div>
            <div className="col-md-6"><div className="superadmin-switch-card h-100"><div><b>Mantener demo</b><span>Marca si seguirá como prueba.</span></div><div className="form-check form-switch"><input type="checkbox" className="form-check-input" checked={formPlan.esDemo} onChange={(e) => cambiarCampoPlan("esDemo", e.target.checked)} id="editarDemo" /></div></div></div>
          </div>
          <div className="superadmin-modal-actions"><button className="btn btn-dark-outline" onClick={() => setModalPlan(false)}>Cancelar</button><button className="btn btn-gold" onClick={actualizarPlan} disabled={guardandoPlan}><CheckCircle2 size={16} />{guardandoPlan ? "Guardando..." : "Guardar plan"}</button></div>
        </ModalSA>
      </div>

      <Toast mensaje={mensaje} tipo={tipoMensaje} onClose={() => setMensaje("")} />
    </div>
  );
}
