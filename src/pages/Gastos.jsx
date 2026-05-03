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

  const [form, setForm] = useState({
    concepto: "",
    tipo: "",
    monto: "",
    fecha: "",
    observacion: "",
  });

  const cargarGastos = async () => {
    try {
      setError("");

      const res = await authFetch(`${API_BASE}/Gastos`);
      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setError(data.mensaje || "Error al cargar gastos");
        return;
      }

      setGastos(data || []);
    } catch (err) {
      console.error(err);
      setTipoMensaje("error");
      setError("Error al cargar gastos");
    }
  };

  useEffect(() => {
    cargarGastos();
  }, []);

  const actualizarForm = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const aplicarFiltroHoy = () => {
    const hoy = new Date().toISOString().split("T")[0];
    setFechaDesde(hoy);
    setFechaHasta(hoy);
  };

  const aplicarFiltroSemana = () => {
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - hoy.getDay());

    setFechaDesde(inicio.toISOString().split("T")[0]);
    setFechaHasta(hoy.toISOString().split("T")[0]);
  };

  const aplicarFiltroMes = () => {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    setFechaDesde(inicio.toISOString().split("T")[0]);
    setFechaHasta(hoy.toISOString().split("T")[0]);
  };

  const limpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
    setFiltroConcepto("");
  };

  const limpiarFormulario = () => {
    setForm({
      concepto: "",
      tipo: "",
      monto: "",
      fecha: "",
      observacion: "",
    });
  };

  const gastosFiltrados = useMemo(() => {
    return gastos.filter((g) => {
      const fecha = new Date(g.fecha);

      if (fechaDesde && fecha < new Date(fechaDesde)) return false;

      if (fechaHasta) {
        const hasta = new Date(fechaHasta);
        hasta.setHours(23, 59, 59, 999);

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

  const totalGastos = useMemo(
    () => gastosFiltrados.reduce((acc, g) => acc + Number(g.monto || 0), 0),
    [gastosFiltrados]
  );

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
      setError("El tipo de gasto es obligatorio.");
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

      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setError(data.mensaje || "Error al guardar gasto");
        return;
      }

      setTipoMensaje("success");
      setMensaje("Gasto registrado correctamente.");
      limpiarFormulario();

      await cargarGastos();
    } catch (err) {
      console.error(err);
      setTipoMensaje("error");
      setError("Error al guardar gasto");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarGasto = async (id) => {
    setMensaje("");
    setError("");

    if (!window.confirm("¿Eliminar gasto?")) return;

    try {
      setEliminandoId(id);

      const res = await authFetch(`${API_BASE}/Gastos/${id}`, {
        method: "DELETE",
      });

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setError(data.mensaje || "Error al eliminar gasto");
        return;
      }

      setTipoMensaje("success");
      setMensaje("Gasto eliminado correctamente.");

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
  };

  const exportarGastosExcel = async () => {
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
  };

  return (
    <div className="page-shell">
      <PageHeader title="Gastos" subtitle="Controla los egresos del negocio" />

      <div className="container-fluid py-4">
        <CardDark className="mb-4">
          <h4 className="section-title mb-3">Registrar gasto</h4>

          <div className="row g-3">
            <div className="col-md-3">
              <input
                className="form-control input-dark"
                placeholder="Concepto"
                value={form.concepto}
                maxLength={150}
                onChange={(e) => actualizarForm("concepto", e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <input
                className="form-control input-dark"
                placeholder="Tipo"
                value={form.tipo}
                maxLength={80}
                onChange={(e) => actualizarForm("tipo", e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control input-dark"
                placeholder="Monto"
                value={form.monto}
                onChange={(e) => actualizarForm("monto", e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <input
                type="date"
                className="form-control input-dark"
                value={form.fecha}
                onChange={(e) => actualizarForm("fecha", e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <input
                className="form-control input-dark"
                placeholder="Observación"
                value={form.observacion}
                maxLength={300}
                onChange={(e) => actualizarForm("observacion", e.target.value)}
              />
            </div>

            <div className="col-md-12">
              <button
                className="btn btn-gold"
                onClick={guardarGasto}
                disabled={guardando}
              >
                {guardando ? "Guardando..." : "Guardar gasto"}
              </button>
            </div>
          </div>
        </CardDark>

        <CardDark className="mb-4">
          <div className="filtros-rapidos mb-3">
            <button className="btn btn-dark-outline" onClick={aplicarFiltroHoy}>
              Hoy
            </button>

            <button
              className="btn btn-dark-outline"
              onClick={aplicarFiltroSemana}
            >
              Semana
            </button>

            <button className="btn btn-dark-outline" onClick={aplicarFiltroMes}>
              Mes
            </button>

            <button className="btn btn-dark-outline" onClick={limpiarFiltros}>
              Limpiar
            </button>
          </div>

          <div className="analisis-filtros">
            <DateFilter
              label="Desde"
              value={fechaDesde}
              onChange={setFechaDesde}
            />

            <DateFilter
              label="Hasta"
              value={fechaHasta}
              onChange={setFechaHasta}
            />

            <input
              className="form-control input-dark"
              placeholder="Buscar concepto"
              value={filtroConcepto}
              onChange={(e) => setFiltroConcepto(e.target.value)}
            />
          </div>
        </CardDark>

        <CardDark>
          <div className="d-flex justify-content-between mb-3 flex-wrap gap-2">
            <GoldBadge>S/ {totalGastos.toFixed(2)}</GoldBadge>

            <div className="d-flex gap-2">
              <button
                className="btn btn-dark-outline d-flex align-items-center gap-2"
                onClick={exportarGastosPDF}
                disabled={gastosFiltrados.length === 0}
              >
                <FaFilePdf /> PDF
              </button>

              <button
                className="btn btn-gold d-flex align-items-center gap-2"
                onClick={exportarGastosExcel}
                disabled={gastosFiltrados.length === 0}
              >
                <FaFileExcel /> Excel
              </button>
            </div>
          </div>

          <TableDark
            headers={["Fecha", "Concepto", "Tipo", "Monto", "Obs", "Acciones"]}
          >
            {gastosFiltrados.length > 0 ? (
              gastosFiltrados.map((g) => (
                <tr key={g.idGasto}>
                  <td>{new Date(g.fecha).toLocaleDateString()}</td>
                  <td>{g.concepto}</td>
                  <td>{g.tipo}</td>
                  <td>S/ {Number(g.monto || 0).toFixed(2)}</td>
                  <td>{g.observacion || "-"}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => eliminarGasto(g.idGasto)}
                      disabled={eliminandoId === g.idGasto}
                    >
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
        </CardDark>

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