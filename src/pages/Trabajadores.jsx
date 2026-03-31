import React, { useEffect, useState } from "react";
import API_BASE from "../services/api";
import CardDark from "../components/ui/CardDark";
import PageHeader from "../components/ui/PageHeader";
import GoldBadge from "../components/ui/GoldBadge";
import TableDark from "../components/ui/TableDark";

function Trabajadores() {
  const [lista, setLista] = useState([]);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [editando, setEditando] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const res = await fetch(`${API_BASE}/Trabajadores`);
        const data = await res.json();
        setLista(data);
      } catch (err) {
        console.error(err);
        setError("Error al cargar trabajadores");
      }
    };

    cargarDatos();
  }, []);

  async function cargarTrabajadores() {
    try {
      const res = await fetch(`${API_BASE}/Trabajadores`);
      const data = await res.json();
      setLista(data);
    } catch (err) {
      console.error(err);
      setError("Error al cargar trabajadores");
    }
  }

  const guardar = async () => {
    setMensaje("");
    setError("");

    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    const payload = {
      idNegocio: 1,
      nombre: nombre.trim(),
      telefono,
      porcentajeComision: Number(porcentaje),
    };

    try {
      let response;

      if (editando) {
        response = await fetch(`${API_BASE}/Trabajadores/${editando}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(`${API_BASE}/Trabajadores`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        setError(data.mensaje || "No se pudo guardar el trabajador");
        return;
      }

      setMensaje(
        editando
          ? "Trabajador actualizado correctamente"
          : "Trabajador registrado correctamente"
      );

      limpiar();
      cargarTrabajadores();
    } catch (err) {
      console.error(err);
      setError("Error al guardar trabajador");
    }
  };

  const editar = (t) => {
    setEditando(t.idTrabajador);
    setNombre(t.nombre || "");
    setTelefono(t.telefono || "");
    setPorcentaje(t.porcentajeComision ?? "");
    setMensaje("");
    setError("");
  };

  const eliminar = async (id) => {
    setMensaje("");
    setError("");

    try {
      const response = await fetch(`${API_BASE}/Trabajadores/desactivar/${id}`, {
        method: "PATCH",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.mensaje || "No se pudo desactivar el trabajador");
        return;
      }

      setMensaje("Trabajador desactivado correctamente");
      cargarTrabajadores();
    } catch (err) {
      console.error(err);
      setError("Error al desactivar trabajador");
    }
  };

  const limpiar = () => {
    setEditando(null);
    setNombre("");
    setTelefono("");
    setPorcentaje("");
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Gestión de Trabajadores"
        subtitle="Registra, edita y desactiva personal del negocio"
      />

      <div className="container-fluid py-4">
        {mensaje && <div className="alert alert-success">{mensaje}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="row g-4">
          <div className="col-lg-4">
            <CardDark className="h-100">
              <h4 className="section-title mb-4">
                {editando ? "Editar trabajador" : "Nuevo trabajador"}
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

              <div className="mb-3">
                <label className="form-label" style={{ color: "#d4af37" }}>
                  Teléfono
                </label>
                <input
                  className="form-control input-dark"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="form-label" style={{ color: "#d4af37" }}>
                  % Comisión
                </label>
                <input
                  type="number"
                  className="form-control input-dark"
                  value={porcentaje}
                  onChange={(e) => setPorcentaje(e.target.value)}
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
                  <h4 className="section-title">Lista de trabajadores</h4>
                  <p className="section-subtitle">
                    Personal activo registrado en el sistema
                  </p>
                </div>

                <GoldBadge>{lista.length} registros</GoldBadge>
              </div>

              <TableDark
                headers={["Nombre", "Teléfono", "% Comisión", "Acciones"]}
              >
                {lista.length > 0 ? (
                  lista.map((t, index) => (
                    <tr key={index}>
                      <td style={{ fontWeight: 600 }}>{t.nombre}</td>
                      <td>{t.telefono}</td>
                      <td style={{ color: "#f0cf73", fontWeight: 700 }}>
                        {t.porcentajeComision}%
                      </td>
                      <td>
                        <button
                          className="btn btn-sm me-2 btn-gold"
                          onClick={() => editar(t)}
                        >
                          Editar
                        </button>

                        <button
                          className="btn btn-sm btn-dark-outline"
                          onClick={() => eliminar(t.idTrabajador)}
                        >
                          Desactivar
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-4">
                      No hay trabajadores registrados
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

export default Trabajadores;