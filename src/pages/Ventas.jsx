import { useEffect, useMemo, useState } from "react";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";

import CardDark from "../components/ui/CardDark";
import GoldBadge from "../components/ui/GoldBadge";
import TableDark from "../components/ui/TableDark";
import DateFilter from "../components/ui/DateFilter";
import Toast from "../components/ui/Toast";
import AnimatedNumber from "../components/ui/AnimatedNumber";

import { exportarPDF } from "../utils/exportPdf";
import { exportarExcel } from "../utils/exportExcel";

import { FaFilePdf, FaFileExcel } from "react-icons/fa";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";

import {
  Banknote,
  CalendarDays,
  ChevronDown,
  Eraser,
  ReceiptText,
  Scissors,
  TrendingUp,
  UserRound,
  WalletCards,
} from "lucide-react";

function Ventas() {
  const [ventas, setVentas] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [servicios, setServicios] = useState([]);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("success");

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtroTrabajador, setFiltroTrabajador] = useState("");
  const [filtroServicio, setFiltroServicio] = useState("");
  const [filtroRapidoActivo, setFiltroRapidoActivo] = useState("");
  const [limpiandoActivo, setLimpiandoActivo] = useState(false);

  const [loading, setLoading] = useState(true);
  const [limiteDetalle, setLimiteDetalle] = useState(10);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const [esMobile, setEsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const onResize = () => setEsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const chartColors = {
    gold: "#d4af37",
    green: "#16a34a",
    text: "#111827",
    axis: "#667085",
    grid: "rgba(15,23,42,0.08)",
    bg: "#ffffff",
    border: "rgba(212,175,55,0.22)",
  };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: chartColors.bg,
      border: `1px solid ${chartColors.border}`,
      borderRadius: "14px",
      color: chartColors.text,
      boxShadow: "0 14px 30px rgba(15,23,42,.18)",
    },
    labelStyle: { color: "#8b6f10", fontWeight: 900 },
    itemStyle: { color: chartColors.text, fontWeight: 700 },
  };

  const leerJsonSeguro = async (res, valorDefecto) => {
    try {
      if (!res || !res.ok) return valorDefecto;
      return await res.json();
    } catch {
      return valorDefecto;
    }
  };

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        setError("");

        const [resVentas, resTrabajadores, resServicios] = await Promise.all([
          authFetch(`${API_BASE}/Ventas/completas`),
          authFetch(`${API_BASE}/Trabajadores`),
          authFetch(`${API_BASE}/Servicios`),
        ]);

        const dataVentas = await leerJsonSeguro(resVentas, []);
        const dataTrabajadores = await leerJsonSeguro(resTrabajadores, []);
        const dataServicios = await leerJsonSeguro(resServicios, []);

        if (!resVentas || !resVentas.ok) {
          setTipoMensaje("error");
          setError(dataVentas?.mensaje || "Error al cargar ventas");
          return;
        }

        if (!resTrabajadores || !resTrabajadores.ok) {
          setTipoMensaje("error");
          setError(dataTrabajadores?.mensaje || "Error al cargar trabajadores");
          return;
        }

        if (!resServicios || !resServicios.ok) {
          setTipoMensaje("error");
          setError(dataServicios?.mensaje || "Error al cargar servicios");
          return;
        }

        setVentas(Array.isArray(dataVentas) ? dataVentas : []);
        setTrabajadores(Array.isArray(dataTrabajadores) ? dataTrabajadores : []);
        setServicios(Array.isArray(dataServicios) ? dataServicios : []);
      } catch (err) {
        console.error(err);
        setTipoMensaje("error");
        setError("Error al cargar análisis");
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const obtenerFechaLocal = (fecha) => {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(fecha.getDate()).padStart(2, "0")}`;
  };

  const resetDetalle = () => setLimiteDetalle(10);

  const aplicarFiltroHoy = () => {
    const hoy = obtenerFechaLocal(new Date());
    setFechaDesde(hoy);
    setFechaHasta(hoy);
    setFiltroRapidoActivo("hoy");
    resetDetalle();
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
    resetDetalle();
  };

  const aplicarFiltroMes = () => {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    setFechaDesde(obtenerFechaLocal(primerDia));
    setFechaHasta(obtenerFechaLocal(hoy));
    setFiltroRapidoActivo("mes");
    resetDetalle();
  };

  const limpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
    setFiltroTrabajador("");
    setFiltroServicio("");
    setFiltroRapidoActivo("");
    resetDetalle();

    setLimpiandoActivo(true);
    setTimeout(() => setLimpiandoActivo(false), 400);

    setTipoMensaje("info");
    setMensaje("Filtros restablecidos");
  };

  const ventasFiltradas = useMemo(() => {
    return ventas.filter((v) => {
      const fechaVenta = new Date(v.fechaVenta);

      if (fechaDesde) {
        const desde = new Date(`${fechaDesde}T00:00:00`);
        if (fechaVenta < desde) return false;
      }

      if (fechaHasta) {
        const hasta = new Date(`${fechaHasta}T23:59:59.999`);
        if (fechaVenta > hasta) return false;
      }

      if (filtroTrabajador && v.trabajador !== filtroTrabajador) return false;
      if (filtroServicio && v.servicio !== filtroServicio) return false;

      return true;
    });
  }, [ventas, fechaDesde, fechaHasta, filtroTrabajador, filtroServicio]);

  const ventasDetalleVisible = useMemo(
    () => ventasFiltradas.slice(0, limiteDetalle),
    [ventasFiltradas, limiteDetalle]
  );

  const hayMasDetalle = ventasFiltradas.length > limiteDetalle;

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

  const cantidadVentas = useMemo(
    () => new Set(ventasFiltradas.map((v) => `${v.idVenta}`)).size,
    [ventasFiltradas]
  );

  const serviciosDistintos = useMemo(
    () => new Set(ventasFiltradas.map((v) => v.servicio)).size,
    [ventasFiltradas]
  );

  const promedioVenta = useMemo(() => {
    if (!cantidadVentas) return 0;
    return totalFiltrado / cantidadVentas;
  }, [cantidadVentas, totalFiltrado]);

  const ventasPorTrabajador = useMemo(() => {
    const mapa = new Map();

    ventasFiltradas.forEach((v) => {
      const key = v.trabajador || "Sin trabajador";
      const actual = mapa.get(key) || {
        trabajador: key,
        totalGenerado: 0,
      };

      actual.totalGenerado += Number(v.subtotal || 0);
      mapa.set(key, actual);
    });

    return Array.from(mapa.values()).sort(
      (a, b) => b.totalGenerado - a.totalGenerado
    );
  }, [ventasFiltradas]);

  const comisionesPorTrabajador = useMemo(() => {
    const mapa = new Map();

    ventasFiltradas.forEach((v) => {
      const key = v.trabajador || "Sin trabajador";
      const actual = mapa.get(key) || {
        trabajador: key,
        totalComision: 0,
      };

      actual.totalComision += Number(v.montoComisionCalculado || 0);
      mapa.set(key, actual);
    });

    return Array.from(mapa.values()).sort(
      (a, b) => b.totalComision - a.totalComision
    );
  }, [ventasFiltradas]);

  const ventasPorDia = useMemo(() => {
    const mapa = new Map();

    ventasFiltradas.forEach((v) => {
      const fecha = new Date(v.fechaVenta);
      const sortKey = fecha.toISOString().slice(0, 10);
      const label = fecha.toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
      });

      const actual = mapa.get(sortKey) || {
        fecha: label,
        sortKey,
        total: 0,
      };

      actual.total += Number(v.subtotal || 0);
      mapa.set(sortKey, actual);
    });

    return Array.from(mapa.values()).sort(
      (a, b) => new Date(a.sortKey) - new Date(b.sortKey)
    );
  }, [ventasFiltradas]);

  const agruparTopConOtros = (data, keyName, valueName, limite = 5) => {
    if (!Array.isArray(data)) return [];

    const ordenado = [...data].sort(
      (a, b) => Number(b[valueName] || 0) - Number(a[valueName] || 0)
    );

    const top = ordenado.slice(0, limite);
    const resto = ordenado.slice(limite);

    if (resto.length === 0) return top;

    const totalOtros = resto.reduce(
      (acc, item) => acc + Number(item[valueName] || 0),
      0
    );

    return [
      ...top,
      {
        [keyName]: "Otros",
        [valueName]: totalOtros,
      },
    ];
  };

  const ventasPorTrabajadorChart = useMemo(() => {
    return agruparTopConOtros(
      ventasPorTrabajador,
      "trabajador",
      "totalGenerado",
      5
    );
  }, [ventasPorTrabajador]);

  const comisionesPorTrabajadorChart = useMemo(() => {
    return agruparTopConOtros(
      comisionesPorTrabajador,
      "trabajador",
      "totalComision",
      5
    );
  }, [comisionesPorTrabajador]);

  const periodoTexto = useMemo(() => {
    if (fechaDesde && fechaHasta) return `${fechaDesde} → ${fechaHasta}`;
    if (fechaDesde) return `Desde ${fechaDesde}`;
    if (fechaHasta) return `Hasta ${fechaHasta}`;
    return "Todos";
  }, [fechaDesde, fechaHasta]);

  const servicioTop = useMemo(() => {
    const mapa = new Map();

    ventasFiltradas.forEach((v) => {
      const key = v.servicio || "Sin servicio";
      mapa.set(key, (mapa.get(key) || 0) + Number(v.subtotal || 0));
    });

    return Array.from(mapa.entries())
      .map(([servicio, total]) => ({ servicio, total }))
      .sort((a, b) => b.total - a.total)[0];
  }, [ventasFiltradas]);

  const formatearFecha = (fecha) => {
    if (!fecha) return "-";

    return new Date(fecha).toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const exportarVentasPDF = async () => {
    if (ventasFiltradas.length === 0) {
      setTipoMensaje("error");
      setError("No hay ventas para exportar.");
      return;
    }

    const columnas = [
      "Fecha",
      "Servicio",
      "Trabajador",
      "Cantidad",
      "Subtotal",
      "Comisión",
      "Total",
    ];

    const filas = ventasFiltradas.map((v) => [
      formatearFecha(v.fechaVenta),
      v.servicio,
      v.trabajador || "Sin trabajador",
      v.cantidad,
      `S/ ${Number(v.subtotal || 0).toFixed(2)}`,
      `S/ ${Number(v.montoComisionCalculado || 0).toFixed(2)}`,
      `S/ ${Number(v.total || 0).toFixed(2)}`,
    ]);

    await exportarPDF({
      titulo: "Reporte de Ventas",
      columnas,
      filas,
      nombreArchivo: "Reporte_Ventas",
    });

    setTipoMensaje("success");
    setMensaje("PDF generado correctamente.");
  };

  const exportarVentasExcel = async () => {
    if (ventasFiltradas.length === 0) {
      setTipoMensaje("error");
      setError("No hay ventas para exportar.");
      return;
    }

    const columnas = [
      { header: "Fecha", key: "fecha", width: 24 },
      { header: "Servicio", key: "servicio", width: 30 },
      { header: "Trabajador", key: "trabajador", width: 28 },
      { header: "Cantidad", key: "cantidad", width: 12 },
      { header: "Subtotal", key: "subtotal", width: 16 },
      { header: "Comisión", key: "comision", width: 16 },
      { header: "Total", key: "total", width: 16 },
    ];

    const filas = ventasFiltradas.map((v) => ({
      fecha: formatearFecha(v.fechaVenta),
      servicio: v.servicio,
      trabajador: v.trabajador || "Sin trabajador",
      cantidad: v.cantidad,
      subtotal: Number(v.subtotal || 0).toFixed(2),
      comision: Number(v.montoComisionCalculado || 0).toFixed(2),
      total: Number(v.total || 0).toFixed(2),
    }));

    await exportarExcel({
      titulo: "Reporte de Ventas",
      columnas,
      filas,
      nombreArchivo: "Reporte_Ventas",
      nombreHoja: "Ventas",
    });

    setTipoMensaje("success");
    setMensaje("Excel generado correctamente.");
  };

  const BotonVerMas = () => {
    if (!hayMasDetalle) return null;

    return (
      <div className="ventas-load-more">
        <button
          type="button"
          className="btn btn-dark-outline"
          onClick={() => setLimiteDetalle((prev) => prev + 10)}
        >
          Ver más movimientos
        </button>

        <span>
          {ventasDetalleVisible.length} de {ventasFiltradas.length}
        </span>
      </div>
    );
  };

  return (
    <div className="page-shell ventas-page">
      <div className="container-fluid py-4">
        <section className="ventas-topbar">
          <div>
            <h1>Ventas</h1>
            <p>Resumen financiero y movimientos del negocio.</p>
          </div>

          <div className="ventas-topbar-badges">
            <GoldBadge>{periodoTexto}</GoldBadge>
            <GoldBadge>{ventasFiltradas.length} registros</GoldBadge>
          </div>
        </section>

        <section className="ventas-finance-grid">
          <article className="ventas-finance-card gold">
            <span className="ventas-finance-icon">
              <TrendingUp size={20} />
            </span>

            <div>
              <p>Total vendido</p>
              <h2>
                <AnimatedNumber
                  value={Number(totalFiltrado || 0)}
                  prefix="S/ "
                  decimals={2}
                />
              </h2>
              <small>Ingresos filtrados</small>
            </div>
          </article>

          <article className="ventas-finance-card green">
            <span className="ventas-finance-icon">
              <WalletCards size={20} />
            </span>

            <div>
              <p>Comisión generada</p>
              <h2>S/ {Number(totalComisionFiltrada || 0).toFixed(2)}</h2>
              <small>Comisiones calculadas</small>
            </div>
          </article>

          <article className="ventas-finance-card blue">
            <span className="ventas-finance-icon">
              <ReceiptText size={20} />
            </span>

            <div>
              <p>Ventas</p>
              <h2>{cantidadVentas}</h2>
              <small>Operaciones únicas</small>
            </div>
          </article>

          <article className="ventas-finance-card purple">
            <span className="ventas-finance-icon">
              <Banknote size={20} />
            </span>

            <div>
              <p>Ticket promedio</p>
              <h2>S/ {Number(promedioVenta || 0).toFixed(2)}</h2>
              <small>Promedio por venta</small>
            </div>
          </article>

          <article className="ventas-finance-card soft">
            <span className="ventas-finance-icon">
              <Scissors size={20} />
            </span>

            <div>
              <p>Servicios</p>
              <h2>{serviciosDistintos}</h2>
              <small>Servicios vendidos</small>
            </div>
          </article>
        </section>

        <CardDark className="ventas-filter-card">
          <div className="ventas-filter-top">
            <div>
              <h4>Filtros</h4>
              <span>{loading ? "Cargando..." : `${cantidadVentas} ventas`}</span>
            </div>

            <button
              type="button"
              className="ventas-filter-toggle"
              onClick={() => setFiltrosAbiertos((prev) => !prev)}
            >
              Más filtros
              <ChevronDown
                size={15}
                className={filtrosAbiertos ? "rotate" : ""}
              />
            </button>
          </div>

          <div className="ventas-quick-filters">
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
                filtroRapidoActivo === "semana" ? "btn-gold" : "btn-dark-outline"
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
              <Eraser size={14} />
              Limpiar
            </button>
          </div>

          <div className={`ventas-filter-grid ${filtrosAbiertos ? "open" : ""}`}>
            <div className="filtro-item">
              <DateFilter
                label="Desde"
                value={fechaDesde}
                onChange={(valor) => {
                  setFechaDesde(valor);
                  setFiltroRapidoActivo("");
                  resetDetalle();
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
                  resetDetalle();
                }}
                minDate={fechaDesde}
              />
            </div>

            <div className="filtro-item">
              <label className="label-gold">Trabajador</label>

              <select
                className="form-control input-dark"
                value={filtroTrabajador}
                onChange={(e) => {
                  setFiltroTrabajador(e.target.value);
                  setFiltroRapidoActivo("");
                  resetDetalle();
                }}
              >
                <option value="">Todos</option>

                {trabajadores.map((t) => (
                  <option key={t.idTrabajador} value={t.nombre}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="filtro-item">
              <label className="label-gold">Servicio</label>

              <select
                className="form-control input-dark"
                value={filtroServicio}
                onChange={(e) => {
                  setFiltroServicio(e.target.value);
                  setFiltroRapidoActivo("");
                  resetDetalle();
                }}
              >
                <option value="">Todos</option>

                {servicios.map((s) => (
                  <option key={s.idServicio} value={s.nombre}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardDark>

        <section className="ventas-insight-strip">
          <article>
            <UserRound size={16} />
            <span>Top trabajador</span>
            <b>{ventasPorTrabajador[0]?.trabajador || "Sin datos"}</b>
          </article>

          <article>
            <Scissors size={16} />
            <span>Servicio top</span>
            <b>{servicioTop?.servicio || "Sin datos"}</b>
          </article>

          <article>
            <CalendarDays size={16} />
            <span>Días con ventas</span>
            <b>{ventasPorDia.length}</b>
          </article>
        </section>

        <section className="ventas-chart-grid">
          <CardDark className="ventas-chart-card">
            <div className="ventas-section-head">
              <div>
                <h4 className="section-title">Ventas por trabajador</h4>
                <p className="section-subtitle">Top ingresos generados.</p>
              </div>

              <GoldBadge>Top {ventasPorTrabajadorChart.length}</GoldBadge>
            </div>

            <div className="chart-scroll-mobile">
              <div
                className="ventas-chart-box"
                style={{
                  width: esMobile
                    ? `${Math.max(ventasPorTrabajadorChart.length * 94, 420)}px`
                    : "100%",
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ventasPorTrabajadorChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />

                    <XAxis
                      dataKey="trabajador"
                      stroke={chartColors.axis}
                      interval={0}
                      tick={{
                        fontSize: esMobile ? 10 : 12,
                        fill: chartColors.axis,
                      }}
                    />

                    <YAxis
                      stroke={chartColors.axis}
                      tick={{
                        fill: chartColors.axis,
                        fontSize: esMobile ? 10 : 12,
                      }}
                    />

                    <Tooltip
                      {...tooltipStyle}
                      formatter={(value) => [
                        `S/ ${Number(value).toFixed(2)}`,
                        "Total generado",
                      ]}
                    />

                    <Bar
                      dataKey="totalGenerado"
                      name="Total generado"
                      fill="#d4af37"
                      radius={[10, 10, 0, 0]}
                      animationDuration={900}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardDark>

          <CardDark className="ventas-chart-card">
            <div className="ventas-section-head">
              <div>
                <h4 className="section-title">Comisiones</h4>
                <p className="section-subtitle">Top comisiones generadas.</p>
              </div>

              <GoldBadge>Top {comisionesPorTrabajadorChart.length}</GoldBadge>
            </div>

            <div className="chart-scroll-mobile">
              <div
                className="ventas-chart-box"
                style={{
                  width: esMobile
                    ? `${Math.max(
                        comisionesPorTrabajadorChart.length * 94,
                        420
                      )}px`
                    : "100%",
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comisionesPorTrabajadorChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />

                    <XAxis
                      dataKey="trabajador"
                      stroke={chartColors.axis}
                      interval={0}
                      tick={{
                        fontSize: esMobile ? 10 : 12,
                        fill: chartColors.axis,
                      }}
                    />

                    <YAxis
                      stroke={chartColors.axis}
                      tick={{
                        fill: chartColors.axis,
                        fontSize: esMobile ? 10 : 12,
                      }}
                    />

                    <Tooltip
                      {...tooltipStyle}
                      formatter={(value) => [
                        `S/ ${Number(value).toFixed(2)}`,
                        "Comisión",
                      ]}
                    />

                    <Bar
                      dataKey="totalComision"
                      name="Comisión generada"
                      fill="#16a34a"
                      radius={[10, 10, 0, 0]}
                      animationDuration={900}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardDark>
        </section>

        <CardDark className="ventas-chart-card ventas-chart-full">
          <div className="ventas-section-head">
            <div>
              <h4 className="section-title">Ventas por día</h4>
              <p className="section-subtitle">Evolución por fecha.</p>
            </div>

            <GoldBadge>{ventasPorDia.length} días</GoldBadge>
          </div>

          <div className="chart-scroll-mobile ventas-dia-scroll">
            <div
              className="ventas-chart-box-large"
              style={{
                width: esMobile
                  ? `${Math.max(ventasPorDia.length * 78, 580)}px`
                  : "100%",
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ventasPorDia}>
                  <defs>
                    <linearGradient
                      id="ventasAreaGold"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#d4af37" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#d4af37" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />

                  <XAxis
                    dataKey="fecha"
                    stroke={chartColors.axis}
                    tick={{
                      fill: chartColors.axis,
                      fontSize: esMobile ? 10 : 12,
                    }}
                    interval={esMobile ? "preserveStartEnd" : 0}
                    minTickGap={esMobile ? 24 : 0}
                  />

                  <YAxis
                    stroke={chartColors.axis}
                    tick={{
                      fill: chartColors.axis,
                      fontSize: esMobile ? 10 : 12,
                    }}
                  />

                  <Tooltip
                    {...tooltipStyle}
                    formatter={(value) => [
                      `S/ ${Number(value).toFixed(2)}`,
                      "Ventas",
                    ]}
                  />

                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Ventas por día"
                    stroke="#d4af37"
                    strokeWidth={3}
                    fill="url(#ventasAreaGold)"
                    dot={{ r: esMobile ? 3 : 4, fill: "#d4af37" }}
                    activeDot={{ r: 6 }}
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardDark>

        <CardDark className="ventas-detail-card">
          <div className="ventas-section-head">
            <div>
              <h4 className="section-title">Movimientos</h4>
              <p className="section-subtitle">Ventas registradas.</p>
            </div>

            <div className="ventas-export-actions">
              <GoldBadge>{ventasFiltradas.length} registros</GoldBadge>

              <button
                type="button"
                className="btn btn-dark-outline export-btn"
                onClick={exportarVentasPDF}
                disabled={ventasFiltradas.length === 0}
              >
                <FaFilePdf size={16} />
                PDF
              </button>

              <button
                type="button"
                className="btn btn-gold export-btn"
                onClick={exportarVentasExcel}
                disabled={ventasFiltradas.length === 0}
              >
                <FaFileExcel size={16} />
                Excel
              </button>
            </div>
          </div>

          <div className="ventas-detail-mobile-list">
            {loading ? (
              <div className="ventas-empty-state">
                <ReceiptText size={32} />
                <p>Cargando análisis...</p>
              </div>
            ) : ventasDetalleVisible.length > 0 ? (
              ventasDetalleVisible.map((v) => (
                <article
                  className="ventas-mobile-row"
                  key={`${v.idVenta}-${v.fechaVenta}-${v.servicio}-${v.trabajador}`}
                >
                  <div className="ventas-mobile-row-main">
                    <div>
                      <h5>{v.servicio}</h5>
                      <span>{v.trabajador || "Sin trabajador"}</span>
                    </div>

                    <b>S/ {Number(v.total || 0).toFixed(2)}</b>
                  </div>

                  <div className="ventas-mobile-row-meta">
                    <span>{formatearFecha(v.fechaVenta)}</span>
                    <span>Cant. {v.cantidad}</span>
                    <span>
                      Comisión S/{" "}
                      {Number(v.montoComisionCalculado || 0).toFixed(2)}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <div className="ventas-empty-state">
                <ReceiptText size={32} />
                <p>No hay registros.</p>
              </div>
            )}

            <BotonVerMas />
          </div>

          <div className="ventas-table-wrap">
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
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-4">
                    Cargando análisis...
                  </td>
                </tr>
              ) : ventasDetalleVisible.length > 0 ? (
                ventasDetalleVisible.map((v) => (
                  <tr
                    key={`${v.idVenta}-${v.fechaVenta}-${v.servicio}-${v.trabajador}`}
                  >
                    <td className="ventas-id-cell">{v.idVenta}</td>
                    <td>{formatearFecha(v.fechaVenta)}</td>
                    <td>{v.servicio}</td>
                    <td>
                      <span className="table-pill">
                        {v.trabajador || "Sin trabajador"}
                      </span>
                    </td>
                    <td>{v.cantidad}</td>
                    <td>S/ {Number(v.precioUnitario || 0).toFixed(2)}</td>
                    <td>S/ {Number(v.subtotal || 0).toFixed(2)}</td>
                    <td className="ventas-warning-cell">
                      {Number(v.porcentajeComisionAplicado || 0).toFixed(0)}%
                    </td>
                    <td className="ventas-success-cell">
                      S/ {Number(v.montoComisionCalculado || 0).toFixed(2)}
                    </td>
                    <td className="ventas-total-cell">
                      S/ {Number(v.total || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="text-center py-4">
                    No hay registros.
                  </td>
                </tr>
              )}
            </TableDark>

            <BotonVerMas />
          </div>
        </CardDark>
      </div>

      <Toast
        mensaje={mensaje || error}
        tipo={error ? "error" : tipoMensaje}
        onClose={() => {
          setMensaje("");
          setError("");
        }}
      />
    </div>
  );
}

export default Ventas;