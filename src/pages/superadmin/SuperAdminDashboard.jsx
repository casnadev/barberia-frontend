import { useEffect, useState } from "react";
import API_BASE from "../../services/api";
import authFetch from "../../services/authFetch";
import PageHeader from "../../components/ui/PageHeader";
import CardDark from "../../components/ui/CardDark";
import GoldBadge from "../../components/ui/GoldBadge";
import Toast from "../../components/ui/Toast";

export default function SuperAdminDashboard() {
  const [resumen, setResumen] = useState(null);
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("success");

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

        <div className="d-flex justify-content-end mb-3">
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
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div className="sa-card">
                  <span>Total negocios</span>
                  <h2>{resumen?.totalNegocios ?? 0}</h2>
                </div>
              </div>

              <div className="col-md-3">
                <div className="sa-card">
                  <span>Activos</span>
                  <h2>{resumen?.activos ?? 0}</h2>
                </div>
              </div>

              <div className="col-md-3">
                <div className="sa-card">
                  <span>Demos</span>
                  <h2>{resumen?.demos ?? 0}</h2>
                </div>
              </div>

              <div className="col-md-3">
                <div className="sa-card">
                  <span>Trabajadores</span>
                  <h2>{resumen?.totalTrabajadores ?? 0}</h2>
                </div>
              </div>
            </div>

            <CardDark>
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div>
                  <h3 className="section-title mb-1">Negocios registrados</h3>
                  <p className="section-subtitle mb-0">
                    Control de planes, demos y estados.
                  </p>
                </div>

                <button className="btn btn-gold" disabled>
                  Crear negocio
                </button>
              </div>

              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Negocio</th>
                      <th>Plan</th>
                      <th>Trabajadores</th>
                      <th>Estado</th>
                      <th>Demo</th>
                      <th>Slug</th>
                      <th className="text-end">Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {negocios.length > 0 ? (
                      negocios.map((n) => (
                        <tr key={n.idNegocio}>
                          <td>
                            <strong>{n.nombre}</strong>
                            <div style={{ color: "#f30b0b", fontSize: "0.85rem" }}>
                              {n.telefono || "Sin teléfono"}
                            </div>
                          </td>

                          <td>
                            <GoldBadge>
                              {n.planNombre || "Sin plan"}
                            </GoldBadge>
                          </td>

                          <td>
                            {n.totalTrabajadores} /{" "}
                            {n.limiteTrabajadores ?? "∞"}
                          </td>

                          <td>
                            <span
                              className={
                                n.estado ? "badge bg-success" : "badge bg-danger"
                              }
                            >
                              {n.estado ? "Activo" : "Suspendido"}
                            </span>
                          </td>

                          <td>{n.esDemo ? "Sí" : "No"}</td>

                          <td>
                            <code>{n.slug}</code>
                          </td>

                          <td className="text-end">
                            <button
                              className={
                                n.estado
                                  ? "btn btn-sm btn-dark-outline"
                                  : "btn btn-sm btn-gold"
                              }
                              onClick={() => cambiarEstado(n.idNegocio)}
                            >
                              {n.estado ? "Suspender" : "Activar"}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center py-4">
                          No hay negocios registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardDark>
          </>
        )}

        <style>{`
          .sa-card {
            background: linear-gradient(135deg, #f1bd10, #d4af37);
            border: 1px solid rgba(212, 175, 55, 0.35);
            border-radius: 22px;
            padding: 22px;
            box-shadow: 0 12px 32px rgba(0,0,0,.08);
          }

          .sa-card span {
            color: #f5f3ee;
            font-weight: 800;
            font-size: .9rem;
          }

          .sa-card h2 {
            color: #111827;
            font-weight: 900;
            margin: 8px 0 0;
          }

          code {
            color: #d4af37;
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