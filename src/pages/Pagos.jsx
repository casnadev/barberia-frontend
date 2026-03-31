import { useEffect, useMemo, useState } from "react";
import API_BASE from "../services/api";
import CardDark from "../components/ui/CardDark";
import PageHeader from "../components/ui/PageHeader";
import GoldBadge from "../components/ui/GoldBadge";
import TableDark from "../components/ui/TableDark";

function Pagos() {
  const [historialPagos, setHistorialPagos] = useState([]);
  const [error, setError] = useState("");

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtroTrabajador, setFiltroTrabajador] = useState("");

  useEffect(() => {
    const cargarPagos = async () => {
      try {
        const res = await fetch(`${API_BASE}/Ventas/historial-pagos`);
        const data = await res.json();
        setHistorialPagos(data);
      } catch (err) {
        console.error(err);
        setError("Error al cargar historial de pagos");
      }
    };

    cargarPagos();
  }, []);

  const pagosFiltrados = useMemo(() => {
    return historialPagos.filter((p) => {
      const fechaPago = new Date(p.fechaPago);

      if (fechaDesde) {
        const desde = new Date(fechaDesde);
        if (fechaPago < desde) return false;
      }

      if (fechaHasta) {
        const hasta = new Date(fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        if (fechaPago > hasta) return false;
      }

      if (filtroTrabajador.trim()) {
        if (!p.trabajador?.toLowerCase().includes(filtroTrabajador.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [historialPagos, fechaDesde, fechaHasta, filtroTrabajador]);

  const totalPagado = useMemo(
    () =>
      pagosFiltrados.reduce(
        (acc, p) => acc + Number(p.montoPagado || 0),
        0
      ),
    [pagosFiltrados]
  );

  const limpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
    setFiltroTrabajador("");
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Historial de Pagos"
        subtitle="Consulta pagos realizados a trabajadores con filtros y seguimiento"
      />

      <div className="container-fluid py-4">
        {error && <div className="alert alert-danger">{error}</div>}

        <CardDark className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h4 className="section-title">Resumen de pagos</h4>
              <p className="section-subtitle">
                Vista general del historial registrado
              </p>
            </div>
            <GoldBadge>{pagosFiltrados.length} pagos</GoldBadge>
          </div>

          <div className="row g-3">
            <div className="col-lg-4">
              <div
                className="p-3 h-100"
                style={{
                  background: "rgba(74, 222, 128, 0.08)",
                  borderRadius: "16px",
                  border: "1px solid rgba(74, 222, 128, 0.22)",
                }}
              >
                <div
                  style={{
                    color: "#86efac",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    marginBottom: "8px",
                  }}
                >
                  Total pagado
                </div>
                <div
                  style={{
                    color: "#ffffff",
                    fontSize: "2rem",
                    fontWeight: 800,
                  }}
                >
                  S/ {totalPagado.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div
                className="p-3 h-100"
                style={{
                  background: "rgba(212, 175, 55, 0.08)",
                  borderRadius: "16px",
                  border: "1px solid rgba(212, 175, 55, 0.22)",
                }}
              >
                <div
                  style={{
                    color: "#d4af37",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    marginBottom: "8px",
                  }}
                >
                  Trabajadores únicos
                </div>
                <div
                  style={{
                    color: "#ffffff",
                    fontSize: "2rem",
                    fontWeight: 800,
                  }}
                >
                  {new Set(pagosFiltrados.map((p) => p.trabajador)).size}
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div
                className="p-3 h-100"
                style={{
                  background: "rgba(192, 132, 252, 0.08)",
                  borderRadius: "16px",
                  border: "1px solid rgba(192, 132, 252, 0.22)",
                }}
              >
                <div
                  style={{
                    color: "#c084fc",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    marginBottom: "8px",
                  }}
                >
                  Último pago
                </div>
                <div
                  style={{
                    color: "#ffffff",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                  }}
                >
                  {pagosFiltrados.length > 0
                    ? new Date(pagosFiltrados[0].fechaPago).toLocaleString()
                    : "-"}
                </div>
              </div>
            </div>
          </div>
        </CardDark>

        <CardDark>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h4 className="section-title">Detalle de pagos</h4>
              <p className="section-subtitle">
                Filtra y revisa cada pago registrado
              </p>
            </div>
            <GoldBadge>{pagosFiltrados.length} registros</GoldBadge>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <label
                className="form-label"
                style={{ color: "#d4af37", fontWeight: 600 }}
              >
                Desde
              </label>
              <input
                type="date"
                className="form-control input-dark"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <label
                className="form-label"
                style={{ color: "#d4af37", fontWeight: 600 }}
              >
                Hasta
              </label>
              <input
                type="date"
                className="form-control input-dark"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>

            <div className="col-md-4">
              <label
                className="form-label"
                style={{ color: "#d4af37", fontWeight: 600 }}
              >
                Trabajador
              </label>
              <input
                type="text"
                className="form-control input-dark"
                placeholder="Buscar por nombre"
                value={filtroTrabajador}
                onChange={(e) => setFiltroTrabajador(e.target.value)}
              />
            </div>

            <div className="col-md-2 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-dark-outline w-100"
                onClick={limpiarFiltros}
              >
                Limpiar
              </button>
            </div>
          </div>

          <TableDark
            headers={[
              "Trabajador",
              "Fecha de pago",
              "Monto pagado",
              "Observación",
            ]}
          >
            {pagosFiltrados.length > 0 ? (
              pagosFiltrados.map((p, index) => (
                <tr key={index}>
                  <td style={{ fontWeight: 600 }}>{p.trabajador}</td>
                  <td>{new Date(p.fechaPago).toLocaleString()}</td>
                  <td style={{ color: "#86efac", fontWeight: 700 }}>
                    S/ {Number(p.montoPagado).toFixed(2)}
                  </td>
                  <td>{p.observacion || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-4">
                  No hay pagos registrados
                </td>
              </tr>
            )}
          </TableDark>
        </CardDark>
      </div>
    </div>
  );
}

export default Pagos;