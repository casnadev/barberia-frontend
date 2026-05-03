import { useEffect, useState } from "react";
import API_BASE from "../../services/api";
import authFetch from "../../services/authFetch";

export default function MisServicios() {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarServicios();
  }, []);

  const cargarServicios = async () => {
    try {
      const res = await authFetch(`${API_BASE}/Trabajadores/mis-servicios`);
      if (!res) return;

      const data = await res.json();
      setServicios(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <h3>Cargando servicios...</h3>;

  return (
    <div>
      <h2>Mis Servicios</h2>
      <p>Historial de servicios registrados por tu usuario.</p>

      <div className="card p-4 mt-3">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Servicio</th>
              <th>Cantidad</th>
              <th>Subtotal</th>
              <th>Comisión</th>
              <th>Pagado</th>
              <th>Pendiente</th>
              <th>Estado</th>
            </tr>
          </thead>

          <tbody>
            {servicios.length > 0 ? (
              servicios.map((s, i) => (
                <tr key={i}>
                  <td>{new Date(s.fechaVenta).toLocaleString()}</td>
                  <td>{s.servicio}</td>
                  <td>{s.cantidad}</td>
                  <td>S/ {s.subtotal}</td>
                  <td>S/ {s.montoComisionCalculado}</td>
                  <td>S/ {s.montoComisionPagado}</td>
                  <td>S/ {s.montoComisionPendiente}</td>
                  <td>{s.estadoPago}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center">
                  Aún no registraste servicios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}