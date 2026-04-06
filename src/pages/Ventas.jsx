import { useEffect, useMemo, useState } from "react";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";
import CardDark from "../components/ui/CardDark";
import PageHeader from "../components/ui/PageHeader";
import GoldBadge from "../components/ui/GoldBadge";
import TableDark from "../components/ui/TableDark";

function Ventas() {
  const [ventas, setVentas] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [error, setError] = useState("");

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtroTrabajador, setFiltroTrabajador] = useState("");
  const [filtroServicio, setFiltroServicio] = useState("");

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const resVentas = await authFetch(`${API_BASE}/Ventas/completas`);
        const resTrabajadores = await authFetch(`${API_BASE}/Trabajadores`);
        const resServicios = await authFetch(`${API_BASE}/Servicios`);

        if (!resVentas || !resTrabajadores || !resServicios) return;

        const dataVentas = await resVentas.json();
        const dataTrabajadores = await resTrabajadores.json();
        const dataServicios = await resServicios.json();

        setVentas(dataVentas);
        setTrabajadores(dataTrabajadores);
        setServicios(dataServicios);
      } catch (err) {
        console.error(err);
        setError("Error al cargar ventas");
      }
    };

    cargarDatos();
  }, []);

  const ventasFiltradas = useMemo(() => {
    return ventas.filter((v) => {
      const fechaVenta = new Date(v.fechaVenta);

      if (fechaDesde) {
        const desde = new Date(fechaDesde);
        if (fechaVenta < desde) return false;
      }

      if (fechaHasta) {
        const hasta = new Date(fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        if (fechaVenta > hasta) return false;
      }

      if (filtroTrabajador) {
        if (v.trabajador !== filtroTrabajador) return false;
      }

      if (filtroServicio) {
        if (v.servicio !== filtroServicio) return false;
      }

      return true;
    });
  }, [ventas, fechaDesde, fechaHasta, filtroTrabajador, filtroServicio]);

  const totalFiltrado = useMemo(
    () => ventasFiltradas.reduce((acc, v) => acc + Number(v.total || 0), 0),
    [ventasFiltradas]
  );

  const totalComisionFiltrada = useMemo(
    () =>
      ventasFiltradas.reduce(
        (acc, v) => acc + Number(v.montoComisionCalculado || 0),
        0
      ),
    [ventasFiltradas]
  );

  const limpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
    setFiltroTrabajador("");
    setFiltroServicio("");
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Ventas"
        subtitle="Consulta ventas detalladas por fecha, trabajador y servicio"
      />

      <div className="container-fluid py-4">
        {error && <div className="alert alert-danger">{error}</div>}

        <CardDark className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h4 className="section-title">Resumen de ventas</h4>
              <p className="section-subtitle">
                Totales calculados según los filtros aplicados
              </p>
            </div>
            <GoldBadge>{ventasFiltradas.length} registros</GoldBadge>
          </div>

          <div className="row g-3">
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
                  Total vendido
                </div>
                <div
                  style={{
                    color: "#ffffff",
                    fontSize: "2rem",
                    fontWeight: 800,
                  }}
                >
                  S/ {totalFiltrado.toFixed(2)}
                </div>
              </div>
            </div>

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
                  Comisión generada
                </div>
                <div
                  style={{
                    color: "#ffffff",
                    fontSize: "2rem",
                    fontWeight: 800,
                  }}
                >
                  S/ {totalComisionFiltrada.toFixed(2)}
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
                  Servicios distintos
                </div>
                <div
                  style={{
                    color: "#ffffff",
                    fontSize: "2rem",
                    fontWeight: 800,
                  }}
                >
                  {new Set(ventasFiltradas.map((v) => v.servicio)).size}
                </div>
              </div>
            </div>
          </div>
        </CardDark>

        <CardDark>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h4 className="section-title">Historial de ventas</h4>
              <p className="section-subtitle">
                Filtra y revisa el detalle completo de cada venta
              </p>
            </div>
            <GoldBadge>{ventasFiltradas.length} registros</GoldBadge>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-2">
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

            <div className="col-md-2">
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

            <div className="col-md-3">
              <label
                className="form-label"
                style={{ color: "#d4af37", fontWeight: 600 }}
              >
                Trabajador
              </label>
              <select
                className="form-control input-dark"
                value={filtroTrabajador}
                onChange={(e) => setFiltroTrabajador(e.target.value)}
              >
                <option value="">Todos</option>
                {trabajadores.map((t) => (
                  <option key={t.idTrabajador} value={t.nombre}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label
                className="form-label"
                style={{ color: "#d4af37", fontWeight: 600 }}
              >
                Servicio
              </label>
              <select
                className="form-control input-dark"
                value={filtroServicio}
                onChange={(e) => setFiltroServicio(e.target.value)}
              >
                <option value="">Todos</option>
                {servicios.map((s) => (
                  <option key={s.idServicio} value={s.nombre}>
                    {s.nombre}
                  </option>
                ))}
              </select>
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
              "ID",
              "Fecha",
              "Servicio",
              "Trabajador",
              "Cantidad",
              "Precio",
              "Subtotal",
              "% Comisión",
              "Comisión",
              "Total",
            ]}
          >
            {ventasFiltradas.length > 0 ? (
              ventasFiltradas.map((v) => (
                <tr key={`${v.idVenta}-${v.fechaVenta}-${v.servicio}-${v.trabajador}`}>
                  <td style={{ fontWeight: 700 }}>{v.idVenta}</td>
                  <td>{new Date(v.fechaVenta).toLocaleString()}</td>
                  <td>{v.servicio}</td>
                  <td>
                    <span className="table-pill">{v.trabajador}</span>
                  </td>
                  <td>{v.cantidad}</td>
                  <td>S/ {Number(v.precioUnitario).toFixed(2)}</td>
                  <td>S/ {Number(v.subtotal).toFixed(2)}</td>
                  <td style={{ color: "#f4d35e", fontWeight: 700 }}>
                    {Number(v.porcentajeComisionAplicado || 0).toFixed(0)}%
                  </td>
                  <td style={{ color: "#86efac", fontWeight: 700 }}>
                    S/ {Number(v.montoComisionCalculado || 0).toFixed(2)}
                  </td>
                  <td style={{ color: "#d4af37", fontWeight: 700 }}>
                    S/ {Number(v.total).toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="text-center py-4">
                  No hay ventas registradas
                </td>
              </tr>
            )}
          </TableDark>
        </CardDark>
      </div>
    </div>
  );
}

export default Ventas;