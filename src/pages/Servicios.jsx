import React, { useEffect, useState } from "react";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";
import CardDark from "../components/ui/CardDark";
import PageHeader from "../components/ui/PageHeader";
import GoldBadge from "../components/ui/GoldBadge";
import TableDark from "../components/ui/TableDark";

function Servicios() {
  const [lista, setLista] = useState([]);
  const [nombre, setNombre] = useState("");
  const [precioBase, setPrecioBase] = useState("");
  const [editando, setEditando] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarInicial = async () => {
      try {
        const res = await authFetch(`${API_BASE}/Servicios`);
        if (!res) return;

        const data = await res.json();
        setLista(data);
      } catch (err) {
        console.error(err);
        setError("Error al cargar servicios");
      }
    };

    cargarInicial();
  }, []);

  const recargarServicios = async () => {
    try {
      const res = await authFetch(`${API_BASE}/Servicios`);
      if (!res) return;

      const data = await res.json();
      setLista(data);
    } catch (err) {
      console.error(err);
      setError("Error al cargar servicios");
    }
  };

  const guardar = async () => {
    setMensaje("");
    setError("");

    if (!nombre.trim()) {
      setError("El nombre del servicio es obligatorio");
      return;
    }

    if (!precioBase || Number(precioBase) <= 0) {
      setError("El precio debe ser mayor a 0");
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      precioBase: Number(precioBase),
    };

    try {
      let response;

      if (editando) {
        response = await authFetch(`${API_BASE}/Servicios/${editando}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await authFetch(`${API_BASE}/Servicios`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response) return;

      const data = await response.json();

      if (!response.ok) {
        setError(data.mensaje || "No se pudo guardar el servicio");
        return;
      }

      setMensaje(
        editando
          ? "Servicio actualizado correctamente"
          : "Servicio registrado correctamente"
      );

      limpiar();
      await recargarServicios();
    } catch (err) {
      console.error(err);
      setError("Error al guardar servicio");
    }
  };

  const editar = (s) => {
    setEditando(s.idServicio);
    setNombre(s.nombre || "");
    setPrecioBase(s.precioBase ?? "");
    setMensaje("");
    setError("");
  };

  const eliminar = async (id) => {
    setMensaje("");
    setError("");

    try {
      const response = await authFetch(`${API_BASE}/Servicios/desactivar/${id}`, {
        method: "PATCH",
      });

      if (!response) return;

      const data = await response.json();

      if (!response.ok) {
        setError(data.mensaje || "No se pudo desactivar el servicio");
        return;
      }

      setMensaje("Servicio desactivado correctamente");
      await recargarServicios();
    } catch (err) {
      console.error(err);
      setError("Error al desactivar servicio");
    }
  };

  const limpiar = () => {
    setEditando(null);
    setNombre("");
    setPrecioBase("");
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Gestión de Servicios"
        subtitle="Registra, edita y desactiva servicios del negocio"
      />

      <div className="container-fluid py-4">
        {mensaje && <div className="alert alert-success">{mensaje}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="row g-4">
          <div className="col-lg-4">
            <CardDark className="h-100">
              <h4 className="section-title mb-4">
                {editando ? "Editar servicio" : "Nuevo servicio"}
              </h4>

              <div className="mb-3">
                <label className="form-label" style={{ color: "#d4af37" }}>
                  Nombre
                </label>
                <input
                  className="form-control input-dark"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="form-label" style={{ color: "#d4af37" }}>
                  Precio base
                </label>
                <input
                  type="number"
                  className="form-control input-dark"
                  value={precioBase}
                  onChange={(e) => setPrecioBase(e.target.value)}
                />
              </div>

              <div className="d-flex gap-2">
                <button className="btn btn-gold" onClick={guardar}>
                  {editando ? "Actualizar" : "Registrar"}
                </button>

                <button className="btn btn-dark-outline" onClick={limpiar}>
                  Limpiar
                </button>
              </div>
            </CardDark>
          </div>

          <div className="col-lg-8">
            <CardDark>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h4 className="section-title">Lista de servicios</h4>
                  <p className="section-subtitle">
                    Servicios activos registrados en el sistema
                  </p>
                </div>

                <GoldBadge>{lista.length} registros</GoldBadge>
              </div>

              <TableDark headers={["Nombre", "Precio Base", "Acciones"]}>
                {lista.length > 0 ? (
                  lista.map((s) => (
                    <tr key={s.idServicio}>
                      <td style={{ fontWeight: 600 }}>{s.nombre}</td>
                      <td style={{ color: "#f0cf73", fontWeight: 700 }}>
                        S/ {Number(s.precioBase).toFixed(2)}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm me-2 btn-gold"
                          onClick={() => editar(s)}
                        >
                          Editar
                        </button>

                        <button
                          className="btn btn-sm btn-dark-outline"
                          onClick={() => eliminar(s.idServicio)}
                        >
                          Desactivar
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center py-4">
                      No hay servicios registrados
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

export default Servicios;