import { useEffect, useMemo, useState } from "react";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";

import CardDark from "../components/ui/CardDark";
import PageHeader from "../components/ui/PageHeader";
import GoldBadge from "../components/ui/GoldBadge";
import TableDark from "../components/ui/TableDark";
import DateFilter from "../components/ui/DateFilter";
import Toast from "../components/ui/Toast";

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

  const esMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const chartColors = {
    gold: "#d4af37",
    goldSoft: "#f0cf73",
    text: "#f5f5f5",
    muted: "#b8b8b8",
    axis: "#b8b8b8",
    grid: "rgba(255,255,255,0.08)",
    bg: "#111111",
    border: "rgba(212,175,55,0.18)",
  };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: chartColors.bg,
      border: `1px solid ${chartColors.border}`,
      borderRadius: "14px",
      color: chartColors.text,
      boxShadow: "0 14px 30px rgba(0,0,0,.35)",
    },
    labelStyle: { color: chartColors.goldSoft, fontWeight: 800 },
    itemStyle: { color: chartColors.text },
  };

  const legendStyle = {
    wrapperStyle: {
      color: chartColors.text,
      paddingTop: "10px",
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

  return (
    <div className="page-shell">
      <PageHeader
        title="Análisis"
        subtitle="Analiza ventas, rendimiento y comportamiento del negocio"
      />

      <div className="container-fluid py-4">
        <style>{`
          .analisis-filtros {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 1rem;
          }

          .filtros-rapidos {
            display: flex;
            gap: .75rem;
            flex-wrap: wrap;
          }

          .dashboard-four-cols {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 1rem;
          }

          .kpi-card-value {
            font-size: 2.25rem;
            font-weight: 900;
            color: #f5f5f5;
            margin-bottom: 1rem;
          }

          .kpi-card-note {
            padding: 14px;
            border-radius: 16px;
            background: rgba(212,175,55,0.08);
            border: 1px solid rgba(212,175,55,0.16);
            color: #d1d5db;
            font-weight: 700;
          }

          .chart-scroll-mobile {
            overflow-x: auto;
            overflow-y: hidden;
          }

          @media (max-width: 992px) {
            .analisis-filtros,
            .dashboard-four-cols {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 576px) {
            .analisis-filtros,
            .dashboard-four-cols {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        <CardDark className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
              <h4 className="section-title">Filtros de análisis</h4>
              <p className="section-subtitle">
                Ajusta el período, trabajador o servicio que deseas revisar.
              </p>
            </div>

            <GoldBadge>
              {loading ? "Cargando..." : `${ventasFiltradas.length} registros`}
            </GoldBadge>
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
              Limpiar
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
              <label
                className="form-label"
                style={{ color: "#d4af37", fontWeight: 700 }}
              >
                Trabajador
              </label>

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
              <label
                className="form-label"
                style={{ color: "#d4af37", fontWeight: 700 }}
              >
                Servicio
              </label>

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

        <CardDark className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
              <h4 className="section-title">Resumen del período</h4>
              <p className="section-subtitle">
                Totales calculados según los filtros aplicados.
              </p>
            </div>

            <GoldBadge>{cantidadVentas} ventas</GoldBadge>
          </div>

          <div className="dashboard-four-cols">
            <CardDark className="h-100 kpi-card-pro">
              <p className="section-subtitle mb-2">Total vendido</p>
              <h2 className="kpi-card-value">S/ {totalFiltrado.toFixed(2)}</h2>
              <div className="kpi-card-note">Ingresos filtrados</div>
            </CardDark>

            <CardDark className="h-100 kpi-card-pro success">
              <p className="section-subtitle mb-2">Comisión generada</p>
              <h2 className="kpi-card-value" style={{ color: "#86efac" }}>
                S/ {totalComisionFiltrada.toFixed(2)}
              </h2>
              <div className="kpi-card-note">Total de comisiones</div>
            </CardDark>

            <CardDark className="h-100 kpi-card-pro purple">
              <p className="section-subtitle mb-2">Servicios distintos</p>
              <h2 className="kpi-card-value">{serviciosDistintos}</h2>
              <div className="kpi-card-note">Servicios vendidos</div>
            </CardDark>

            <CardDark className="h-100 kpi-card-pro info">
              <p className="section-subtitle mb-2">Cantidad de ventas</p>
              <h2 className="kpi-card-value">{cantidadVentas}</h2>
              <div className="kpi-card-note">Ventas únicas</div>
            </CardDark>
          </div>
        </CardDark>

        <div className="row g-4 mb-4">
          <div className="col-lg-6">
            <CardDark className="h-100">
              <div className="d-flex justify-content-between align-items-center mb-4">
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
                  style={{
                    width: esMobile
                      ? `${Math.max(ventasPorTrabajador.length * 90, 360)}px`
                      : "100%",
                    height: 320,
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
                        radius={[8, 8, 0, 0]}
                        animationDuration={900}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardDark>
          </div>

          <div className="col-lg-6">
            <CardDark className="h-100">
              <div className="d-flex justify-content-between align-items-center mb-4">
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
                  style={{
                    width: esMobile
                      ? `${Math.max(
                          comisionesPorTrabajador.length * 90,
                          360
                        )}px`
                      : "100%",
                    height: 320,
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
                        fill="#22c55e"
                        radius={[8, 8, 0, 0]}
                        animationDuration={900}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardDark>
          </div>
        </div>

        <CardDark className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
              <h4 className="section-title">Ventas por día</h4>
              <p className="section-subtitle">
                Evolución del total vendido según el rango filtrado.
              </p>
            </div>

            <GoldBadge>{ventasPorDia.length} días</GoldBadge>
          </div>

          <div style={{ width: "100%", height: 340, minHeight: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ventasPorDia}>
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
                  stroke="#c084fc"
                  strokeWidth={3}
                  fill="rgba(192,132,252,0.20)"
                  dot={{ r: 4, fill: "#c084fc" }}
                  activeDot={{ r: 6 }}
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardDark>

        <CardDark>
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
              <h4 className="section-title">Detalle analítico</h4>
              <p className="section-subtitle">
                Revisa el comportamiento detallado de ventas del negocio.
              </p>
            </div>

            <GoldBadge>{ventasFiltradas.length} registros</GoldBadge>
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
                  <td style={{ fontWeight: 700 }}>{v.idVenta}</td>
                  <td>{new Date(v.fechaVenta).toLocaleString()}</td>
                  <td>{v.servicio}</td>
                  <td>
                    <span className="table-pill">{v.trabajador}</span>
                  </td>
                  <td>{v.cantidad}</td>
                  <td>S/ {Number(v.precioUnitario || 0).toFixed(2)}</td>
                  <td>S/ {Number(v.subtotal || 0).toFixed(2)}</td>
                  <td style={{ color: "#f4d35e", fontWeight: 800 }}>
                    {Number(v.porcentajeComisionAplicado || 0).toFixed(0)}%
                  </td>
                  <td style={{ color: "#22c55e", fontWeight: 800 }}>
                    S/ {Number(v.montoComisionCalculado || 0).toFixed(2)}
                  </td>
                  <td style={{ color: "#d4af37", fontWeight: 900 }}>
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