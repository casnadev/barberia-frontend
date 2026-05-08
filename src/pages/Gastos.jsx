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
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Eraser,
  Flame,
  Megaphone,
  Package,
  Phone,
  Plus,
  ReceiptText,
  Scissors,
  Search,
  ShieldCheck,
  ShowerHead,
  Sparkles,
  Trash2,
  Wrench,
  Wallet,
  Wifi,
  X,
} from "lucide-react";

const TIPOS_GASTO = [
  {
    value: "Alquiler",
    label: "Alquiler",
    icon: ReceiptText,
    descripcion: "Local o espacio",
  },
  {
    value: "Luz",
    label: "Luz",
    icon: Flame,
    descripcion: "Servicio eléctrico",
  },
  {
    value: "Agua",
    label: "Agua",
    icon: Droplets,
    descripcion: "Servicio de agua",
  },
  {
    value: "Internet",
    label: "Internet",
    icon: Wifi,
    descripcion: "Conexión del local",
  },
  {
    value: "Teléfono",
    label: "Teléfono",
    icon: Phone,
    descripcion: "Línea o móvil",
  },
  {
    value: "Insumos",
    label: "Insumos",
    icon: Package,
    descripcion: "Tintes, champús, ceras",
  },
  {
    value: "Lavandería",
    label: "Lavandería",
    icon: ShowerHead,
    descripcion: "Toallas y capas",
  },
  {
    value: "Herramientas",
    label: "Herramientas",
    icon: Scissors,
    descripcion: "Afilado o reparación",
  },
  {
    value: "Limpieza",
    label: "Limpieza",
    icon: Sparkles,
    descripcion: "Desinfección y aseo",
  },
  {
    value: "Marketing",
    label: "Marketing",
    icon: Megaphone,
    descripcion: "Publicidad y redes",
  },
  {
    value: "Seguros",
    label: "Seguros",
    icon: ShieldCheck,
    descripcion: "Protección del negocio",
  },
  {
    value: "Atención al cliente",
    label: "Atención",
    icon: Wallet,
    descripcion: "Café, agua, cortesía",
  },
  {
    value: "Mantenimiento",
    label: "Mantenimiento",
    icon: Wrench,
    descripcion: "Arreglos del local",
  },
  {
    value: "Otros",
    label: "Otros",
    icon: Plus,
    descripcion: "Otro gasto",
  },
];

const PAGE_SIZE_OPTIONS = [6, 10, 15, 25];

const FORM_INICIAL = {
  concepto: "",
  tipo: "",
  monto: "",
  fecha: "",
  observacion: "",
};

function ModalGasto({ abierto, titulo, children, onClose, ancho = "760px" }) {
  if (!abierto) return null;

  return (
    <div className="gastos-modal-backdrop">
      <div className="gastos-modal" style={{ maxWidth: ancho }}>
        <div className="gastos-modal-header">
          <h4>{titulo}</h4>

          <button className="gastos-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="gastos-modal-body">{children}</div>
      </div>
    </div>
  );
}

function ModalConfirmacion({ abierto, texto, onCancel, onConfirm }) {
  if (!abierto) return null;

  return (
    <div className="gastos-modal-backdrop">
      <div className="gastos-modal gastos-confirm-modal">
        <div className="gastos-modal-header">
          <h4>Confirmar eliminación</h4>

          <button className="gastos-modal-close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="gastos-modal-body">
          <p className="gastos-confirm-text">{texto}</p>

          <div className="gastos-modal-actions">
            <button type="button" className="btn btn-dark-outline" onClick={onCancel}>
              Cancelar
            </button>

            <button type="button" className="btn gastos-danger-btn" onClick={onConfirm}>
              <Trash2 size={16} />
              Eliminar
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
    <div className="gastos-pagination">
      <div className="gastos-pagination-info">
        Mostrando <b>{from}</b> - <b>{to}</b> de <b>{total}</b>
      </div>

      <div className="gastos-pagination-controls">
        <select
          className="form-control input-dark gastos-page-size"
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

        <span className="gastos-page-number">
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

function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("success");
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtroConcepto, setFiltroConcepto] = useState("");
  const [filtroRapidoActivo, setFiltroRapidoActivo] = useState("");
  const [limpiandoActivo, setLimpiandoActivo] = useState(false);

  const [form, setForm] = useState(FORM_INICIAL);

  const [modalCrear, setModalCrear] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [gastoEliminar, setGastoEliminar] = useState(null);

  const [pagina, setPagina] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const cargarGastos = async () => {
    try {
      setError("");

      const res = await authFetch(`${API_BASE}/Gastos`);
      if (!res) return;

      const data = await leerJsonSeguro(res, []);

      if (!res.ok) {
        setTipoMensaje("error");
        setError(data.mensaje || "Error al cargar gastos");
        return;
      }

      setGastos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setTipoMensaje("error");
      setError("Error al cargar gastos");
    }
  };

  useEffect(() => {
    cargarGastos();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actualizarForm = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const seleccionarTipoGasto = (tipo) => {
    setForm((prev) => ({
      ...prev,
      tipo: tipo.value,
      concepto:
        prev.concepto.trim() || tipo.value === "Atención al cliente"
          ? prev.concepto
          : tipo.value,
    }));
  };

  const aplicarFiltroHoy = () => {
    const hoy = obtenerFechaLocal(new Date());

    setFechaDesde(hoy);
    setFechaHasta(hoy);
    setFiltroRapidoActivo("hoy");
    setPagina(1);
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
    setPagina(1);
  };

  const aplicarFiltroMes = () => {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    setFechaDesde(obtenerFechaLocal(inicio));
    setFechaHasta(obtenerFechaLocal(hoy));
    setFiltroRapidoActivo("mes");
    setPagina(1);
  };

  const limpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
    setFiltroConcepto("");
    setFiltroRapidoActivo("");
    setPagina(1);

    setLimpiandoActivo(true);
    setTimeout(() => {
      setLimpiandoActivo(false);
    }, 400);

    setTipoMensaje("info");
    setMensaje("Filtros restablecidos");
  };

  const limpiarFormulario = () => {
    setForm(FORM_INICIAL);
  };

  const abrirModalCrear = () => {
    setMensaje("");
    setError("");

    const hoy = obtenerFechaLocal(new Date());

    setForm({
      ...FORM_INICIAL,
      fecha: hoy,
    });

    setModalCrear(true);
  };

  const cerrarModalCrear = () => {
    setModalCrear(false);
    limpiarFormulario();
  };

  const gastosFiltrados = useMemo(() => {
    return gastos.filter((g) => {
      const fecha = new Date(g.fecha);

      if (fechaDesde) {
        const desde = new Date(`${fechaDesde}T00:00:00`);
        if (fecha < desde) return false;
      }

      if (fechaHasta) {
        const hasta = new Date(`${fechaHasta}T23:59:59.999`);
        if (fecha > hasta) return false;
      }

      if (
        filtroConcepto &&
        !String(g.concepto || "")
          .toLowerCase()
          .includes(filtroConcepto.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [gastos, fechaDesde, fechaHasta, filtroConcepto]);

  const gastosPaginados = useMemo(() => {
    const inicio = (pagina - 1) * pageSize;
    return gastosFiltrados.slice(inicio, inicio + pageSize);
  }, [gastosFiltrados, pagina, pageSize]);

  useEffect(() => {
    setPagina(1);
  }, [fechaDesde, fechaHasta, filtroConcepto]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(gastosFiltrados.length / pageSize));
    if (pagina > maxPage) setPagina(maxPage);
  }, [gastosFiltrados.length, pageSize, pagina]);

  const totalGastos = useMemo(
    () => gastosFiltrados.reduce((acc, g) => acc + Number(g.monto || 0), 0),
    [gastosFiltrados]
  );

  const cantidadGastos = gastosFiltrados.length;

  const gastoPromedio = useMemo(() => {
    if (!cantidadGastos) return 0;
    return totalGastos / cantidadGastos;
  }, [cantidadGastos, totalGastos]);

  const tiposDistintos = useMemo(
    () => new Set(gastosFiltrados.map((g) => g.tipo).filter(Boolean)).size,
    [gastosFiltrados]
  );

  const tipoTop = useMemo(() => {
    const mapa = new Map();

    gastosFiltrados.forEach((g) => {
      const key = g.tipo || "Sin tipo";
      mapa.set(key, (mapa.get(key) || 0) + Number(g.monto || 0));
    });

    return Array.from(mapa.entries())
      .map(([tipo, total]) => ({ tipo, total }))
      .sort((a, b) => b.total - a.total)[0];
  }, [gastosFiltrados]);

  const guardarGasto = async () => {
    setMensaje("");
    setError("");

    const conceptoLimpio = form.concepto.trim();
    const tipoLimpio = form.tipo.trim();
    const observacionLimpia = form.observacion.trim();
    const montoNumero = Number(form.monto);

    if (!conceptoLimpio) {
      setTipoMensaje("error");
      setError("El concepto es obligatorio.");
      return;
    }

    if (!tipoLimpio) {
      setTipoMensaje("error");
      setError("Selecciona el tipo de gasto.");
      return;
    }

    if (!montoNumero || montoNumero <= 0) {
      setTipoMensaje("error");
      setError("El monto debe ser mayor a 0.");
      return;
    }

    if (!form.fecha) {
      setTipoMensaje("error");
      setError("Selecciona una fecha.");
      return;
    }

    try {
      setGuardando(true);

      const res = await authFetch(`${API_BASE}/Gastos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: form.fecha,
          concepto: conceptoLimpio,
          tipo: tipoLimpio,
          monto: montoNumero,
          observacion: observacionLimpia,
        }),
      });

      if (!res) return;

      const data = await leerJsonSeguro(res, {});

      if (!res.ok) {
        setTipoMensaje("error");
        setError(data.mensaje || "Error al guardar gasto");
        return;
      }

      setTipoMensaje("success");
      setMensaje("Gasto registrado correctamente.");
      limpiarFormulario();
      setModalCrear(false);

      await cargarGastos();
    } catch (err) {
      console.error(err);
      setTipoMensaje("error");
      setError("Error al guardar gasto");
    } finally {
      setGuardando(false);
    }
  };

  const abrirEliminarGasto = (gasto) => {
    setGastoEliminar(gasto);
    setModalEliminar(true);
  };

  const cerrarEliminarGasto = () => {
    setGastoEliminar(null);
    setModalEliminar(false);
  };

  const eliminarGasto = async () => {
    if (!gastoEliminar) return;

    const id = gastoEliminar.idGasto;

    setMensaje("");
    setError("");

    try {
      setEliminandoId(id);

      const res = await authFetch(`${API_BASE}/Gastos/${id}`, {
        method: "DELETE",
      });

      if (!res) return;

      const data = await leerJsonSeguro(res, {});

      if (!res.ok) {
        setTipoMensaje("error");
        setError(data.mensaje || "Error al eliminar gasto");
        return;
      }

      setTipoMensaje("success");
      setMensaje("Gasto eliminado correctamente.");
      cerrarEliminarGasto();

      await cargarGastos();
    } catch (err) {
      console.error(err);
      setTipoMensaje("error");
      setError("Error al eliminar gasto");
    } finally {
      setEliminandoId(null);
    }
  };

  const exportarGastosPDF = async () => {
    if (gastosFiltrados.length === 0) {
      setTipoMensaje("error");
      setError("No hay gastos para exportar en PDF.");
      return;
    }

    const columnas = ["Fecha", "Concepto", "Tipo", "Monto", "Observación"];

    const filas = gastosFiltrados.map((g) => [
      new Date(g.fecha).toLocaleDateString(),
      g.concepto,
      g.tipo,
      `S/ ${Number(g.monto || 0).toFixed(2)}`,
      g.observacion || "-",
    ]);

    await exportarPDF({
      titulo: "Reporte de Gastos",
      columnas,
      filas,
      nombreArchivo: "Gastos",
    });

    setTipoMensaje("success");
    setMensaje("PDF generado correctamente.");
  };

  const exportarGastosExcel = async () => {
    if (gastosFiltrados.length === 0) {
      setTipoMensaje("error");
      setError("No hay gastos para exportar en Excel.");
      return;
    }

    const columnas = [
      { header: "Fecha", key: "fecha", width: 20 },
      { header: "Concepto", key: "concepto", width: 30 },
      { header: "Tipo", key: "tipo", width: 20 },
      { header: "Monto", key: "monto", width: 15 },
      { header: "Observación", key: "observacion", width: 30 },
    ];

    const filas = gastosFiltrados.map((g) => ({
      fecha: new Date(g.fecha).toLocaleDateString(),
      concepto: g.concepto,
      tipo: g.tipo,
      monto: Number(g.monto || 0),
      observacion: g.observacion || "-",
    }));

    await exportarExcel({
      titulo: "Reporte de Gastos",
      columnas,
      filas,
      nombreArchivo: "Gastos",
    });

    setTipoMensaje("success");
    setMensaje("Excel generado correctamente.");
  };

  const KpiGasto = ({ title, value, note, icon: KpiIcon, variant = "gold", money = true }) => {
    const IconComponent = KpiIcon;

    return (
      <CardDark className={`gastos-kpi-card ${variant}`}>
        <div className="gastos-kpi-icon">
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
    <div className="page-shell gastos-page">
      <div className="container-fluid py-4">
        <CardDark className="gastos-header-card mb-4">
          <div className="gastos-header-row">
            <PageHeader
              title="Gastos"
              subtitle="Controla los egresos del negocio de forma rápida y ordenada."
            />

            <div className="gastos-header-actions">
              <GoldBadge>{gastosFiltrados.length} registros</GoldBadge>
              <GoldBadge>S/ {totalGastos.toFixed(2)}</GoldBadge>

              <button className="btn btn-gold" onClick={abrirModalCrear}>
                <Plus size={16} />
                Nuevo gasto
              </button>
            </div>
          </div>
        </CardDark>

        <CardDark className="mb-4 gastos-filter-card">
          <div className="gastos-section-head">
            <div>
              <h4 className="section-title">Filtros de gastos</h4>
              <p className="section-subtitle">
                Revisa gastos por fecha o concepto.
              </p>
            </div>

            <div className="gastos-search-badge">
              <Search size={16} />
              {filtroConcepto ? "Búsqueda activa" : "Sin búsqueda"}
            </div>
          </div>

          <div className="gastos-quick-filters">
            <button
              className={`btn ${filtroRapidoActivo === "hoy" ? "btn-gold" : "btn-dark-outline"}`}
              onClick={aplicarFiltroHoy}
            >
              Hoy
            </button>

            <button
              className={`btn ${filtroRapidoActivo === "semana" ? "btn-gold" : "btn-dark-outline"}`}
              onClick={aplicarFiltroSemana}
            >
              Semana
            </button>

            <button
              className={`btn ${filtroRapidoActivo === "mes" ? "btn-gold" : "btn-dark-outline"}`}
              onClick={aplicarFiltroMes}
            >
              Mes
            </button>

            <button
              className={`btn ${limpiandoActivo ? "btn-gold" : "btn-dark-outline"}`}
              onClick={limpiarFiltros}
            >
              <Eraser size={16} />
              {limpiandoActivo ? "Limpiando..." : "Limpiar"}
            </button>
          </div>

          <div className="gastos-filter-grid">
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
              <label className="label-gold">Concepto</label>
              <input
                className="form-control input-dark"
                placeholder="Buscar concepto"
                value={filtroConcepto}
                maxLength={150}
                onChange={(e) => {
                  setFiltroConcepto(e.target.value);
                  setFiltroRapidoActivo("");
                }}
              />
            </div>

            <div className="filtro-item">
              <label className="label-gold">Vista</label>
              <input
                className="form-control input-dark"
                value="Gastos registrados"
                disabled
              />
            </div>
          </div>
        </CardDark>

        <section className="gastos-kpi-grid mb-4">
          <KpiGasto
            title="Total filtrado"
            value={totalGastos}
            note="Suma de egresos"
            icon={Wallet}
            variant="danger"
          />

          <KpiGasto
            title="Registros"
            value={cantidadGastos}
            note="Gastos encontrados"
            icon={ReceiptText}
            variant="gold"
            money={false}
          />

          <KpiGasto
            title="Promedio"
            value={gastoPromedio}
            note="Promedio por gasto"
            icon={Banknote}
            variant="info"
          />

          <KpiGasto
            title="Tipos"
            value={tiposDistintos}
            note={tipoTop ? `Top: ${tipoTop.tipo}` : "Sin datos"}
            icon={CalendarDays}
            variant="purple"
            money={false}
          />
        </section>

        <CardDark className="gastos-section-card">
          <div className="gastos-section-head">
            <div>
              <h4 className="section-title">Historial de gastos</h4>
              <p className="section-subtitle">
                Revisa, exporta o elimina gastos registrados.
              </p>
            </div>

            <div className="gastos-export-actions">
              <GoldBadge>{gastosFiltrados.length} registros</GoldBadge>

              <button
                className="btn btn-dark-outline export-btn"
                onClick={exportarGastosPDF}
                disabled={gastosFiltrados.length === 0}
              >
                <FaFilePdf size={16} />
                PDF
              </button>

              <button
                className="btn btn-gold export-btn"
                onClick={exportarGastosExcel}
                disabled={gastosFiltrados.length === 0}
              >
                <FaFileExcel size={16} />
                Excel
              </button>
            </div>
          </div>

          <div className="gastos-mobile-cards">
            {gastosPaginados.length > 0 ? (
              gastosPaginados.map((g) => (
                <div className="gastos-history-card" key={g.idGasto}>
                  <div className="gastos-history-top">
                    <div>
                      <h5>{g.concepto}</h5>
                      <span>{new Date(g.fecha).toLocaleDateString()}</span>
                    </div>

                    <b>S/ {Number(g.monto || 0).toFixed(2)}</b>
                  </div>

                  <div className="gastos-history-info">
                    <span>{g.tipo}</span>
                    <p>{g.observacion || "Sin observación"}</p>
                  </div>

                  <button
                    className="btn gastos-danger-btn w-100"
                    onClick={() => abrirEliminarGasto(g)}
                    disabled={eliminandoId === g.idGasto}
                  >
                    <Trash2 size={16} />
                    {eliminandoId === g.idGasto ? "Eliminando..." : "Eliminar"}
                  </button>
                </div>
              ))
            ) : (
              <div className="gastos-empty-card">
                <ReceiptText size={34} />
                <p>No hay gastos registrados.</p>
              </div>
            )}
          </div>

          <div className="gastos-table-wrap">
            <TableDark
              headers={["Fecha", "Concepto", "Tipo", "Monto", "Obs", "Acciones"]}
            >
              {gastosPaginados.length > 0 ? (
                gastosPaginados.map((g) => (
                  <tr key={g.idGasto}>
                    <td>{new Date(g.fecha).toLocaleDateString()}</td>
                    <td className="gastos-table-name">{g.concepto}</td>
                    <td>
                      <span className="gastos-type-pill">{g.tipo}</span>
                    </td>
                    <td className="gastos-danger-cell">
                      S/ {Number(g.monto || 0).toFixed(2)}
                    </td>
                    <td>{g.observacion || "-"}</td>
                    <td>
                      <button
                        className="btn btn-sm gastos-danger-btn"
                        onClick={() => abrirEliminarGasto(g)}
                        disabled={eliminandoId === g.idGasto}
                      >
                        <Trash2 size={14} />
                        {eliminandoId === g.idGasto ? "Eliminando..." : "Eliminar"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    No hay gastos registrados.
                  </td>
                </tr>
              )}
            </TableDark>
          </div>

          <Paginador
            page={pagina}
            pageSize={pageSize}
            total={gastosFiltrados.length}
            onPageChange={setPagina}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPagina(1);
            }}
          />
        </CardDark>

        <ModalGasto
          abierto={modalCrear}
          titulo="Nuevo gasto"
          onClose={cerrarModalCrear}
          ancho="820px"
        >
          <div className="gastos-modal-intro">
            <ReceiptText size={22} />
            <div>
              <h5>Registrar egreso</h5>
              <p>Elige una categoría, completa el concepto y guarda el gasto.</p>
            </div>
          </div>

          <div className="gastos-tipo-section">
            <div className="gastos-tipo-head">
              <div>
                <h5>Tipo de gasto</h5>
                <p>Selecciona una opción rápida.</p>
              </div>

              {form.tipo && <GoldBadge>{form.tipo}</GoldBadge>}
            </div>

            <div className="gastos-tipo-carousel">
              {TIPOS_GASTO.map((tipo) => {
                const Icon = tipo.icon;
                const selected = form.tipo === tipo.value;

                return (
                  <button
                    type="button"
                    key={tipo.value}
                    className={`gastos-tipo-card ${selected ? "selected" : ""}`}
                    onClick={() => seleccionarTipoGasto(tipo)}
                  >
                    <div className="gastos-tipo-icon">
                      <Icon size={20} />
                    </div>

                    <h6>{tipo.label}</h6>
                    <p>{tipo.descripcion}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-md-6">
              <label className="label-gold">Concepto</label>
              <input
                className="form-control input-dark"
                placeholder="Ej: Compra de shampoo"
                value={form.concepto}
                maxLength={150}
                onChange={(e) => actualizarForm("concepto", e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="label-gold">Tipo seleccionado</label>
              <input
                className="form-control input-dark"
                placeholder="Selecciona una categoría"
                value={form.tipo}
                maxLength={80}
                onChange={(e) => actualizarForm("tipo", e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="label-gold">Monto</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control input-dark"
                placeholder="0.00"
                value={form.monto}
                onChange={(e) => actualizarForm("monto", e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="label-gold">Fecha</label>
              <input
                type="date"
                className="form-control input-dark"
                value={form.fecha}
                onChange={(e) => actualizarForm("fecha", e.target.value)}
              />
            </div>

            <div className="col-12">
              <label className="label-gold">Observación</label>
              <textarea
                className="form-control input-dark"
                placeholder="Detalle opcional"
                value={form.observacion}
                rows="3"
                maxLength={300}
                onChange={(e) => actualizarForm("observacion", e.target.value)}
              />
            </div>
          </div>

          <div className="gastos-modal-actions">
            <button className="btn btn-dark-outline" onClick={cerrarModalCrear}>
              Cancelar
            </button>

            <button className="btn btn-gold" onClick={guardarGasto} disabled={guardando}>
              <Plus size={16} />
              {guardando ? "Guardando..." : "Guardar gasto"}
            </button>
          </div>
        </ModalGasto>

        <ModalConfirmacion
          abierto={modalEliminar}
          texto={`¿Eliminar el gasto "${gastoEliminar?.concepto || ""}"? Esta acción no se puede deshacer.`}
          onCancel={cerrarEliminarGasto}
          onConfirm={eliminarGasto}
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

export default Gastos;
