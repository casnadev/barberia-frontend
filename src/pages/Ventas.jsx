import { useEffect, useMemo, useState } from "react";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";

import CardDark from "../components/ui/CardDark";
import PageHeader from "../components/ui/PageHeader";
import GoldBadge from "../components/ui/GoldBadge";
import TableDark from "../components/ui/TableDark";
import DateFilter from "../components/ui/DateFilter";
import Toast from "../components/ui/Toast";
import AnimatedNumber from "../components/ui/AnimatedNumber";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";

import {
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  Eraser,
  Filter,
  ReceiptText,
  Scissors,
  TrendingUp,
  UserRound,
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

  const [esMobile, setEsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const onResize = () => {
      setEsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
  }, []);

  const chartColors = {
    gold: "#d4af37",
    goldSoft: "#f0cf73",
    green: "#16a34a",
    purple: "#8b5cf6",
    blue: "#2563eb",
    text: "#111827",
    muted: "#6b7280",
    axis: "#6b7280",
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

  const legendStyle = {
    wrapperStyle: {
      color: chartColors.text,
      paddingTop: "10px",
      fontWeight: 700,
    },
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
          setError(dataVentas.mensaje || "Error al cargar ventas");
          return;
        }

        if (!resTrabajadores || !resTrabajadores.ok) {
          setTipoMensaje("error");
          setError(dataTrabajadores.mensaje || "Error al cargar trabajadores");
          return;
        }

        if (!resServicios || !resServicios.ok) {
          setTipoMensaje("error");
          setError(dataServicios.mensaje || "Error al cargar servicios");
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
      const key = fecha.toLocaleDateString("es-PE");

      const actual = mapa.get(key) || {
        fecha: key,
        total: 0,
      };

      actual.total += Number(v.subtotal || 0);
      mapa.set(key, actual);
    });

    return Array.from(mapa.values()).sort((a, b) => {
      const [da, ma, ya] = a.fecha.split("/");
      const [db, mb, yb] = b.fecha.split("/");
      return new Date(`${ya}-${ma}-${da}`) - new Date(`${yb}-${mb}-${db}`);
    });
  }, [ventasFiltradas]);

  const limpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
    setFiltroTrabajador("");
    setFiltroServicio("");
    setFiltroRapidoActivo("");

    setLimpiandoActivo(true);

    setTimeout(() => {
      setLimpiandoActivo(false);
    }, 400);

    setTipoMensaje("info");
    setMensaje("Filtros restablecidos");
  };

  const periodoTexto = useMemo(() => {
    if (fechaDesde && fechaHasta) return `${fechaDesde} → ${fechaHasta}`;
    if (fechaDesde) return `Desde ${fechaDesde}`;
    if (fechaHasta) return `Hasta ${fechaHasta}`;
    return "Todos los registros";
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

  const KpiAnalisis = ({
    title,
    value,
    note,
    icon: KpiIcon,
    variant = "gold",
    money = true,
  }) => {

    const IconComponent = KpiIcon;

    return (
      <CardDark className={`ventas-kpi-card ${variant}`}>

        <div className="ventas-kpi-icon">
          {IconComponent && <IconComponent size={22} />}
        </div>

        <p>{title}</p>

        <h2>
          {money ? (
            <AnimatedNumber
              value={Number(value || 0)}
              prefix="S/ "
              decimals={2}
            />
          ) : (
            <AnimatedNumber
              value={Number(value || 0)}
              decimals={0}
            />
          )}
        </h2>

        <span>{note}</span>

      </CardDark>
    );
  };

  return (
    <div className="page-shell ventas-page">
      <div className="container-fluid py-4">
        <CardDark className="ventas-header-card mb-4">
          <div className="ventas-header-row">
            <PageHeader
              title="Análisis de Ventas"
              subtitle="Analiza ventas realizadas desde reservas atendidas, servicios manuales y rendimiento del negocio."
            />

            <div className="ventas-header-actions">
              <GoldBadge>{periodoTexto}</GoldBadge>
              <GoldBadge>{ventasFiltradas.length} registros</GoldBadge>
            </div>
          </div>
        </CardDark>

        <CardDark className="mb-4 ventas-filter-card">
          <div className="ventas-section-head">
            <div>
              <h4 className="section-title">Filtros de análisis</h4>
              <p className="section-subtitle">
                Ajusta el período, trabajador o servicio. Funciona también si el dueño es quien atiende.
              </p>
            </div>

            <GoldBadge>
              {loading ? "Cargando..." : `${cantidadVentas} ventas`}
            </GoldBadge>
          </div>

          <div className="ventas-quick-filters">
            <button
              type="button"
              className={`btn ${filtroRapidoActivo === "hoy" ? "btn-gold" : "btn-dark-outline"
                }`}
              onClick={aplicarFiltroHoy}
            >
              Hoy
            </button>

            <button
              type="button"
              className={`btn ${filtroRapidoActivo === "semana" ? "btn-gold" : "btn-dark-outline"
                }`}
              onClick={aplicarFiltroSemana}
            >
              Semana
            </button>

            <button
              type="button"
              className={`btn ${filtroRapidoActivo === "mes" ? "btn-gold" : "btn-dark-outline"
                }`}
              onClick={aplicarFiltroMes}
            >
              Mes
            </button>

            <button
              type="button"
              className={`btn ${limpiandoActivo ? "btn-gold" : "btn-dark-outline"
                }`}
              onClick={limpiarFiltros}
            >
              <Eraser size={16} />
              Limpiar
            </button>
          </div>

          <div className="ventas-filter-grid">
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

              <select
                className="form-control input-dark"
                value={filtroTrabajador}
                onChange={(e) => {
                  setFiltroTrabajador(e.target.value);
                  setFiltroRapidoActivo("");
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

        <section className="ventas-kpi-grid mb-4">
          <KpiAnalisis
            title="Total vendido"
            value={totalFiltrado}
            note="Ingresos filtrados"
            icon={Banknote}
            variant="gold"
          />

          <KpiAnalisis
            title="Comisión generada"
            value={totalComisionFiltrada}
            note="Comisiones calculadas"
            icon={TrendingUp}
            variant="success"
          />

          <KpiAnalisis
            title="Servicios distintos"
            value={serviciosDistintos}
            note="Servicios vendidos"
            icon={Scissors}
            variant="info"
            money={false}
          />

          <KpiAnalisis
            title="Cantidad de ventas"
            value={cantidadVentas}
            note="Ventas únicas"
            icon={ReceiptText}
            variant="purple"
            money={false}
          />

          <KpiAnalisis
            title="Ticket promedio"
            value={promedioVenta}
            note={servicioTop ? `Top: ${servicioTop.servicio}` : "Sin datos"}
            icon={BriefcaseBusiness}
            variant="neutral"
          />
        </section>

        <div className="ventas-insight-grid mb-4">
          <CardDark className="ventas-insight-card">
            <div className="ventas-insight-icon">
              <UserRound size={24} />
            </div>

            <div>
              <span>Mejor trabajador / dueño</span>
              <b>{ventasPorTrabajador[0]?.trabajador || "Sin datos"}</b>
              <p>
                {ventasPorTrabajador[0]
                  ? `S/ ${Number(ventasPorTrabajador[0].totalGenerado || 0).toFixed(2)} generado`
                  : "Aún no hay ventas filtradas."}
              </p>
            </div>
          </CardDark>

          <CardDark className="ventas-insight-card">
            <div className="ventas-insight-icon">
              <Scissors size={24} />
            </div>

            <div>
              <span>Servicio más rentable</span>
              <b>{servicioTop?.servicio || "Sin datos"}</b>
              <p>
                {servicioTop
                  ? `S/ ${Number(servicioTop.total || 0).toFixed(2)} generado`
                  : "Aún no hay servicios filtrados."}
              </p>
            </div>
          </CardDark>

          <CardDark className="ventas-insight-card">
            <div className="ventas-insight-icon">
              <CalendarDays size={24} />
            </div>

            <div>
              <span>Días con ventas</span>
              <b>{ventasPorDia.length}</b>
              <p>Según el rango actualmente filtrado.</p>
            </div>
          </CardDark>
        </div>

        <section className="ventas-chart-grid mb-4">
          <CardDark className="h-100 ventas-chart-card">
            <div className="ventas-section-head">
              <div>
                <h4 className="section-title">Ventas por trabajador</h4>
                <p className="section-subtitle">
                  Comparación de ingresos generados.
                </p>
              </div>

              <GoldBadge>{ventasPorTrabajador.length} datos</GoldBadge>
            </div>

            <div className="chart-scroll-mobile">
              <div
                className="ventas-chart-box"
                style={{
                  width: esMobile
                    ? `${Math.max(ventasPorTrabajador.length * 92, 380)}px`
                    : "100%",
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ventasPorTrabajador}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartColors.grid}
                    />
                    <XAxis
                      dataKey="trabajador"
                      stroke={chartColors.axis}
                      interval={0}
                      tick={{ fontSize: 12, fill: chartColors.axis }}
                    />
                    <YAxis
                      stroke={chartColors.axis}
                      tick={{ fill: chartColors.axis }}
                    />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(value) => [
                        `S/ ${Number(value).toFixed(2)}`,
                        "Total generado",
                      ]}
                    />
                    {!esMobile && <Legend {...legendStyle} />}

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

          <CardDark className="h-100 ventas-chart-card">
            <div className="ventas-section-head">
              <div>
                <h4 className="section-title">Comisiones por trabajador</h4>
                <p className="section-subtitle">
                  Comparación del total de comisiones generadas.
                </p>
              </div>

              <GoldBadge>{comisionesPorTrabajador.length} datos</GoldBadge>
            </div>

            <div className="chart-scroll-mobile">
              <div
                className="ventas-chart-box"
                style={{
                  width: esMobile
                    ? `${Math.max(comisionesPorTrabajador.length * 92, 380)}px`
                    : "100%",
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comisionesPorTrabajador}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartColors.grid}
                    />
                    <XAxis
                      dataKey="trabajador"
                      stroke={chartColors.axis}
                      interval={0}
                      tick={{ fontSize: 12, fill: chartColors.axis }}
                    />
                    <YAxis
                      stroke={chartColors.axis}
                      tick={{ fill: chartColors.axis }}
                    />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(value) => [
                        `S/ ${Number(value).toFixed(2)}`,
                        "Comisión",
                      ]}
                    />
                    {!esMobile && <Legend {...legendStyle} />}

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

        <CardDark className="mb-4 ventas-chart-card">
          <div className="ventas-section-head">
            <div>
              <h4 className="section-title">Ventas por día</h4>
              <p className="section-subtitle">
                Evolución del total vendido según el rango filtrado.
              </p>
            </div>

            <GoldBadge>{ventasPorDia.length} días</GoldBadge>
          </div>

          <div className="ventas-chart-box-large">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ventasPorDia}>
                <defs>
                  <linearGradient id="ventasAreaGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4af37" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#d4af37" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis
                  dataKey="fecha"
                  stroke={chartColors.axis}
                  tick={{ fill: chartColors.axis }}
                  interval={0}
                  minTickGap={0}
                />
                <YAxis
                  stroke={chartColors.axis}
                  tick={{ fill: chartColors.axis }}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value) => [
                    `S/ ${Number(value).toFixed(2)}`,
                    "Ventas",
                  ]}
                />
                <Legend {...legendStyle} />

                <Area
                  type="monotone"
                  dataKey="total"
                  name="Ventas por día"
                  stroke="#d4af37"
                  strokeWidth={3}
                  fill="url(#ventasAreaGold)"
                  dot={{ r: 4, fill: "#d4af37" }}
                  activeDot={{ r: 6 }}
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardDark>

        <CardDark className="ventas-detail-card">
          <div className="ventas-section-head">
            <div>
              <h4 className="section-title">Detalle analítico</h4>
              <p className="section-subtitle">
                Ventas registradas por servicios atendidos y confirmados.
              </p>
            </div>

            <GoldBadge>{ventasFiltradas.length} registros</GoldBadge>
          </div>

          <div className="ventas-detail-mobile">
            {loading ? (
              <p className="section-subtitle mb-0">Cargando análisis...</p>
            ) : ventasFiltradas.length > 0 ? (
              ventasFiltradas.map((v) => (
                <div
                  className="ventas-detail-item"
                  key={`${v.idVenta}-${v.fechaVenta}-${v.servicio}-${v.trabajador}`}
                >
                  <div className="ventas-detail-top">
                    <div>
                      <h5>{v.servicio}</h5>
                      <span>{new Date(v.fechaVenta).toLocaleString()}</span>
                    </div>

                    <b>S/ {Number(v.total || 0).toFixed(2)}</b>
                  </div>

                  <div className="ventas-detail-info">
                    <div>
                      <span>Trabajador</span>
                      <b>{v.trabajador || "Sin trabajador"}</b>
                    </div>

                    <div>
                      <span>Cantidad</span>
                      <b>{v.cantidad}</b>
                    </div>

                    <div>
                      <span>Subtotal</span>
                      <b>S/ {Number(v.subtotal || 0).toFixed(2)}</b>
                    </div>

                    <div>
                      <span>Comisión</span>
                      <b className="success">
                        S/ {Number(v.montoComisionCalculado || 0).toFixed(2)}
                      </b>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="section-subtitle mb-0">
                No hay registros para el análisis.
              </p>
            )}
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
              ) : ventasFiltradas.length > 0 ? (
                ventasFiltradas.map((v) => (
                  <tr
                    key={`${v.idVenta}-${v.fechaVenta}-${v.servicio}-${v.trabajador}`}
                  >
                    <td className="ventas-id-cell">{v.idVenta}</td>
                    <td>{new Date(v.fechaVenta).toLocaleString()}</td>
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
                    No hay registros para el análisis.
                  </td>
                </tr>
              )}
            </TableDark>
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
