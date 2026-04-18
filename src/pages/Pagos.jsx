import { useEffect, useMemo, useState } from "react";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";
import CardDark from "../components/ui/CardDark";
import PageHeader from "../components/ui/PageHeader";
import GoldBadge from "../components/ui/GoldBadge";
import TableDark from "../components/ui/TableDark";
import Toast from "../components/ui/Toast";
import DateFilter from "../components/ui/DateFilter";
import { exportarPDF } from "../utils/exportPdf";
import { exportarExcel } from "../utils/exportExcel";
import { FaFilePdf, FaFileExcel } from "react-icons/fa";

function Pagos() {
  const [historialPagos, setHistorialPagos] = useState([]);
  const [comisionesPendientes, setComisionesPendientes] = useState([]);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("success");

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtroTrabajador, setFiltroTrabajador] = useState("");

  const [filtroRapidoActivo, setFiltroRapidoActivo] = useState("");
  const [limpiandoActivo, setLimpiandoActivo] = useState(false);

  const [montosPago, setMontosPago] = useState({});
  const [procesandoPago, setProcesandoPago] = useState(null);

  const [modalConfirmacion, setModalConfirmacion] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState(null);
  const [textoConfirmacion, setTextoConfirmacion] = useState("");

  const cargarPagos = async () => {
    try {
      const [resHistorial, resPendientes] = await Promise.all([
        authFetch(`${API_BASE}/Ventas/historial-pagos`),
        authFetch(`${API_BASE}/Ventas/comisiones-pendientes`),
      ]);

      if (!resHistorial || !resPendientes) return;

      const [dataHistorial, dataPendientes] = await Promise.all([
        resHistorial.json(),
        resPendientes.json(),
      ]);

      setHistorialPagos(dataHistorial);
      setComisionesPendientes(dataPendientes);
    } catch (err) {
      console.error(err);
      setTipoMensaje("error");
      setError("Error al cargar pagos");
    }
  };

  useEffect(() => {
    cargarPagos();
  }, []);

  const aplicarFiltroHoy = () => {
    const hoy = new Date();
    const fechaHoy = `${hoy.getFullYear()}-${String(
      hoy.getMonth() + 1
    ).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

    setFechaDesde(fechaHoy);
    setFechaHasta(fechaHoy);
    setFiltroRapidoActivo("hoy");
  };

  const aplicarFiltroSemana = () => {
    const hoy = new Date();
    const dia = hoy.getDay();
    const ajuste = dia === 0 ? 6 : dia - 1;

    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ajuste);

    const fechaHoy = `${hoy.getFullYear()}-${String(
      hoy.getMonth() + 1
    ).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

    const fechaLunes = `${lunes.getFullYear()}-${String(
      lunes.getMonth() + 1
    ).padStart(2, "0")}-${String(lunes.getDate()).padStart(2, "0")}`;

    setFechaDesde(fechaLunes);
    setFechaHasta(fechaHoy);
    setFiltroRapidoActivo("semana");
  };

  const aplicarFiltroMes = () => {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const fechaHoy = `${hoy.getFullYear()}-${String(
      hoy.getMonth() + 1
    ).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

    const fechaPrimerDia = `${primerDia.getFullYear()}-${String(
      primerDia.getMonth() + 1
    ).padStart(2, "0")}-${String(primerDia.getDate()).padStart(2, "0")}`;

    setFechaDesde(fechaPrimerDia);
    setFechaHasta(fechaHoy);
    setFiltroRapidoActivo("mes");
  };

  const pagosFiltrados = useMemo(() => {
    return historialPagos.filter((p) => {
      const fechaPago = new Date(p.fechaPago);

      if (fechaDesde) {
        const desde = new Date(`${fechaDesde}T00:00:00`);
        if (fechaPago < desde) return false;
      }

      if (fechaHasta) {
        const hasta = new Date(`${fechaHasta}T23:59:59.999`);
        if (fechaPago > hasta) return false;
      }

      if (filtroTrabajador.trim()) {
        if (
          !p.trabajador?.toLowerCase().includes(filtroTrabajador.toLowerCase())
        ) {
          return false;
        }
      }

      return true;
    });
  }, [historialPagos, fechaDesde, fechaHasta, filtroTrabajador]);

  const pendientesFiltrados = useMemo(() => {
    return comisionesPendientes.filter((p) => {
      if (filtroTrabajador.trim()) {
        if (
          !p.trabajador?.toLowerCase().includes(filtroTrabajador.toLowerCase())
        ) {
          return false;
        }
      }
      return true;
    });
  }, [comisionesPendientes, filtroTrabajador]);

  const totalPagado = useMemo(
    () => pagosFiltrados.reduce((acc, p) => acc + Number(p.montoPagado || 0), 0),
    [pagosFiltrados]
  );

  const totalPendiente = useMemo(
    () =>
      pendientesFiltrados.reduce(
        (acc, p) => acc + Number(p.totalComisionPendiente || 0),
        0
      ),
    [pendientesFiltrados]
  );

  const limpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
    setFiltroTrabajador("");
    setFiltroRapidoActivo("");

    setLimpiandoActivo(true);
    setTimeout(() => {
      setLimpiandoActivo(false);
    }, 400);

    setTipoMensaje("info");
    setMensaje("Filtros restablecidos");
  };

  const cambiarMontoPago = (idTrabajador, valor) => {
    setMontosPago((prev) => ({
      ...prev,
      [idTrabajador]: valor,
    }));
  };

  const obtenerMontoPago = (idTrabajador) => {
    return Number(montosPago[idTrabajador] || 0);
  };

  const abrirConfirmacion = (texto, accion) => {
    setTextoConfirmacion(texto);
    setAccionPendiente(() => accion);
    setModalConfirmacion(true);
  };

  const cerrarConfirmacion = () => {
    setModalConfirmacion(false);
    setAccionPendiente(null);
    setTextoConfirmacion("");
  };

  const confirmarAccion = () => {
    if (accionPendiente) accionPendiente();
    cerrarConfirmacion();
  };

  const pagarParcial = async (idTrabajador, totalPendienteTrabajador) => {
    const monto = Number(montosPago[idTrabajador] || 0);

    if (!monto || isNaN(monto)) {
      setTipoMensaje("error");
      setError("Ingresa un monto válido para el pago parcial.");
      return;
    }

    if (monto <= 0) {
      setTipoMensaje("error");
      setError("El monto debe ser mayor a 0.");
      return;
    }

    if (monto > totalPendienteTrabajador) {
      setTipoMensaje("error");
      setError(
        `El monto no puede exceder lo pendiente: S/ ${Number(
          totalPendienteTrabajador
        ).toFixed(2)}`
      );
      return;
    }

    setProcesandoPago(idTrabajador);
    setMensaje("");
    setError("");

    try {
      const res = await authFetch(`${API_BASE}/Ventas/pago-parcial`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idTrabajador,
          monto,
          observacion: "Pago parcial desde módulo Pagos",
        }),
      });

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setError(data.mensaje || "Error al registrar pago parcial");
        return;
      }

      setTipoMensaje("success");
      setMensaje(`Pago parcial registrado: S/ ${Number(data.totalPagado).toFixed(2)}`);

      setMontosPago((prev) => ({
        ...prev,
        [idTrabajador]: "",
      }));

      await cargarPagos();
    } catch (err) {
      console.error(err);
      setTipoMensaje("error");
      setError("Error de conexión");
    } finally {
      setProcesandoPago(null);
    }
  };

  const pagarTodo = async (idTrabajador, totalPendienteTrabajador) => {
    if (totalPendienteTrabajador <= 0) {
      setTipoMensaje("error");
      setError("No hay monto pendiente para pagar.");
      return;
    }

    setProcesandoPago(idTrabajador);
    setMensaje("");
    setError("");

    try {
      const res = await authFetch(
        `${API_BASE}/Ventas/pagar-comisiones/${idTrabajador}`,
        {
          method: "PATCH",
        }
      );

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setError(data.mensaje || "Error al pagar comisiones");
        return;
      }

      setTipoMensaje("success");
      setMensaje(`Pago total realizado: S/ ${Number(data.totalPagado).toFixed(2)}`);

      setMontosPago((prev) => ({
        ...prev,
        [idTrabajador]: "",
      }));

      await cargarPagos();
    } catch (err) {
      console.error(err);
      setTipoMensaje("error");
      setError("Error de conexión");
    } finally {
      setProcesandoPago(null);
    }
  };

  const exportarPagosPDF = async () => {
    if (pagosFiltrados.length === 0) {
      setTipoMensaje("error");
      setError("No hay pagos para exportar en PDF.");
      return;
    }

    const columnas = [
      "Trabajador",
      "Fecha de pago",
      "Monto pagado",
      "Observación",
    ];

    const filas = pagosFiltrados.map((p) => [
      p.trabajador,
      new Date(p.fechaPago).toLocaleString(),
      `S/ ${Number(p.montoPagado).toFixed(2)}`,
      p.observacion || "-",
    ]);

    await exportarPDF({
      titulo: "Reporte de Pagos",
      columnas,
      filas,
      nombreArchivo: "Reporte_Pagos",
    });

    setTipoMensaje("success");
    setMensaje("PDF generado correctamente.");
  };

  const exportarPagosExcel = async () => {
    if (pagosFiltrados.length === 0) {
      setTipoMensaje("error");
      setError("No hay pagos para exportar en Excel.");
      return;
    }

    const columnas = [
      { header: "Trabajador", key: "trabajador", width: 28 },
      { header: "Fecha de pago", key: "fechaPago", width: 26 },
      { header: "Monto pagado", key: "montoPagado", width: 18 },
      { header: "Observación", key: "observacion", width: 40 },
    ];

    const filas = pagosFiltrados.map((p) => ({
      trabajador: p.trabajador,
      fechaPago: new Date(p.fechaPago).toLocaleString(),
      montoPagado: Number(p.montoPagado).toFixed(2),
      observacion: p.observacion || "-",
    }));

    await exportarExcel({
      titulo: "Reporte de Pagos",
      columnas,
      filas,
      nombreArchivo: "Reporte_Pagos",
      nombreHoja: "Pagos",
    });

    setTipoMensaje("success");
    setMensaje("Excel generado correctamente.");
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Pagos"
        subtitle="Gestiona pendientes, pagos parciales, pagos totales e historial"
      />

      <div className="container-fluid py-4">
        <CardDark className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h4 className="section-title">Filtros de pagos</h4>
              <p className="section-subtitle">
                Usa filtros rápidos o fechas específicas para revisar pagos e historial
              </p>
            </div>
            <GoldBadge>{pagosFiltrados.length} pagos</GoldBadge>
          </div>

          <div className="filtros-rapidos mb-3">
            <button
              type="button"
              className={`btn ${
                filtroRapidoActivo === "hoy" ? "btn-gold" : "btn-dark-outline"
              }`}
              onClick={aplicarFiltroHoy}
            >
              Hoy
            </button>

            <button
              type="button"
              className={`btn ${
                filtroRapidoActivo === "semana"
                  ? "btn-gold"
                  : "btn-dark-outline"
              }`}
              onClick={aplicarFiltroSemana}
            >
              Semana
            </button>

            <button
              type="button"
              className={`btn ${
                filtroRapidoActivo === "mes" ? "btn-gold" : "btn-dark-outline"
              }`}
              onClick={aplicarFiltroMes}
            >
              Mes
            </button>

            <button
              type="button"
              className={`btn ${
                limpiandoActivo ? "btn-gold" : "btn-dark-outline"
              }`}
              onClick={limpiarFiltros}
            >
              {limpiandoActivo ? "↺ Limpiando..." : "Limpiar"}
            </button>
          </div>

          <div className="analisis-filtros mb-4">
            <div className="filtro-item">
              <DateFilter
                label="Desde"
                value={fechaDesde}
                onChange={(valor) => {
                  setFechaDesde(valor);
                  setFiltroRapidoActivo("");
                }}
              />
            </div>

            <div className="filtro-item">
              <DateFilter
                label="Hasta"
                value={fechaHasta}
                onChange={(valor) => {
                  setFechaHasta(valor);
                  setFiltroRapidoActivo("");
                }}
                minDate={fechaDesde}
              />
            </div>

            <div className="filtro-item">
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
                onChange={(e) => {
                  setFiltroTrabajador(e.target.value);
                  setFiltroRapidoActivo("");
                }}
              />
            </div>

            <div className="filtro-item">
              <label
                className="form-label"
                style={{ color: "#d4af37", fontWeight: 600 }}
              >
                Estado
              </label>
              <input
                type="text"
                className="form-control input-dark"
                value="Pendientes e historial"
                disabled
              />
            </div>
          </div>
        </CardDark>

        <CardDark className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h4 className="section-title">Resumen financiero</h4>
              <p className="section-subtitle">
                Vista general de pendientes y pagos registrados
              </p>
            </div>
            <GoldBadge>{pagosFiltrados.length} pagos</GoldBadge>
          </div>

          <div className="row g-3">
            <div className="col-lg-4">
              <div
                className="p-3 h-100"
                style={{
                  background: "rgba(244, 211, 94, 0.08)",
                  borderRadius: "16px",
                  border: "1px solid rgba(244, 211, 94, 0.22)",
                }}
              >
                <div
                  style={{
                    color: "#f4d35e",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    marginBottom: "8px",
                  }}
                >
                  Total pendiente
                </div>
                <div
                  style={{
                    color: "#ffffff",
                    fontSize: "2rem",
                    fontWeight: 800,
                  }}
                >
                  S/ {totalPendiente.toFixed(2)}
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
                  Trabajadores con saldo
                </div>
                <div
                  style={{
                    color: "#ffffff",
                    fontSize: "2rem",
                    fontWeight: 800,
                  }}
                >
                  {
                    pendientesFiltrados.filter(
                      (p) => Number(p.totalComisionPendiente || 0) > 0
                    ).length
                  }
                </div>
              </div>
            </div>
          </div>
        </CardDark>

        <CardDark className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h4 className="section-title">Pendientes por trabajador</h4>
              <p className="section-subtitle">
                Revisa desde cuándo existe deuda y registra pagos parciales o totales
              </p>
            </div>
            <GoldBadge>{pendientesFiltrados.length} trabajadores</GoldBadge>
          </div>

          <TableDark
            headers={[
              "Trabajador",
              "Fecha pendiente",
              "Total generado",
              "Pendiente",
              "Pagado",
              "Acciones",
            ]}
          >
            {pendientesFiltrados.length > 0 ? (
              pendientesFiltrados.map((p) => (
                <tr key={p.idTrabajador}>
                  <td style={{ fontWeight: 600 }}>{p.trabajador}</td>
                  <td>
                    {p.fechaPendiente
                      ? new Date(p.fechaPendiente).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>S/ {Number(p.totalGenerado).toFixed(2)}</td>
                  <td style={{ color: "#f4d35e", fontWeight: 700 }}>
                    S/ {Number(p.totalComisionPendiente).toFixed(2)}
                  </td>
                  <td style={{ color: "#86efac", fontWeight: 700 }}>
                    S/ {Number(p.totalComisionPagada).toFixed(2)}
                  </td>
                  <td style={{ minWidth: "260px" }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Monto"
                      className="form-control input-dark mb-2"
                      value={montosPago[p.idTrabajador] || ""}
                      onChange={(e) =>
                        cambiarMontoPago(p.idTrabajador, e.target.value)
                      }
                      disabled={Number(p.totalComisionPendiente) <= 0}
                    />

                    <div className="d-flex gap-2 mb-2">
                      <button
                        className="btn btn-sm"
                        disabled={
                          procesandoPago === p.idTrabajador ||
                          Number(p.totalComisionPendiente) <= 0 ||
                          !obtenerMontoPago(p.idTrabajador) ||
                          obtenerMontoPago(p.idTrabajador) <= 0 ||
                          obtenerMontoPago(p.idTrabajador) >
                            Number(p.totalComisionPendiente)
                        }
                        onClick={() =>
                          abrirConfirmacion(
                            `¿Confirmar pago parcial a ${p.trabajador}?`,
                            () =>
                              pagarParcial(
                                p.idTrabajador,
                                Number(p.totalComisionPendiente)
                              )
                          )
                        }
                        style={{
                          background:
                            procesandoPago === p.idTrabajador
                              ? "#555"
                              : Number(p.totalComisionPendiente) > 0 &&
                                obtenerMontoPago(p.idTrabajador) > 0 &&
                                obtenerMontoPago(p.idTrabajador) <=
                                  Number(p.totalComisionPendiente)
                              ? "#d4af37"
                              : "#333",
                          color: "#111",
                          fontWeight: 700,
                          border: "none",
                          cursor:
                            procesandoPago === p.idTrabajador
                              ? "wait"
                              : Number(p.totalComisionPendiente) > 0 &&
                                obtenerMontoPago(p.idTrabajador) > 0 &&
                                obtenerMontoPago(p.idTrabajador) <=
                                  Number(p.totalComisionPendiente)
                              ? "pointer"
                              : "not-allowed",
                        }}
                      >
                        {procesandoPago === p.idTrabajador
                          ? "Procesando..."
                          : "Parcial"}
                      </button>

                      <button
                        className="btn btn-sm"
                        disabled={
                          procesandoPago === p.idTrabajador ||
                          Number(p.totalComisionPendiente) <= 0
                        }
                        onClick={() =>
                          abrirConfirmacion(
                            `¿Pagar todo lo pendiente a ${p.trabajador}?`,
                            () =>
                              pagarTodo(
                                p.idTrabajador,
                                Number(p.totalComisionPendiente)
                              )
                          )
                        }
                        style={{
                          background:
                            procesandoPago === p.idTrabajador
                              ? "#555"
                              : Number(p.totalComisionPendiente) > 0
                              ? "#22c55e"
                              : "#333",
                          color: "#fff",
                          fontWeight: 700,
                          border: "none",
                          cursor:
                            procesandoPago === p.idTrabajador
                              ? "wait"
                              : Number(p.totalComisionPendiente) > 0
                              ? "pointer"
                              : "not-allowed",
                        }}
                      >
                        {procesandoPago === p.idTrabajador
                          ? "Procesando..."
                          : "Todo"}
                      </button>
                    </div>

                    {obtenerMontoPago(p.idTrabajador) >
                      Number(p.totalComisionPendiente) && (
                      <small style={{ color: "#f87171" }}>
                        El monto excede lo pendiente
                      </small>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-4">
                  No hay saldos pendientes
                </td>
              </tr>
            )}
          </TableDark>
        </CardDark>

        <CardDark>
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <div>
              <h4 className="section-title">Historial de pagos</h4>
              <p className="section-subtitle">
                Revisa cada pago registrado con sus filtros
              </p>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <GoldBadge>{pagosFiltrados.length} registros</GoldBadge>

              <button
                type="button"
                className="btn btn-dark-outline export-btn d-flex align-items-center gap-2"
                onClick={exportarPagosPDF}
              >
                <FaFilePdf size={16} />
                Exportar PDF
              </button>

              <button
                type="button"
                className="btn btn-gold export-btn d-flex align-items-center gap-2"
                onClick={exportarPagosExcel}
              >
                <FaFileExcel size={16} />
                Exportar Excel
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
              pagosFiltrados.map((p) => (
                <tr key={p.idPago}>
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

        {modalConfirmacion && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
              padding: "20px",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "420px",
                background: "#111",
                border: "1px solid rgba(212,175,55,0.25)",
                borderRadius: "20px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
                padding: "24px",
              }}
            >
              <h4
                style={{
                  color: "#d4af37",
                  marginBottom: "12px",
                  fontWeight: 800,
                }}
              >
                Confirmar acción
              </h4>

              <p
                style={{
                  color: "#f5f5f5",
                  marginBottom: "20px",
                  lineHeight: 1.5,
                }}
              >
                {textoConfirmacion}
              </p>

              <div className="d-flex gap-2 justify-content-end">
                <button
                  type="button"
                  className="btn btn-dark-outline"
                  onClick={cerrarConfirmacion}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={confirmarAccion}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        <Toast
          mensaje={mensaje || error}
          tipo={tipoMensaje}
          onClose={() => {
            setMensaje("");
            setError("");
          }}
        />
      </div>
    </div>
  );
}

export default Pagos;