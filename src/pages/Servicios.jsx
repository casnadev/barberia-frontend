import React, { useEffect, useState } from "react";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";

import CardDark from "../components/ui/CardDark";
import GoldBadge from "../components/ui/GoldBadge";
import PageHeader from "../components/ui/PageHeader";
import Toast from "../components/ui/Toast";

import { getImageUrl } from "../utils/imageUrl";
import {
  Pencil,
  Trash2,
  Plus,
  X,
  Upload,
  RotateCcw,
  ImagePlus,
  Scissors,
} from "lucide-react";

const Modal = ({ abierto, titulo, children, onClose, ancho = "760px" }) => {
  if (!abierto) return null;

  return (
    <div className="trab-modal-backdrop">
      <div className="trab-modal" style={{ maxWidth: ancho }}>
        <div className="trab-modal-header">
          <h4>{titulo}</h4>

          <button className="trab-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="trab-modal-body">{children}</div>
      </div>
    </div>
  );
};

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
  const [modalServicio, setModalServicio] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarInicial();
  }, []);

  useEffect(() => {
    return () => {
      if (previewServicio) URL.revokeObjectURL(previewServicio);
    };
  }, [previewServicio]);

  const mostrarError = (msg) => {
    setMensaje("");
    setError(msg);
  };

  const validarImagen = (archivo) => {
    if (!archivo) return true;

    const permitidos = ["image/jpeg", "image/png", "image/webp"];
    const maxMB = 3;

    if (!permitidos.includes(archivo.type)) {
      mostrarError("Solo se permiten imágenes JPG, PNG o WEBP.");
      return false;
    }

    if (archivo.size > maxMB * 1024 * 1024) {
      mostrarError(`La imagen no debe superar ${maxMB} MB.`);
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

  const limpiarPreviewServicio = () => {
    if (previewServicio) URL.revokeObjectURL(previewServicio);
    setPreviewServicio("");
  };

  const seleccionarImagenServicio = (e) => {
    const file = e.target.files?.[0] || null;

    if (file && !validarImagen(file)) {
      e.target.value = "";
      return;
    }

    limpiarPreviewServicio();
    setImagenServicio(file);
    setPreviewServicio(file ? URL.createObjectURL(file) : "");
  };

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
      cerrarModalServicio();
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
      limpiarPreviewServicio();
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
      limpiarPreviewServicio();
      await recargarServicios();
    } catch (err) {
      console.error(err);
      setError("Error al eliminar imagen.");
    }
  };

  const abrirCrearServicio = () => {
    setMensaje("");
    setError("");
    limpiar();
    setModalServicio(true);
  };

  const editar = (s) => {
    setEditando(s.idServicio);
    setNombre(s.nombre || "");
    setPrecioBase(s.precioBase ?? "");
    setDescripcionCorta(s.descripcionCorta || "");
    setDuracionMinutos(s.duracionMinutos || "");
    setDestacado(!!s.destacado);
    setImagenServicio(null);
    limpiarPreviewServicio();
    setMensaje("");
    setError("");
    setModalServicio(true);
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
    limpiarPreviewServicio();
  };

  const cerrarModalServicio = () => {
    limpiar();
    setModalServicio(false);
  };

  const obtenerImagenServicio = () => {
    if (previewServicio) return previewServicio;

    if (editando) {
      const s = lista.find((item) => item.idServicio === editando);
      if (s?.imagenUrl) return getImageUrl(s.imagenUrl);
    }

    return "";
  };

  return (
    <div className="page-shell servicios-page">
      <div className="container-fluid py-4">
        <CardDark className="mb-4 trabajadores-header-card servicios-header-card">
          <div className="trabajadores-header-row">
            <PageHeader
              title="Gestión de Servicios"
              subtitle="Registra, edita y destaca los servicios visibles para tus clientes."
            />

            <div className="trabajadores-header-actions">
              <GoldBadge>{lista.length} servicios activos</GoldBadge>

              <button className="btn btn-gold" onClick={abrirCrearServicio}>
                <Plus size={17} />
                <span>Nuevo servicio</span>
              </button>
            </div>
          </div>
        </CardDark>

        <Toast mensaje={mensaje} tipo="success" onClose={() => setMensaje("")} />
        <Toast mensaje={error} tipo="error" onClose={() => setError("")} />

        <CardDark className="servicios-panel-card">
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
              <h4 className="section-title">Servicios Activos</h4>
              <p className="section-subtitle">
                Vista rápida de precio, duración, imagen pública y acciones.
              </p>
            </div>
          </div>

          <div className="servicios-grid">
            {lista.map((s) => (
              <div className="servicio-card-wrap" key={s.idServicio}>
                <div className="servicio-card-dashboard h-100">
                  <div className="servicio-thumb-box">
                    {s.imagenUrl ? (
                      <img
                        src={getImageUrl(s.imagenUrl)}
                        className="servicio-thumb-img"
                        alt={s.nombre}
                      />
                    ) : (
                      <div className="servicio-thumb-placeholder">
                        <Scissors size={34} />
                      </div>
                    )}

                    {s.destacado && (
                      <span className="servicio-floating-badge">⭐ Destacado</span>
                    )}
                  </div>

                  <div className="servicio-card-body">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <div className="min-w-0">
                        <h5 className="servicio-card-title truncate-one-line" title={s.nombre}>
                          {s.nombre}
                        </h5>

                        <p className="servicio-card-desc">
                          {s.descripcionCorta || "Sin descripción registrada."}
                        </p>
                      </div>

                      <div className="servicio-card-price">
                        S/ {Number(s.precioBase || 0).toFixed(2)}
                      </div>
                    </div>

                    <div className="servicio-card-meta">
                      <span>⏱ {s.duracionMinutos || "-"} min</span>

                      {!s.destacado && <span>Estándar</span>}
                    </div>

                    <div className="actions-grid servicios-actions-grid">
                      <button
                        className="btn-action-dark"
                        onClick={() => editar(s)}
                      >
                        <Pencil size={16} />
                        <span>Editar</span>
                      </button>

                      <button
                        className="btn-action-danger"
                        onClick={() => eliminar(s.idServicio)}
                      >
                        <Trash2 size={16} />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {lista.length === 0 && (
            <div className="servicios-empty">
              <Scissors size={36} />
              <p>Aún no tienes servicios registrados.</p>
            </div>
          )}
        </CardDark>

        <Modal
          abierto={modalServicio}
          titulo={editando ? "Editar servicio" : "Nuevo servicio"}
          onClose={cerrarModalServicio}
          ancho="820px"
        >
          <div className="row g-3">
            <div className="col-md-6">
              <label className="label-gold">Nombre</label>
              <input
                className="form-control input-dark"
                placeholder="Ej: Corte Degradado"
                value={nombre}
                maxLength={120}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <label className="label-gold">Precio (S/)</label>
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

            <div className="col-md-3">
              <label className="label-gold">Duración (min)</label>
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

            <div className="col-12">
              <label className="label-gold">Descripción corta</label>
              <textarea
                className="form-control input-dark"
                rows="3"
                placeholder="Breve descripción del servicio..."
                value={descripcionCorta}
                maxLength={250}
                onChange={(e) => setDescripcionCorta(e.target.value)}
              />
            </div>

            <div className="col-md-8">
              <label className="label-gold">Imagen del servicio</label>
              <input
                type="file"
                className="form-control input-dark"
                accept="image/png,image/jpeg,image/webp"
                onChange={seleccionarImagenServicio}
              />
            </div>

            <div className="col-md-4 d-flex align-items-end">
              <div className="form-check form-switch mb-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="chkDestacadoModal"
                  checked={destacado}
                  onChange={(e) => setDestacado(e.target.checked)}
                />

                <label
                  className="form-check-label fw-bold label-gold"
                  htmlFor="chkDestacadoModal"
                >
                  Destacado ⭐
                </label>
              </div>
            </div>

            <div className="col-12">
              {obtenerImagenServicio() ? (
                <div className="servicio-modal-preview">
                  <img src={obtenerImagenServicio()} alt="Preview del servicio" />
                </div>
              ) : (
                <div className="servicio-modal-preview-empty">
                  <ImagePlus size={32} />
                  <span>Sin imagen seleccionada</span>
                </div>
              )}
            </div>
          </div>

          {editando && (
            <div className="d-flex gap-2 mt-3 flex-wrap">
              <button
                className="btn btn-dark-outline"
                onClick={subirImagenDirecto}
                disabled={subiendoImagen || !imagenServicio}
              >
                <Upload size={16} />
                {subiendoImagen ? "Subiendo..." : "Subir nueva imagen"}
              </button>

              <button
                className="btn btn-dark-outline text-danger"
                onClick={eliminarImagenServicio}
                disabled={subiendoImagen}
              >
                <Trash2 size={16} />
                Quitar imagen
              </button>
            </div>
          )}

          <div className="d-flex justify-content-end gap-2 mt-4 flex-wrap">
            <button className="btn btn-dark-outline" onClick={cerrarModalServicio}>
              Cancelar
            </button>

            <button
              className="btn btn-dark-outline"
              onClick={limpiar}
              disabled={subiendoImagen || guardando}
            >
              <RotateCcw size={16} />
              Limpiar
            </button>

            <button
              className="btn btn-gold"
              onClick={guardar}
              disabled={subiendoImagen || guardando}
            >
              {subiendoImagen || guardando
                ? "Procesando..."
                : editando
                ? "Actualizar"
                : "Registrar"}
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default Servicios;
