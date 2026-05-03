import { useEffect, useState } from "react";
import API_BASE from "../../services/api";
import authFetch from "../../services/authFetch";
import CardDark from "../../components/ui/CardDark";
import PageHeader from "../../components/ui/PageHeader";
import GoldBadge from "../../components/ui/GoldBadge";
import TableDark from "../../components/ui/TableDark";

export default function DashboardTrabajador() {
  const [perfil, setPerfil] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      const [perfilRes, pagosRes, serviciosRes] = await Promise.all([
        authFetch(`${API_BASE}/Trabajadores/mi-perfil`),
        authFetch(`${API_BASE}/Trabajadores/mis-pagos`),
        authFetch(`${API_BASE}/Trabajadores/mis-servicios`),
      ]);

      if (!perfilRes) return;

      const perfilData = await perfilRes.json();
      const pagosData = pagosRes ? await pagosRes.json() : [];
      const serviciosData = serviciosRes ? await serviciosRes.json() : [];

      setPerfil(perfilData);
      setPagos(pagosData);
      setServicios(serviciosData);
    } catch (err) {
      console.error(err);
      setError("Error al cargar el dashboard del trabajador");
    } finally {
      setLoading(false);
    }
  };

  const hoy = new Date().toLocaleDateString("en-CA");

  const serviciosHoy = servicios.filter((s) => {
    if (!s.fechaVenta) return false;
    return s.fechaVenta.slice(0, 10) === hoy;
  });

  const pagosHoy = pagos.filter((p) => {
    if (!p.fechaPago) return false;
    return p.fechaPago.slice(0, 10) === hoy;
  });

  const totalGeneradoHoy = serviciosHoy.reduce(
    (acc, s) => acc + Number(s.subtotal || 0),
    0
  );

  const comisionPendiente = servicios.reduce(
    (acc, s) => acc + Number(s.montoComisionPendiente || 0),
    0
  );

  const comisionGenerada = servicios.reduce(
    (acc, s) => acc + Number(s.montoComisionCalculado || 0),
    0
  );

  const totalPagado = pagos.reduce(
    (acc, p) => acc + Number(p.montoPagado || 0),
    0
  );

  const totalPagadoHoy = pagosHoy.reduce(
    (acc, p) => acc + Number(p.montoPagado || 0),
    0
  );

  if (loading) {
    return (
      <div className="page-shell">
        <PageHeader
          title="Panel del Trabajador"
          subtitle="Cargando información del trabajador..."
        />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        title={`Hola, ${perfil?.nombre || "Trabajador"}`}
        subtitle="Resumen de tus servicios, comisiones y pagos recibidos"
      />

      <div className="container-fluid py-4">
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="row g-4 mb-4">
          <div className="col-md-3">
            <CardDark>
              <p className="section-subtitle mb-1">Servicios hoy</p>
              <h2 className="section-title mb-0">{serviciosHoy.length}</h2>
            </CardDark>
          </div>

          <div className="col-md-3">
            <CardDark>
              <p className="section-subtitle mb-1">Generado hoy</p>
              <h2 className="section-title mb-0">
                S/ {totalGeneradoHoy.toFixed(2)}
              </h2>
            </CardDark>
          </div>

          <div className="col-md-3">
            <CardDark>
              <p className="section-subtitle mb-1">Comisión pendiente</p>
              <h2 className="section-title mb-0">
                S/ {comisionPendiente.toFixed(2)}
              </h2>
            </CardDark>
          </div>

          <div className="col-md-3">
            <CardDark>
              <p className="section-subtitle mb-1">Pagado hoy</p>
              <h2 className="section-title mb-0">
                S/ {totalPagadoHoy.toFixed(2)}
              </h2>
            </CardDark>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-4">
            <CardDark className="h-100">
              <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                  <h4 className="section-title">Mi perfil</h4>
                  <p className="section-subtitle">
                    Datos asignados por el administrador
                  </p>
                </div>

                <GoldBadge>{perfil?.porcentajeComision}% comisión</GoldBadge>
              </div>

              <div className="mb-3">
                <p className="section-subtitle mb-1">Nombre</p>
                <h5>{perfil?.nombre}</h5>
              </div>

              <div className="mb-3">
                <p className="section-subtitle mb-1">Teléfono</p>
                <h5>{perfil?.telefono || "No registrado"}</h5>
              </div>

              <div className="mb-3">
                <p className="section-subtitle mb-1">Total comisión generada</p>
                <h4 style={{ color: "#f0cf73" }}>
                  S/ {comisionGenerada.toFixed(2)}
                </h4>
              </div>

              <div>
                <p className="section-subtitle mb-1">Total recibido</p>
                <h4 style={{ color: "#f0cf73" }}>
                  S/ {totalPagado.toFixed(2)}
                </h4>
              </div>
            </CardDark>
          </div>

          <div className="col-lg-8">
            <CardDark>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h4 className="section-title">Últimos servicios</h4>
                  <p className="section-subtitle">
                    Servicios registrados recientemente
                  </p>
                </div>

                <GoldBadge>{servicios.length} registros</GoldBadge>
              </div>

              <TableDark
                headers={[
                  "Fecha",
                  "Servicio",
                  "Subtotal",
                  "Comisión",
                  "Pendiente",
                  "Estado",
                ]}
              >
                {servicios.length > 0 ? (
                  servicios.slice(0, 6).map((s, i) => (
                    <tr key={i}>
                      <td>{new Date(s.fechaVenta).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>{s.servicio}</td>
                      <td>S/ {Number(s.subtotal || 0).toFixed(2)}</td>
                      <td style={{ color: "#f0cf73", fontWeight: 700 }}>
                        S/ {Number(s.montoComisionCalculado || 0).toFixed(2)}
                      </td>
                      <td>S/ {Number(s.montoComisionPendiente || 0).toFixed(2)}</td>
                      <td>{s.estadoPago}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      Aún no registraste servicios
                    </td>
                  </tr>
                )}
              </TableDark>
            </CardDark>
          </div>
        </div>

        <div className="row g-4 mt-1">
          <div className="col-12">
            <CardDark>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h4 className="section-title">Últimos pagos recibidos</h4>
                  <p className="section-subtitle">
                    Historial reciente de pagos realizados por el administrador
                  </p>
                </div>

                <GoldBadge>{pagos.length} pagos</GoldBadge>
              </div>

              <TableDark headers={["Fecha", "Monto", "Observación"]}>
                {pagos.length > 0 ? (
                  pagos.slice(0, 5).map((p, i) => (
                    <tr key={i}>
                      <td>{new Date(p.fechaPago).toLocaleString()}</td>
                      <td style={{ color: "#f0cf73", fontWeight: 700 }}>
                        S/ {Number(p.montoPagado || 0).toFixed(2)}
                      </td>
                      <td>{p.observacion || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center py-4">
                      Aún no tienes pagos registrados
                    </td>
                  </tr>
                )}
              </TableDark>
            </CardDark>
          </div>
        </div>
      </div>
    </div>
  );
}