import { useEffect, useMemo, useState } from "react";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";

import CardDark from "../components/ui/CardDark";
import PageHeader from "../components/ui/PageHeader";
import GoldBadge from "../components/ui/GoldBadge";
import TableDark from "../components/ui/TableDark";
import Toast from "../components/ui/Toast";
import DateFilter from "../components/ui/DateFilter";
import AnimatedNumber from "../components/ui/AnimatedNumber";

import { exportarPDF } from "../utils/exportPdf";
import { exportarExcel } from "../utils/exportExcel";

import { FaFilePdf, FaFileExcel } from "react-icons/fa";
import {
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eraser,
  Search,
  Wallet,
  X,
  Users,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [6, 10, 15, 25];

function ModalConfirmacion({ abierto, texto, onCancel, onConfirm }) {
  if (!abierto) return null;

  return (
    <div className="pagos-modal-backdrop">
      <div className="pagos-modal">
        <div className="pagos-modal-header">
          <h4>Confirmar pago</h4>

          <button className="pagos-modal-close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="pagos-modal-body">
          <p>{texto}</p>

          <div className="pagos-modal-actions">
            <button type="button" className="btn btn-dark-outline" onClick={onCancel}>
              Cancelar
            </button>

            <button type="button" className="btn btn-gold" onClick={onConfirm}>
              <CheckCircle2 size={16} />
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Paginador({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="pagos-pagination">
      <div className="pagos-pagination-info">
        Mostrando <b>{from}</b> - <b>{to}</b> de <b>{total}</b>
      </div>

      <div className="pagos-pagination-controls">
        <select
          className="form-control input-dark pagos-page-size"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} por página
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn btn-dark-outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} />
        </button>

        <span className="pagos-page-number">
          {page} / {totalPages}
        </span>

        <button
          type="button"
          className="btn btn-dark-outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

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

  const [paginaPendientes, setPaginaPendientes] = useState(1);
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const [pageSizePendientes, setPageSizePendientes] = useState(6);
  const [pageSizeHistorial, setPageSizeHistorial] = useState(10);

  const obtenerFechaLocal = (fecha) => {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(fecha.getDate()).padStart(2, "0")}`;
  };

  const leerJsonSeguro = async (res, valorDefecto) => {
    try {
      if (!res) return valorDefecto;
      return await res.json();
    } catch {
      return valorDefecto;
    }
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
        leerJsonSeguro(resHistorial, []),
        leerJsonSeguro(resPendientes, []),
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

      setHistorialPagos(Array.isArray(dataHistorial) ? dataHistorial : []);
      setComisionesPendientes(Array.isArray(dataPendientes) ? dataPendientes : []);
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aplicarFiltroHoy = () => {
    const hoy = obtenerFechaLocal(new Date());

    setFechaDesde(hoy);
    setFechaHasta(hoy);
    setFiltroRapidoActivo("hoy");
    setPaginaHistorial(1);
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
    setPaginaHistorial(1);
  };

  const aplicarFiltroMes = () => {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    setFechaDesde(obtenerFechaLocal(primerDia));
    setFechaHasta(obtenerFechaLocal(hoy));
    setFiltroRapidoActivo("mes");
    setPaginaHistorial(1);
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

  const pagosPaginados = useMemo(() => {
    const inicio = (paginaHistorial - 1) * pageSizeHistorial;
    return pagosFiltrados.slice(inicio, inicio + pageSizeHistorial);
  }, [pagosFiltrados, paginaHistorial, pageSizeHistorial]);

  const pendientesPaginados = useMemo(() => {
    const inicio = (paginaPendientes - 1) * pageSizePendientes;
    return pendientesFiltrados.slice(inicio, inicio + pageSizePendientes);
  }, [pendientesFiltrados, paginaPendientes, pageSizePendientes]);

  useEffect(() => {
    setPaginaPendientes(1);
    setPaginaHistorial(1);
  }, [filtroTrabajador, fechaDesde, fechaHasta]);

  useEffect(() => {
    const maxPendientes = Math.max(1, Math.ceil(pendientesFiltrados.length / pageSizePendientes));
    if (paginaPendientes > maxPendientes) setPaginaPendientes(maxPendientes);
  }, [pendientesFiltrados.length, pageSizePendientes, paginaPendientes]);

  useEffect(() => {
    const maxHistorial = Math.max(1, Math.ceil(pagosFiltrados.length / pageSizeHistorial));
    if (paginaHistorial > maxHistorial) setPaginaHistorial(maxHistorial);
  }, [pagosFiltrados.length, pageSizeHistorial, paginaHistorial]);

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
    const limpio = String(valor).replace(",", ".");

    setMontosPago((prev) => ({
      ...prev,
      [idTrabajador]: limpio,
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

      const data = await leerJsonSeguro(res, {});

      if (!res.ok) {
        setTipoMensaje("error");
        setError(data.mensaje || "Error al registrar pago parcial");
        return;
      }

      setTipoMensaje("success");
      setMensaje(`Pago parcial registrado: S/ ${Number(data.totalPagado || monto).toFixed(2)}`);

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

      const data = await leerJsonSeguro(res, {});

      if (!res.ok) {
        setTipoMensaje("error");
        setError(data.mensaje || "Error al pagar comisiones");
        return;
      }

      setTipoMensaje("success");
      setMensaje(
        `Pago total realizado: S/ ${Number(data.totalPagado || totalPendienteTrabajador).toFixed(2)}`
      );

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

  const KpiPago = ({ title, value, note, icon: KpiIcon, variant = "gold", money = true }) => {
    const IconComponent = KpiIcon;

    return (
      <CardDark className={`pagos-kpi-card ${variant}`}>
        <div className="pagos-kpi-icon">
          {IconComponent && <IconComponent size={22} />}
        </div>

        <p>{title}</p>

        <h2>
          {money ? (
            <AnimatedNumber value={Number(value || 0)} prefix="S/ " decimals={2} />
          ) : (
            <AnimatedNumber value={Number(value || 0)} decimals={0} />
          )}
        </h2>

        <span>{note}</span>
      </CardDark>
    );
  };

  return (
    <div className="page-shell pagos-page">
      <div className="container-fluid py-4">
        <CardDark className="pagos-header-card mb-4">
          <div className="pagos-header-row">
            <PageHeader
              title="Pagos"
              subtitle="Gestiona comisiones pendientes, pagos parciales, pagos totales e historial."
            />

            <div className="pagos-header-actions">
              <GoldBadge>{loading ? "Cargando..." : `${pendientesFiltrados.length} pendientes`}</GoldBadge>
              <GoldBadge>{pagosFiltrados.length} pagos</GoldBadge>
            </div>
          </div>
        </CardDark>

        <CardDark className="mb-4 pagos-filter-card">
          <div className="pagos-section-head">
            <div>
              <h4 className="section-title">Filtros de pagos</h4>
              <p className="section-subtitle">
                Busca por fecha o trabajador para revisar pagos e historial.
              </p>
            </div>

            <div className="pagos-search-badge">
              <Search size={16} />
              {filtroTrabajador ? "Búsqueda activa" : "Sin búsqueda"}
            </div>
          </div>

          <div className="pagos-quick-filters">
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
              <Eraser size={16} />
              {limpiandoActivo ? "Limpiando..." : "Limpiar"}
            </button>
          </div>

          <div className="pagos-filter-grid">
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
              <label className="label-gold">Trabajador</label>
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
              <label className="label-gold">Vista</label>
              <input
                type="text"
                className="form-control input-dark"
                value="Pendientes e historial"
                disabled
              />
            </div>
          </div>
        </CardDark>

        <section className="pagos-kpi-grid mb-4">
          <KpiPago
            title="Total pendiente"
            value={totalPendiente}
            note="Comisiones por pagar"
            icon={Clock}
            variant="gold"
          />

          <KpiPago
            title="Total pagado"
            value={totalPagado}
            note="Pagos filtrados"
            icon={Wallet}
            variant="success"
          />

          <KpiPago
            title="Con saldo"
            value={trabajadoresConSaldo}
            note="Trabajadores por pagar"
            icon={Users}
            variant="info"
            money={false}
          />

          <KpiPago
            title="Pagos registrados"
            value={pagosFiltrados.length}
            note="Registros en historial"
            icon={Banknote}
            variant="purple"
            money={false}
          />
        </section>

        <CardDark className="mb-4 pagos-section-card">
          <div className="pagos-section-head">
            <div>
              <h4 className="section-title">Pendientes por trabajador</h4>
              <p className="section-subtitle">
                Registra pagos parciales o liquida todo lo pendiente.
              </p>
            </div>

            <GoldBadge>{pendientesFiltrados.length} trabajadores</GoldBadge>
          </div>

          <div className="pagos-mobile-cards">
            {loading ? (
              <p className="section-subtitle mb-0">Cargando pendientes...</p>
            ) : pendientesPaginados.length > 0 ? (
              pendientesPaginados.map((p) => {
                const pendiente = Number(p.totalComisionPendiente || 0);
                const monto = obtenerMontoPago(p.idTrabajador);
                const excede = monto > pendiente;

                return (
                  <div className="pagos-worker-card" key={p.idTrabajador}>
                    <div className="pagos-worker-head">
                      <div>
                        <h5>{p.trabajador}</h5>
                        <span>
                          {p.fechaPendiente
                            ? new Date(p.fechaPendiente).toLocaleDateString()
                            : "Sin fecha"}
                        </span>
                      </div>

                      <b>S/ {pendiente.toFixed(2)}</b>
                    </div>

                    <div className="pagos-worker-grid">
                      <div>
                        <span>Generado</span>
                        <b>S/ {Number(p.totalGenerado || 0).toFixed(2)}</b>
                      </div>

                      <div>
                        <span>Pagado</span>
                        <b className="success">
                          S/ {Number(p.totalComisionPagada || 0).toFixed(2)}
                        </b>
                      </div>
                    </div>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Monto parcial"
                      className="form-control input-dark"
                      value={montosPago[p.idTrabajador] || ""}
                      onChange={(e) => cambiarMontoPago(p.idTrabajador, e.target.value)}
                      disabled={pendiente <= 0 || procesandoPago === p.idTrabajador}
                    />

                    {excede && (
                      <small className="pagos-error-text">
                        El monto excede lo pendiente.
                      </small>
                    )}

                    <div className="pagos-worker-actions">
                      <button
                        className="btn btn-gold"
                        disabled={
                          procesandoPago === p.idTrabajador ||
                          pendiente <= 0 ||
                          !monto ||
                          monto <= 0 ||
                          excede
                        }
                        onClick={() =>
                          abrirConfirmacion(
                            `¿Confirmar pago parcial a ${p.trabajador}?`,
                            () => pagarParcial(p.idTrabajador, pendiente)
                          )
                        }
                      >
                        {procesandoPago === p.idTrabajador ? "Procesando..." : "Parcial"}
                      </button>

                      <button
                        className="btn pagos-pay-all"
                        disabled={procesandoPago === p.idTrabajador || pendiente <= 0}
                        onClick={() =>
                          abrirConfirmacion(
                            `¿Pagar todo lo pendiente a ${p.trabajador}?`,
                            () => pagarTodo(p.idTrabajador, pendiente)
                          )
                        }
                      >
                        {procesandoPago === p.idTrabajador ? "Procesando..." : "Todo"}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="pagos-empty-card">
                <CheckCircle2 size={34} />
                <p>No hay saldos pendientes.</p>
              </div>
            )}
          </div>

          <div className="pagos-table-wrap">
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
              ) : pendientesPaginados.length > 0 ? (
                pendientesPaginados.map((p) => {
                  const pendiente = Number(p.totalComisionPendiente || 0);
                  const monto = obtenerMontoPago(p.idTrabajador);
                  const excede = monto > pendiente;

                  return (
                    <tr key={p.idTrabajador}>
                      <td className="pagos-table-name">{p.trabajador}</td>
                      <td>
                        {p.fechaPendiente
                          ? new Date(p.fechaPendiente).toLocaleDateString()
                          : "-"}
                      </td>
                      <td>S/ {Number(p.totalGenerado || 0).toFixed(2)}</td>
                      <td className="pagos-warning-cell">
                        S/ {pendiente.toFixed(2)}
                      </td>
                      <td className="pagos-success-cell">
                        S/ {Number(p.totalComisionPagada || 0).toFixed(2)}
                      </td>
                      <td className="pagos-actions-cell">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Monto"
                          className="form-control input-dark mb-2"
                          value={montosPago[p.idTrabajador] || ""}
                          onChange={(e) => cambiarMontoPago(p.idTrabajador, e.target.value)}
                          disabled={pendiente <= 0 || procesandoPago === p.idTrabajador}
                        />

                        <div className="pagos-row-actions">
                          <button
                            className="btn btn-sm btn-gold"
                            disabled={
                              procesandoPago === p.idTrabajador ||
                              pendiente <= 0 ||
                              !monto ||
                              monto <= 0 ||
                              excede
                            }
                            onClick={() =>
                              abrirConfirmacion(
                                `¿Confirmar pago parcial a ${p.trabajador}?`,
                                () => pagarParcial(p.idTrabajador, pendiente)
                              )
                            }
                          >
                            {procesandoPago === p.idTrabajador ? "Procesando..." : "Parcial"}
                          </button>

                          <button
                            className="btn btn-sm pagos-pay-all"
                            disabled={procesandoPago === p.idTrabajador || pendiente <= 0}
                            onClick={() =>
                              abrirConfirmacion(
                                `¿Pagar todo lo pendiente a ${p.trabajador}?`,
                                () => pagarTodo(p.idTrabajador, pendiente)
                              )
                            }
                          >
                            {procesandoPago === p.idTrabajador ? "Procesando..." : "Todo"}
                          </button>
                        </div>

                        {excede && (
                          <small className="pagos-error-text">
                            El monto excede lo pendiente.
                          </small>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    No hay saldos pendientes
                  </td>
                </tr>
              )}
            </TableDark>
          </div>

          <Paginador
            page={paginaPendientes}
            pageSize={pageSizePendientes}
            total={pendientesFiltrados.length}
            onPageChange={setPaginaPendientes}
            onPageSizeChange={(size) => {
              setPageSizePendientes(size);
              setPaginaPendientes(1);
            }}
          />
        </CardDark>

        <CardDark className="pagos-section-card">
          <div className="pagos-section-head">
            <div>
              <h4 className="section-title">Historial de pagos</h4>
              <p className="section-subtitle">
                Revisa cada pago registrado con sus filtros.
              </p>
            </div>

            <div className="pagos-export-actions">
              <GoldBadge>{pagosFiltrados.length} registros</GoldBadge>

              <button
                type="button"
                className="btn btn-dark-outline export-btn"
                onClick={exportarPagosPDF}
                disabled={pagosFiltrados.length === 0}
              >
                <FaFilePdf size={16} />
                PDF
              </button>

              <button
                type="button"
                className="btn btn-gold export-btn"
                onClick={exportarPagosExcel}
                disabled={pagosFiltrados.length === 0}
              >
                <FaFileExcel size={16} />
                Excel
              </button>
            </div>
          </div>

          <div className="pagos-history-mobile">
            {loading ? (
              <p className="section-subtitle mb-0">Cargando historial...</p>
            ) : pagosPaginados.length > 0 ? (
              pagosPaginados.map((p) => (
                <div className="pagos-history-card" key={p.idPago}>
                  <div>
                    <h5>{p.trabajador}</h5>
                    <span>{new Date(p.fechaPago).toLocaleString()}</span>
                    <p>{p.observacion || "Sin observación"}</p>
                  </div>

                  <b>S/ {Number(p.montoPagado || 0).toFixed(2)}</b>
                </div>
              ))
            ) : (
              <div className="pagos-empty-card">
                <Wallet size={34} />
                <p>No hay pagos registrados.</p>
              </div>
            )}
          </div>

          <div className="pagos-table-wrap">
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
              ) : pagosPaginados.length > 0 ? (
                pagosPaginados.map((p) => (
                  <tr key={p.idPago}>
                    <td className="pagos-table-name">{p.trabajador}</td>
                    <td>{new Date(p.fechaPago).toLocaleString()}</td>
                    <td className="pagos-success-cell">
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
          </div>

          <Paginador
            page={paginaHistorial}
            pageSize={pageSizeHistorial}
            total={pagosFiltrados.length}
            onPageChange={setPaginaHistorial}
            onPageSizeChange={(size) => {
              setPageSizeHistorial(size);
              setPaginaHistorial(1);
            }}
          />
        </CardDark>

        <ModalConfirmacion
          abierto={modalConfirmacion}
          texto={textoConfirmacion}
          onCancel={cerrarConfirmacion}
          onConfirm={confirmarAccion}
        />

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
