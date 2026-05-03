import React, { useEffect, useState } from "react";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";
import CardDark from "../components/ui/CardDark";
import PageHeader from "../components/ui/PageHeader";
import GoldBadge from "../components/ui/GoldBadge";

function Servicios() {
  const [lista, setLista] = useState([]);

  const [nombre, setNombre] = useState("");
  const [precioBase, setPrecioBase] = useState("");
  const [descripcionCorta, setDescripcionCorta] = useState("");
  const [duracionMinutos, setDuracionMinutos] = useState("");
  const [destacado, setDestacado] = useState(false);

  const [imagenServicio, setImagenServicio] = useState(null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [previewServicio, setPreviewServicio] = useState("");

  const [editando, setEditando] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const baseUrl = API_BASE.replace("/api", "");

  useEffect(() => {
    cargarInicial();
  }, []);

  const validarImagen = (archivo) => {
    if (!archivo) return true;

    const permitidos = ["image/jpeg", "image/png", "image/webp"];
    const maxMB = 3;

    if (!permitidos.includes(archivo.type)) {
      setError("Solo se permiten imágenes JPG, PNG o WEBP.");
      return false;
    }

    if (archivo.size > maxMB * 1024 * 1024) {
      setError(`La imagen no debe superar ${maxMB} MB.`);
      return false;
    }

    return true;
  };

  const cargarInicial = async () => {
    try {
      setError("");

      const res = await authFetch(`${API_BASE}/Servicios`);
      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "Error al cargar servicios");
        return;
      }

      setLista(data || []);
    } catch (err) {
      console.error(err);
      setError("Error al cargar servicios");
    }
  };

  const recargarServicios = cargarInicial;

  const ejecutarSubidaImagen = async (id) => {
    if (!imagenServicio) return true;

    if (!validarImagen(imagenServicio)) return false;

    try {
      setSubiendoImagen(true);

      const formData = new FormData();
      formData.append("imagen", imagenServicio);

      const res = await authFetch(`${API_BASE}/Servicios/subir-imagen/${id}`, {
        method: "POST",
        body: formData,
      });

      if (!res) return false;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "Servicio guardado, pero falló la imagen.");
        return false;
      }

      return true;
    } catch (err) {
      console.error(err);
      setError("Error de conexión al subir la imagen.");
      return false;
    } finally {
      setSubiendoImagen(false);
    }
  };

  const guardar = async () => {
    setMensaje("");
    setError("");

    const nombreLimpio = nombre.trim();
    const descripcionLimpia = descripcionCorta.trim();
    const precioNumero = Number(precioBase);
    const duracionNumero = duracionMinutos ? Number(duracionMinutos) : null;

    if (!nombreLimpio) {
      setError("El nombre del servicio es obligatorio.");
      return;
    }

    if (!precioNumero || precioNumero <= 0) {
      setError("El precio debe ser mayor a 0.");
      return;
    }

    if (duracionNumero !== null && (duracionNumero <= 0 || duracionNumero > 480)) {
      setError("La duración debe estar entre 1 y 480 minutos.");
      return;
    }

    if (imagenServicio && !validarImagen(imagenServicio)) return;

    const payload = {
      nombre: nombreLimpio,
      precioBase: precioNumero,
      descripcionCorta: descripcionLimpia,
      duracionMinutos: duracionNumero,
      destacado,
    };

    try {
      setGuardando(true);

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

      const result = await response.json();

      if (!response.ok) {
        setError(result.mensaje || "No se pudo guardar el servicio");
        return;
      }

      const idFinal = editando || result?.data?.idServicio || result?.idServicio;

      if (idFinal && imagenServicio) {
        const subidaOk = await ejecutarSubidaImagen(idFinal);
        if (!subidaOk) return;
      }

      setMensaje(editando ? "Servicio actualizado." : "Servicio registrado con éxito.");
      limpiar();
      await recargarServicios();
    } catch (err) {
      console.error(err);
      setError("Error al procesar la solicitud.");
    } finally {
      setGuardando(false);
    }
  };

  const subirImagenDirecto = async () => {
    setMensaje("");
    setError("");

    if (!editando) {
      setError("Selecciona un servicio primero.");
      return;
    }

    if (!imagenServicio) {
      setError("Selecciona un archivo de imagen.");
      return;
    }

    if (!validarImagen(imagenServicio)) return;

    const ok = await ejecutarSubidaImagen(editando);

    if (ok) {
      setMensaje("Imagen actualizada correctamente.");
      setImagenServicio(null);
      setPreviewServicio("");
      await recargarServicios();
    }
  };

  const eliminarImagenServicio = async () => {
    setMensaje("");
    setError("");

    if (!editando) return;

    if (!window.confirm("¿Eliminar la imagen actual?")) return;

    try {
      const res = await authFetch(
        `${API_BASE}/Servicios/eliminar-imagen/${editando}`,
        {
          method: "PATCH",
        }
      );

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo eliminar la imagen.");
        return;
      }

      setMensaje("Imagen eliminada.");
      setImagenServicio(null);
      setPreviewServicio("");
      await recargarServicios();
    } catch (err) {
      console.error(err);
      setError("Error al eliminar imagen.");
    }
  };

  const editar = (s) => {
    setEditando(s.idServicio);
    setNombre(s.nombre || "");
    setPrecioBase(s.precioBase ?? "");
    setDescripcionCorta(s.descripcionCorta || "");
    setDuracionMinutos(s.duracionMinutos || "");
    setDestacado(!!s.destacado);
    setImagenServicio(null);
    setPreviewServicio("");
    setMensaje("");
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminar = async (id) => {
    setMensaje("");
    setError("");

    if (!window.confirm("¿Desactivar este servicio?")) return;

    try {
      const res = await authFetch(`${API_BASE}/Servicios/desactivar/${id}`, {
        method: "PATCH",
      });

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo desactivar el servicio.");
        return;
      }

      setMensaje("Servicio desactivado.");
      await recargarServicios();
    } catch (err) {
      console.error(err);
      setError("Error al desactivar servicio.");
    }
  };

  const limpiar = () => {
    setEditando(null);
    setNombre("");
    setPrecioBase("");
    setDescripcionCorta("");
    setDuracionMinutos("");
    setDestacado(false);
    setImagenServicio(null);
    setPreviewServicio("");
  };

  const obtenerImagenServicio = () => {
    if (previewServicio) return previewServicio;

    if (editando) {
      const s = lista.find((item) => item.idServicio === editando);
      if (s?.imagenUrl) return `${baseUrl}${s.imagenUrl}`;
    }

    return "";
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Gestión de Servicios"
        subtitle="Registra y administra los servicios de tu barbería"
      />

      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-12" style={{ maxWidth: "1200px" }}>
            {mensaje && (
              <div className="alert alert-success border-0 shadow-sm">
                {mensaje}
              </div>
            )}

            {error && (
              <div className="alert alert-danger border-0 shadow-sm">
                {error}
              </div>
            )}

            <div className="row g-4">
              <div className="col-lg-4">
                <CardDark className="h-100 shadow">
                  <h4 className="section-title mb-4">
                    {editando ? "Editar servicio" : "Nuevo servicio"}
                  </h4>

                  <div className="mb-3">
                    <label className="form-label text-gold small fw-bold">
                      Nombre
                    </label>

                    <input
                      className="form-control input-dark"
                      placeholder="Ej: Corte Degradado"
                      value={nombre}
                      maxLength={120}
                      onChange={(e) => setNombre(e.target.value)}
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label text-gold small fw-bold">
                        Precio (S/)
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control input-dark"
                        placeholder="0.00"
                        value={precioBase}
                        onChange={(e) => setPrecioBase(e.target.value)}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label text-gold small fw-bold">
                        Duración (min)
                      </label>

                      <input
                        type="number"
                        min="1"
                        max="480"
                        className="form-control input-dark"
                        placeholder="30"
                        value={duracionMinutos}
                        onChange={(e) => setDuracionMinutos(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-gold small fw-bold">
                      Descripción corta
                    </label>

                    <textarea
                      className="form-control input-dark"
                      rows="2"
                      placeholder="Breve descripción del servicio..."
                      value={descripcionCorta}
                      maxLength={250}
                      onChange={(e) => setDescripcionCorta(e.target.value)}
                    />
                  </div>

                  <div className="form-check form-switch mb-4">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="chkDestacado"
                      checked={destacado}
                      onChange={(e) => setDestacado(e.target.checked)}
                    />

                    <label
                      className="form-check-label text-gold"
                      htmlFor="chkDestacado"
                    >
                      Marcar como destacado ⭐
                    </label>
                  </div>

                  <hr className="opacity-10" />

                  <h5 className="text-gold mb-3 small fw-bold uppercase">
                    Imagen del Servicio
                  </h5>

                  {obtenerImagenServicio() && (
                    <div className="mb-3 text-center">
                      <img
                        src={obtenerImagenServicio()}
                        alt="Preview"
                        style={{
                          width: "100%",
                          height: "160px",
                          objectFit: "cover",
                          borderRadius: "12px",
                          border: "1px solid rgba(212, 175, 55, 0.3)",
                        }}
                      />
                    </div>
                  )}

                  <input
                    type="file"
                    className="form-control input-dark mb-3"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;

                      if (file && !validarImagen(file)) {
                        e.target.value = "";
                        return;
                      }

                      setImagenServicio(file);
                      setPreviewServicio(file ? URL.createObjectURL(file) : "");
                    }}
                  />

                  {editando && (
                    <div className="d-flex gap-2 mb-4">
                      <button
                        className="btn btn-sm btn-dark-outline w-100"
                        onClick={subirImagenDirecto}
                        disabled={subiendoImagen || !imagenServicio}
                      >
                        {subiendoImagen ? "Subiendo..." : "Subir nueva"}
                      </button>

                      <button
                        className="btn btn-sm btn-dark-outline w-100 text-danger"
                        onClick={eliminarImagenServicio}
                        disabled={subiendoImagen}
                      >
                        Quitar
                      </button>
                    </div>
                  )}

                  <div className="d-flex gap-2 mt-4">
                    <button
                      className="btn btn-gold w-100 fw-bold"
                      onClick={guardar}
                      disabled={subiendoImagen || guardando}
                    >
                      {subiendoImagen || guardando
                        ? "Procesando..."
                        : editando
                        ? "Actualizar"
                        : "Registrar"}
                    </button>

                    <button
                      className="btn btn-dark-outline w-100"
                      onClick={limpiar}
                      disabled={subiendoImagen || guardando}
                    >
                      Limpiar
                    </button>
                  </div>
                </CardDark>
              </div>

              <div className="col-lg-8">
                <CardDark className="shadow">
                  <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                    <h4 className="section-title mb-0">Servicios Activos</h4>
                    <GoldBadge>{lista.length} servicios registrados</GoldBadge>
                  </div>

                  <div className="d-flex flex-column gap-3">
                    {lista.length === 0 ? (
                      <div className="text-center py-4 text-muted">
                        No hay servicios registrados.
                      </div>
                    ) : (
                      lista.map((s) => (
                        <div key={s.idServicio} className="servicio-list-card">
                          <div className="servicio-list-left">
                            {s.imagenUrl ? (
                              <img
                                src={`${baseUrl}${s.imagenUrl}`}
                                className="servicio-list-img"
                                alt={s.nombre}
                              />
                            ) : (
                              <div className="servicio-list-placeholder">✂</div>
                            )}

                            <div>
                              <div className="servicio-list-name">
                                {s.nombre}
                              </div>

                              <div className="servicio-list-desc">
                                {s.descripcionCorta || "Sin descripción"}
                              </div>

                              <div className="servicio-list-meta">
                                <span>⏱ {s.duracionMinutos || "-"} min</span>

                                {s.destacado && (
                                  <span className="servicio-list-badge">
                                    ⭐ Destacado
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="servicio-list-right">
                            <div className="servicio-list-price">
                              S/ {Number(s.precioBase || 0).toFixed(2)}
                            </div>

                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-gold"
                                onClick={() => editar(s)}
                              >
                                Editar
                              </button>

                              <button
                                className="btn btn-sm btn-dark-outline"
                                onClick={() => eliminar(s.idServicio)}
                              >
                                Borrar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardDark>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Servicios;