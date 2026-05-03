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
  const [loading, setLoading] = useState(true);

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

  const obtenerFechaLocal = (fecha) => {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(fecha.getDate()).padStart(2, "0")}`;
  };

  const cargarPagos = async () => {
    try {
      setLoading(true);
      setError("");

      const [resHistorial, resPendientes] = await Promise.all([
        authFetch(`${API_BASE}/Ventas/historial-pagos`),
        authFetch(`${API_BASE}/Ventas/comisiones-pendientes`),
      ]);

      if (!resHistorial || !resPendientes) return;

      const [dataHistorial, dataPendientes] = await Promise.all([
        resHistorial.json(),
        resPendientes.json(),
      ]);

      if (!resHistorial.ok) {
        setTipoMensaje("error");
        setError(dataHistorial.mensaje || "Error al cargar historial de pagos");
        return;
      }

      if (!resPendientes.ok) {
        setTipoMensaje("error");
        setError(dataPendientes.mensaje || "Error al cargar comisiones pendientes");
        return;
      }

      setHistorialPagos(dataHistorial || []);
      setComisionesPendientes(dataPendientes || []);
    } catch (err) {
      console.error(err);
      setTipoMensaje("error");
      setError("Error al cargar pagos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPagos();
  }, []);

  const aplicarFiltroHoy = () => {
    const hoy = obtenerFechaLocal(new Date());

    setFechaDesde(hoy);
    setFechaHasta(hoy);
    setFiltroRapidoActivo("hoy");
  };

  const aplicarFiltroSemana = () => {
    const hoy = new Date();
    const dia = hoy.getDay();
    const ajuste = dia === 0 ? 6 : dia - 1;

    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ajuste);

    setFechaDesde(obtenerFechaLocal(lunes));
    setFechaHasta(obtenerFechaLocal(hoy));
    setFiltroRapidoActivo("semana");
  };

  const aplicarFiltroMes = () => {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    setFechaDesde(obtenerFechaLocal(primerDia));
    setFechaHasta(obtenerFechaLocal(hoy));
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
          !String(p.trabajador || "")
            .toLowerCase()
            .includes(filtroTrabajador.toLowerCase())
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
          !String(p.trabajador || "")
            .toLowerCase()
            .includes(filtroTrabajador.toLowerCase())
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

  const trabajadoresConSaldo = useMemo(
    () =>
      pendientesFiltrados.filter(
        (p) => Number(p.totalComisionPendiente || 0) > 0
      ).length,
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

    const columnas = ["Trabajador", "Fecha de pago", "Monto pagado", "Observación"];

    const filas = pagosFiltrados.map((p) => [
      p.trabajador,
      new Date(p.fechaPago).toLocaleString(),
      `S/ ${Number(p.montoPagado || 0).toFixed(2)}`,
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
      montoPagado: Number(p.montoPagado || 0).toFixed(2),
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
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
              <h4 className="section-title">Filtros de pagos</h4>
              <p className="section-subtitle">
                Usa filtros rápidos o fechas específicas para revisar pagos e historial.
              </p>
            </div>

            <GoldBadge>{loading ? "Cargando..." : `${pagosFiltrados.length} pagos`}</GoldBadge>
          </div>

          <div className="filtros-rapidos mb-3">
            <button
              type="button"
              className={`btn ${filtroRapidoActivo === "hoy" ? "btn-gold" : "btn-dark-outline"}`}
              onClick={aplicarFiltroHoy}
            >
              Hoy
            </button>

            <button
              type="button"
              className={`btn ${filtroRapidoActivo === "semana" ? "btn-gold" : "btn-dark-outline"}`}
              onClick={aplicarFiltroSemana}
            >
              Semana
            </button>

            <button
              type="button"
              className={`btn ${filtroRapidoActivo === "mes" ? "btn-gold" : "btn-dark-outline"}`}
              onClick={aplicarFiltroMes}
            >
              Mes
            </button>

            <button
              type="button"
              className={`btn ${limpiandoActivo ? "btn-gold" : "btn-dark-outline"}`}
              onClick={limpiarFiltros}
            >
              {limpiandoActivo ? "↺ Limpiando..." : "Limpiar"}
            </button>
          </div>

          <div className="analisis-filtros mb-1">
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
              <label className="form-label" style={{ color: "#d4af37", fontWeight: 700 }}>
                Trabajador
              </label>
              <input
                type="text"
                className="form-control input-dark"
                placeholder="Buscar por nombre"
                value={filtroTrabajador}
                maxLength={120}
                onChange={(e) => {
                  setFiltroTrabajador(e.target.value);
                  setFiltroRapidoActivo("");
                }}
              />
            </div>

            <div className="filtro-item">
              <label className="form-label" style={{ color: "#d4af37", fontWeight: 700 }}>
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
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
              <h4 className="section-title">Resumen financiero</h4>
              <p className="section-subtitle">
                Vista general de pendientes y pagos registrados.
              </p>
            </div>

            <GoldBadge>{pagosFiltrados.length} pagos</GoldBadge>
          </div>

          <div className="dashboard-four-cols">
            <CardDark className="h-100">
              <p
                className="text-uppercase fw-semibold mb-2"
                style={{
                  color: "#f4d35e",
                  fontSize: "0.85rem",
                  letterSpacing: "1px",
                }}
              >
                Total pendiente
              </p>

              <h2 className="fw-bold mb-3" style={{ fontSize: "2.2rem", color: "#6b7280" }}>
                S/ {totalPendiente.toFixed(2)}
              </h2>

              <div
                className="p-3"
                style={{
                  background: "rgba(244, 211, 94, 0.08)",
                  borderRadius: "16px",
                  border: "1px solid rgba(244, 211, 94, 0.18)",
                  color: "#8b6f10",
                  fontWeight: 700,
                }}
              >
                Comisiones por pagar
              </div>
            </CardDark>

            <CardDark className="h-100">
              <p
                className="text-uppercase fw-semibold mb-2"
                style={{
                  color: "#22c55e",
                  fontSize: "0.85rem",
                  letterSpacing: "1px",
                }}
              >
                Total pagado
              </p>

              <h2 className="fw-bold mb-3" style={{ fontSize: "2.2rem", color: "#6b7280" }}>
                S/ {totalPagado.toFixed(2)}
              </h2>

              <div
                className="p-3"
                style={{
                  background: "rgba(34, 197, 94, 0.08)",
                  borderRadius: "16px",
                  border: "1px solid rgba(34, 197, 94, 0.18)",
                  color: "#166534",
                  fontWeight: 700,
                }}
              >
                Pagos filtrados
              </div>
            </CardDark>

            <CardDark className="h-100">
              <p
                className="text-uppercase fw-semibold mb-2"
                style={{
                  color: "#38bdf8",
                  fontSize: "0.85rem",
                  letterSpacing: "1px",
                }}
              >
                Trabajadores con saldo
              </p>

              <h2 className="fw-bold mb-3" style={{ fontSize: "2.2rem", color: "#6b7280" }}>
                {trabajadoresConSaldo}
              </h2>

              <div
                className="p-3"
                style={{
                  background: "rgba(56,189,248,.08)",
                  borderRadius: "16px",
                  border: "1px solid rgba(56,189,248,.18)",
                  color: "#075985",
                  fontWeight: 700,
                }}
              >
                Requieren pago
              </div>
            </CardDark>

            <CardDark className="h-100">
              <p
                className="text-uppercase fw-semibold mb-2"
                style={{
                  color: "#d4af37",
                  fontSize: "0.85rem",
                  letterSpacing: "1px",
                }}
              >
                Pagos registrados
              </p>

              <h2 className="fw-bold mb-3" style={{ fontSize: "2.2rem", color: "#6b7280" }}>
                {pagosFiltrados.length}
              </h2>

              <div
                className="p-3"
                style={{
                  background: "rgba(212,175,55,.08)",
                  borderRadius: "16px",
                  border: "1px solid rgba(212,175,55,.18)",
                  color: "#8b6f10",
                  fontWeight: 700,
                }}
              >
                En historial
              </div>
            </CardDark>
          </div>
        </CardDark>

        <CardDark className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
              <h4 className="section-title">Pendientes por trabajador</h4>
              <p className="section-subtitle">
                Revisa saldos y registra pagos parciales o totales.
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
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-4">
                  Cargando pendientes...
                </td>
              </tr>
            ) : pendientesFiltrados.length > 0 ? (
              pendientesFiltrados.map((p) => (
                <tr key={p.idTrabajador}>
                  <td style={{ fontWeight: 700 }}>{p.trabajador}</td>
                  <td>
                    {p.fechaPendiente
                      ? new Date(p.fechaPendiente).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>S/ {Number(p.totalGenerado || 0).toFixed(2)}</td>
                  <td style={{ color: "#f4d35e", fontWeight: 800 }}>
                    S/ {Number(p.totalComisionPendiente || 0).toFixed(2)}
                  </td>
                  <td style={{ color: "#22c55e", fontWeight: 800 }}>
                    S/ {Number(p.totalComisionPagada || 0).toFixed(2)}
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
                      disabled={
                        Number(p.totalComisionPendiente || 0) <= 0 ||
                        procesandoPago === p.idTrabajador
                      }
                    />

                    <div className="d-flex gap-2 mb-2">
                      <button
                        className="btn btn-sm"
                        disabled={
                          procesandoPago === p.idTrabajador ||
                          Number(p.totalComisionPendiente || 0) <= 0 ||
                          !obtenerMontoPago(p.idTrabajador) ||
                          obtenerMontoPago(p.idTrabajador) <= 0 ||
                          obtenerMontoPago(p.idTrabajador) >
                            Number(p.totalComisionPendiente || 0)
                        }
                        onClick={() =>
                          abrirConfirmacion(
                            `¿Confirmar pago parcial a ${p.trabajador}?`,
                            () =>
                              pagarParcial(
                                p.idTrabajador,
                                Number(p.totalComisionPendiente || 0)
                              )
                          )
                        }
                        style={{
                          background:
                            procesandoPago === p.idTrabajador
                              ? "#555"
                              : Number(p.totalComisionPendiente || 0) > 0 &&
                                obtenerMontoPago(p.idTrabajador) > 0 &&
                                obtenerMontoPago(p.idTrabajador) <=
                                  Number(p.totalComisionPendiente || 0)
                              ? "#d4af37"
                              : "#333",
                          color: "#111",
                          fontWeight: 700,
                          border: "none",
                        }}
                      >
                        {procesandoPago === p.idTrabajador ? "Procesando..." : "Parcial"}
                      </button>

                      <button
                        className="btn btn-sm"
                        disabled={
                          procesandoPago === p.idTrabajador ||
                          Number(p.totalComisionPendiente || 0) <= 0
                        }
                        onClick={() =>
                          abrirConfirmacion(
                            `¿Pagar todo lo pendiente a ${p.trabajador}?`,
                            () =>
                              pagarTodo(
                                p.idTrabajador,
                                Number(p.totalComisionPendiente || 0)
                              )
                          )
                        }
                        style={{
                          background:
                            procesandoPago === p.idTrabajador
                              ? "#555"
                              : Number(p.totalComisionPendiente || 0) > 0
                              ? "#22c55e"
                              : "#333",
                          color: "#fff",
                          fontWeight: 700,
                          border: "none",
                        }}
                      >
                        {procesandoPago === p.idTrabajador ? "Procesando..." : "Todo"}
                      </button>
                    </div>

                    {obtenerMontoPago(p.idTrabajador) >
                      Number(p.totalComisionPendiente || 0) && (
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
                Revisa cada pago registrado con sus filtros.
              </p>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <GoldBadge>{pagosFiltrados.length} registros</GoldBadge>

              <button
                type="button"
                className="btn btn-dark-outline export-btn d-flex align-items-center gap-2"
                onClick={exportarPagosPDF}
                disabled={pagosFiltrados.length === 0}
              >
                <FaFilePdf size={16} />
                PDF
              </button>

              <button
                type="button"
                className="btn btn-gold export-btn d-flex align-items-center gap-2"
                onClick={exportarPagosExcel}
                disabled={pagosFiltrados.length === 0}
              >
                <FaFileExcel size={16} />
                Excel
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
            {loading ? (
              <tr>
                <td colSpan="4" className="text-center py-4">
                  Cargando historial...
                </td>
              </tr>
            ) : pagosFiltrados.length > 0 ? (
              pagosFiltrados.map((p) => (
                <tr key={p.idPago}>
                  <td style={{ fontWeight: 700 }}>{p.trabajador}</td>
                  <td>{new Date(p.fechaPago).toLocaleString()}</td>
                  <td style={{ color: "#22c55e", fontWeight: 800 }}>
                    S/ {Number(p.montoPagado || 0).toFixed(2)}
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
          tipo={error ? "error" : tipoMensaje}
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