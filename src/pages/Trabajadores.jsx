import React, { useEffect, useState } from "react";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";

import CardDark from "../components/ui/CardDark";
import GoldBadge from "../components/ui/GoldBadge";
import AvatarCircle from "../components/ui/AvatarCircle";
import { Pencil, Image, Key, Trash2, Plus, X, Upload } from "lucide-react";

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

function Trabajadores() {
  const [lista, setLista] = useState([]);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [experiencia, setExperiencia] = useState("");
  const [destacado, setDestacado] = useState(false);

  const [editando, setEditando] = useState(null);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState(null);
  const [trabajadorAcceso, setTrabajadorAcceso] = useState(null);

  const [modalTrabajador, setModalTrabajador] = useState(false);
  const [modalImagenes, setModalImagenes] = useState(false);
  const [modalAcceso, setModalAcceso] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [correoAcceso, setCorreoAcceso] = useState("");

  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [imagenTrabajo, setImagenTrabajo] = useState(null);
  const [descripcionTrabajo, setDescripcionTrabajo] = useState("");
  const [imagenesTrabajo, setImagenesTrabajo] = useState([]);

  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [subiendoTrabajo, setSubiendoTrabajo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [creandoAcceso, setCreandoAcceso] = useState(false);
  const [reseteandoAcceso, setReseteandoAcceso] = useState(false);

  useEffect(() => {
    cargarInicial();
  }, []);

  const obtenerUrl = (ruta) => {
    if (!ruta) return "";
    if (ruta.startsWith("http")) return ruta;
    return `${API_BASE.replace("/api", "")}${ruta}`;
  };

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

      const res = await authFetch(`${API_BASE}/Trabajadores`);
      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "Error cargando trabajadores");
        return;
      }

      setLista(data || []);
    } catch (err) {
      console.error(err);
      setError("Error cargando trabajadores");
    }
  };

  const recargarTrabajadores = cargarInicial;

  const cargarImagenesTrabajador = async (id) => {
    try {
      const res = await authFetch(`${API_BASE}/Trabajadores/${id}/imagenes`);
      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setImagenesTrabajo([]);
        return;
      }

      setImagenesTrabajo(data || []);
    } catch (err) {
      console.error(err);
      setImagenesTrabajo([]);
    }
  };

  const limpiarFormulario = () => {
    setEditando(null);
    setTrabajadorSeleccionado(null);
    setNombre("");
    setTelefono("");
    setPorcentaje("");
    setDescripcion("");
    setEspecialidad("");
    setExperiencia("");
    setDestacado(false);
    setFotoPerfil(null);
  };

  const cerrarModalTrabajador = () => {
    limpiarFormulario();
    setModalTrabajador(false);
  };

  const abrirCrearTrabajador = () => {
    setMensaje("");
    setError("");
    limpiarFormulario();
    setModalTrabajador(true);
  };

  const abrirEditarTrabajador = async (t) => {
    setMensaje("");
    setError("");

    setEditando(t.idTrabajador);
    setTrabajadorSeleccionado(t);
    setNombre(t.nombre || "");
    setTelefono(t.telefono || "");
    setPorcentaje(t.porcentajeComision ?? "");
    setDescripcion(t.descripcion || "");
    setEspecialidad(t.especialidad || "");
    setExperiencia(t.experiencia || "");
    setDestacado(!!t.destacado);
    setFotoPerfil(null);

    setModalTrabajador(true);
  };

  const guardar = async () => {
    setMensaje("");
    setError("");

    const nombreLimpio = nombre.trim();
    const telefonoLimpio = telefono.trim();
    const porcentajeNumero = Number(porcentaje || 0);

    if (!nombreLimpio) {
      setError("Nombre obligatorio.");
      return;
    }

    if (telefonoLimpio && !/^[0-9]{9}$/.test(telefonoLimpio)) {
      setError("El teléfono debe tener 9 dígitos.");
      return;
    }

    if (porcentajeNumero < 0 || porcentajeNumero > 100) {
      setError("La comisión debe estar entre 0 y 100.");
      return;
    }

    if (fotoPerfil && !validarImagen(fotoPerfil)) return;

    const payload = {
      nombre: nombreLimpio,
      telefono: telefonoLimpio,
      porcentajeComision: porcentajeNumero,
      descripcion: descripcion.trim(),
      especialidad: especialidad.trim(),
      experiencia: experiencia.trim(),
      destacado,
    };

    try {
      setGuardando(true);

      let response;

      if (editando) {
        response = await authFetch(`${API_BASE}/Trabajadores/${editando}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await authFetch(`${API_BASE}/Trabajadores`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response) return;

      const data = await response.json();

      if (!response.ok) {
        setError(data.mensaje || "Error guardando trabajador");
        return;
      }

      const idGuardado =
        editando || data?.data?.idTrabajador || data?.idTrabajador;

      if (fotoPerfil && idGuardado) {
        await subirFotoPerfil(idGuardado, false);
      }

      setMensaje(editando ? "Trabajador actualizado." : "Trabajador registrado.");
      cerrarModalTrabajador();
      await recargarTrabajadores();
    } catch (err) {
      console.error(err);
      setError("Error en el servidor");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm("¿Desactivar trabajador?")) return;

    try {
      const res = await authFetch(`${API_BASE}/Trabajadores/desactivar/${id}`, {
        method: "PATCH",
      });

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo desactivar trabajador");
        return;
      }

      setMensaje("Desactivado correctamente");
      await recargarTrabajadores();
    } catch (err) {
      console.error(err);
      setError("Error al desactivar trabajador");
    }
  };

  const abrirImagenes = async (t) => {
    setMensaje("");
    setError("");
    setTrabajadorSeleccionado(t);
    setImagenTrabajo(null);
    setDescripcionTrabajo("");
    await cargarImagenesTrabajador(t.idTrabajador);
    setModalImagenes(true);
  };

  const cerrarImagenes = () => {
    setModalImagenes(false);
    setTrabajadorSeleccionado(null);
    setImagenTrabajo(null);
    setDescripcionTrabajo("");
    setImagenesTrabajo([]);
  };

  const subirFotoPerfil = async (idTrabajador, mostrar = true) => {
    if (!fotoPerfil) return;

    if (!validarImagen(fotoPerfil)) return;

    try {
      setSubiendoFoto(true);

      const form = new FormData();
      form.append("archivo", fotoPerfil);

      const res = await authFetch(
        `${API_BASE}/Trabajadores/subir-foto/${idTrabajador}`,
        {
          method: "POST",
          body: form,
        }
      );

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo subir la foto");
        return;
      }

      if (mostrar) setMensaje("Foto actualizada");
      setFotoPerfil(null);
    } catch (err) {
      console.error(err);
      setError("Error al subir foto");
    } finally {
      setSubiendoFoto(false);
    }
  };

  const subirImagenTrabajo = async () => {
    setMensaje("");
    setError("");

    if (!trabajadorSeleccionado) {
      setError("Selecciona un trabajador.");
      return;
    }

    if (!imagenTrabajo) {
      setError("Selecciona una imagen de trabajo.");
      return;
    }

    if (!validarImagen(imagenTrabajo)) return;

    if (imagenesTrabajo.length >= 10) {
      setError("Solo puedes registrar hasta 10 imágenes por trabajador.");
      return;
    }

    try {
      setSubiendoTrabajo(true);

      const form = new FormData();
      form.append("archivo", imagenTrabajo);
      form.append("descripcion", descripcionTrabajo.trim());

      const res = await authFetch(
        `${API_BASE}/Trabajadores/subir-trabajo/${trabajadorSeleccionado.idTrabajador}`,
        {
          method: "POST",
          body: form,
        }
      );

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo subir la imagen");
        return;
      }

      setMensaje("Trabajo agregado");
      setImagenTrabajo(null);
      setDescripcionTrabajo("");
      await cargarImagenesTrabajador(trabajadorSeleccionado.idTrabajador);
    } catch (err) {
      console.error(err);
      setError("Error al subir imagen");
    } finally {
      setSubiendoTrabajo(false);
    }
  };

  const eliminarImagenTrabajo = async (idImagen) => {
    if (!trabajadorSeleccionado) return;

    if (!window.confirm("¿Eliminar imagen?")) return;

    try {
      const res = await authFetch(
        `${API_BASE}/Trabajadores/imagenes/${idImagen}`,
        {
          method: "DELETE",
        }
      );

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo eliminar la imagen");
        return;
      }

      await cargarImagenesTrabajador(trabajadorSeleccionado.idTrabajador);
    } catch (err) {
      console.error(err);
      setError("Error al eliminar imagen");
    }
  };

  const abrirAcceso = (t) => {
    setMensaje("");
    setError("");
    setTrabajadorAcceso(t);
    setCorreoAcceso("");
    setModalAcceso(true);
  };

  const cerrarAcceso = () => {
    setTrabajadorAcceso(null);
    setCorreoAcceso("");
    setModalAcceso(false);
  };

  const obtenerIdUsuarioAcceso = (t) => {
    return (
      t?.idUsuarioAcceso ||
      t?.idUsuario ||
      t?.idUsuarioTrabajador ||
      t?.usuario?.idUsuario ||
      null
    );
  };

  const crearAcceso = async () => {
    setMensaje("");
    setError("");

    if (!trabajadorAcceso) return;

    const correoLimpio = correoAcceso.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
      setError("Correo inválido.");
      return;
    }

    try {
      setCreandoAcceso(true);

      const res = await authFetch(`${API_BASE}/Usuarios/crear-acceso-trabajador`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idTrabajador: trabajadorAcceso.idTrabajador,
          correo: correoLimpio,
        }),
      });

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo crear el acceso");
        return;
      }

      setMensaje(
        "Acceso creado correctamente. Se envió la contraseña temporal al correo."
      );
      cerrarAcceso();
      await recargarTrabajadores();
    } catch (err) {
      console.error(err);
      setError("Error al crear acceso");
    } finally {
      setCreandoAcceso(false);
    }
  };

  const resetearAcceso = async () => {
    setMensaje("");
    setError("");

    const idUsuario = obtenerIdUsuarioAcceso(trabajadorAcceso);

    if (!idUsuario) {
      setError(
        "No se encontró el usuario de acceso de este trabajador. Si aún no tiene acceso, créalo primero."
      );
      return;
    }

    if (!window.confirm("¿Generar nueva contraseña temporal y enviarla al correo?")) {
      return;
    }

    try {
      setReseteandoAcceso(true);

      const res = await authFetch(
        `${API_BASE}/Usuarios/resetear-password/${idUsuario}`,
        {
          method: "POST",
        }
      );

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo resetear el acceso");
        return;
      }

      setMensaje("Nueva contraseña temporal enviada al correo.");
      cerrarAcceso();
    } catch (err) {
      console.error(err);
      setError("Error al resetear acceso");
    } finally {
      setReseteandoAcceso(false);
    }
  };

  

  return (
    <div className="page-shell">
      <div className="container-fluid py-4">
        <CardDark className="mb-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h1
                className="page-title mb-1"
                style={{ color: "#d4af37", fontWeight: 900 }}
              >
                Gestión de Trabajadores
              </h1>

              <p
                className="page-subtitle"
                style={{ color: "#111827", fontWeight: 700 }}
              >
                Administra perfiles públicos, portafolio, accesos y trabajadores destacados.
              </p>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <GoldBadge>{lista.length} trabajadores activos</GoldBadge>

              <button className="btn btn-gold" onClick={abrirCrearTrabajador}>
                <Plus size={17} />
                <span>Nuevo trabajador</span>
              </button>
            </div>
          </div>
        </CardDark>

        {mensaje && <div className="alert alert-success shadow-sm">{mensaje}</div>}
        {error && <div className="alert alert-danger shadow-sm">{error}</div>}

        <CardDark>
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
              <h4 className="section-title">Lista de Trabajadores</h4>
              <p className="section-subtitle">
                Vista rápida de estado, especialidad, comisión y acciones.
              </p>
            </div>
          </div>

          <div className="trabajadores-grid">
            {lista.map((t) => (
              <div className="trabajador-card-wrap" key={t.idTrabajador}>
                <div className="worker-card trabajador-card-pro h-100">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <AvatarCircle
                      src={obtenerUrl(t.fotoPerfilUrl)}
                      alt={t.nombre}
                      fallback={t.nombre?.charAt(0)?.toUpperCase() || "T"}
                      selected={t.destacado}
                      size="md"
                    />

                    <div style={{ minWidth: 0 }}>
                      <h5 className="mb-1 truncate-one-line" title={t.nombre}>
                        {t.nombre}
                      </h5>

                      {t.destacado ? (
                        <span className="table-pill">⭐ Destacado</span>
                      ) : (
                        <span className="badge bg-light text-secondary">
                          Estándar
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="section-subtitle mb-3 trabajador-bio">
                    {t.descripcion || "Sin biografía pública registrada."}
                  </p>

                  <div className="modal-success-details mb-3">
                    <div className="modal-info-row">
                      <span>Especialidad</span>
                      <b>{t.especialidad || "No especificada"}</b>
                    </div>

                    <div className="modal-info-row">
                      <span>Experiencia</span>
                      <b>{t.experiencia || "No especificada"}</b>
                    </div>

                    <div className="modal-info-row">
                      <span>Comisión</span>
                      <b>{t.porcentajeComision || 0}%</b>
                    </div>
                  </div>

                  <div className="actions-grid">
                    <button
                      className="btn-action-dark"
                      onClick={() => abrirEditarTrabajador(t)}
                    >
                      <Pencil size={16} />
                      <span>Editar</span>
                    </button>

                    <button
                      className="btn-action-dark"
                      onClick={() => abrirImagenes(t)}
                    >
                      <Image size={16} />
                      <span>Imágenes</span>
                    </button>

                    <button
                      className="btn-action-dark"
                      onClick={() => abrirAcceso(t)}
                    >
                      <Key size={16} />
                      <span>Acceso</span>
                    </button>

                    <button
                      className="btn-action-danger"
                      onClick={() => eliminar(t.idTrabajador)}
                    >
                      <Trash2 size={16} />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {lista.length === 0 && (
            <p className="text-center section-subtitle py-4">
              Aún no tienes trabajadores registrados.
            </p>
          )}
        </CardDark>

        <Modal
          abierto={modalTrabajador}
          titulo={editando ? "Editar trabajador" : "Nuevo trabajador"}
          onClose={cerrarModalTrabajador}
        >
          <div className="row g-3">
            <div className="col-md-6">
              <label className="label-gold">Nombre completo</label>
              <input
                className="form-control input-dark"
                value={nombre}
                maxLength={120}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="label-gold">Teléfono</label>
              <input
                className="form-control input-dark"
                value={telefono}
                maxLength={9}
                inputMode="numeric"
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>

            <div className="col-md-4">
              <label className="label-gold">% Comisión</label>
              <input
                className="form-control input-dark"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={porcentaje}
                onChange={(e) => setPorcentaje(e.target.value)}
              />
            </div>

            <div className="col-md-4">
              <label className="label-gold">Especialidad</label>
              <input
                className="form-control input-dark"
                value={especialidad}
                maxLength={150}
                onChange={(e) => setEspecialidad(e.target.value)}
                placeholder="Fades, barba..."
              />
            </div>

            <div className="col-md-4">
              <label className="label-gold">Experiencia</label>
              <input
                className="form-control input-dark"
                value={experiencia}
                maxLength={150}
                onChange={(e) => setExperiencia(e.target.value)}
                placeholder="3 años"
              />
            </div>

            <div className="col-12">
              <label className="label-gold">Biografía pública</label>
              <textarea
                rows="3"
                className="form-control input-dark"
                value={descripcion}
                maxLength={500}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción que verá el cliente"
              />
            </div>

            <div className="col-md-8">
              <label className="label-gold">Foto de perfil</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="form-control input-dark"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file && !validarImagen(file)) {
                    e.target.value = "";
                    return;
                  }

                  setFotoPerfil(file);
                }}
              />
            </div>

            <div className="col-md-4 d-flex align-items-end">
              <div className="form-check form-switch mb-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={destacado}
                  onChange={(e) => setDestacado(e.target.checked)}
                  id="swDestacadoModal"
                />

                <label
                  className="form-check-label fw-bold"
                  htmlFor="swDestacadoModal"
                  style={{ color: "#c9a227" }}
                >
                  Destacado ⭐
                </label>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 flex-wrap">
            <button className="btn btn-dark-outline" onClick={cerrarModalTrabajador}>
              Cancelar
            </button>

            <button
              className="btn btn-gold"
              onClick={guardar}
              disabled={subiendoFoto || guardando}
            >
              {subiendoFoto || guardando
                ? "Procesando..."
                : editando
                ? "Actualizar"
                : "Registrar"}
            </button>
          </div>
        </Modal>

        <Modal
          abierto={modalImagenes}
          titulo={
            trabajadorSeleccionado
              ? `Portafolio: ${trabajadorSeleccionado.nombre}`
              : "Portafolio"
          }
          onClose={cerrarImagenes}
          ancho="920px"
        >
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <p className="section-subtitle mb-0">
              Agrega trabajos reales que aparecerán en el perfil público.
            </p>

            <GoldBadge>{imagenesTrabajo.length} / 10</GoldBadge>
          </div>

          <div className="row g-2 mb-4">
            <div className="col-md-5">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="form-control input-dark"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file && !validarImagen(file)) {
                    e.target.value = "";
                    return;
                  }

                  setImagenTrabajo(file);
                }}
              />
            </div>

            <div className="col-md-5">
              <input
                className="form-control input-dark"
                placeholder="¿Qué trabajo es?"
                value={descripcionTrabajo}
                maxLength={200}
                onChange={(e) => setDescripcionTrabajo(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <button
                className="btn btn-gold w-100"
                onClick={subirImagenTrabajo}
                disabled={subiendoTrabajo || imagenesTrabajo.length >= 10}
              >
                <Upload size={16} />
                {subiendoTrabajo ? "..." : "Subir"}
              </button>
            </div>
          </div>

          {imagenesTrabajo.length >= 10 && (
            <p className="section-subtitle mb-3">
              Has alcanzado el límite recomendado de 10 trabajos para el perfil público.
            </p>
          )}

          <div className="row g-3">
            {imagenesTrabajo.map((img) => (
              <div className="col-md-4" key={img.idImagen}>
                <div className="card-image-work">
                  <img
                    className="img-work"
                    src={obtenerUrl(img.urlImagen)}
                    alt="trabajo"
                  />

                  <div className="p-2">
                    <p className="small text-muted mb-2 text-truncate">
                      {img.descripcion}
                    </p>

                    <button
                      className="btn btn-sm btn-outline-danger w-100"
                      onClick={() => eliminarImagenTrabajo(img.idImagen)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {imagenesTrabajo.length === 0 && (
            <p className="text-center section-subtitle py-4">
              Aún no hay imágenes para este trabajador.
            </p>
          )}
        </Modal>

        <Modal
          abierto={modalAcceso}
          titulo={
            trabajadorAcceso
              ? `Acceso: ${trabajadorAcceso.nombre}`
              : "Acceso del trabajador"
          }
          onClose={cerrarAcceso}
          ancho="620px"
        >
          <p className="section-subtitle">
            Ingresa el correo del trabajador. El sistema generará una contraseña temporal
            y la enviará por Gmail.
          </p>

          <div className="mb-3">
            <label className="label-gold">Correo del trabajador</label>
            <input
              className="form-control input-dark"
              value={correoAcceso}
              onChange={(e) => setCorreoAcceso(e.target.value)}
              placeholder="trabajador@gmail.com"
            />
          </div>

          <div className="modal-success-details mb-3">
            <div className="modal-info-row">
              <span>Trabajador</span>
              <b>{trabajadorAcceso?.nombre}</b>
            </div>

            <div className="modal-info-row">
              <span>Acción</span>
              <b>Crear acceso y enviar contraseña temporal</b>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 flex-wrap">
            <button className="btn btn-dark-outline" onClick={cerrarAcceso}>
              Cancelar
            </button>

            <button
              className="btn btn-dark-outline"
              onClick={resetearAcceso}
              disabled={reseteandoAcceso}
              title="Disponible si el trabajador ya tiene usuario vinculado."
            >
              {reseteandoAcceso ? "Enviando..." : "Resetear contraseña"}
            </button>

            <button
              className="btn btn-gold"
              onClick={crearAcceso}
              disabled={creandoAcceso}
            >
              {creandoAcceso ? "Creando..." : "Crear acceso"}
            </button>
          </div>
        </Modal>

        <style>{`
          .trabajadores-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
          }

          .trabajador-card-pro {
            text-align: left;
            min-height: 100%;
            display: flex;
            flex-direction: column;
          }

          .trabajador-bio {
            min-height: 44px;
          }

          .trab-modal-backdrop {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: rgba(0, 0, 0, 0.68);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 18px;
          }

          .trab-modal {
            width: 100%;
            max-height: 92vh;
            overflow-y: auto;
            border-radius: 24px;
            background: #f5f7f4;
            border: 1px solid rgba(212, 175, 55, 0.35);
            box-shadow: 0 26px 80px rgba(0,0,0,.45);
          }

          .trab-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 22px;
            border-bottom: 1px solid rgba(212, 175, 55, 0.18);
          }

          .trab-modal-header h4 {
            color: #d4af37;
            font-weight: 900;
            margin: 0;
          }

          .trab-modal-body {
            padding: 22px;
          }

          .trab-modal-close {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: 1px solid rgba(212, 175, 55, 0.35);
            background: transparent;
            color: #d4af37;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .btn-gold {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
          }

          @media (max-width: 991px) {
            .trabajadores-grid {
              display: flex;
              overflow-x: auto;
              scroll-snap-type: x mandatory;
              gap: 14px;
              padding-bottom: 12px;
            }

            .trabajador-card-wrap {
              min-width: 86%;
              scroll-snap-align: start;
            }

            .trabajador-card-pro {
              min-height: 100%;
            }

            .trabajadores-grid::-webkit-scrollbar {
              height: 6px;
            }

            .trabajadores-grid::-webkit-scrollbar-thumb {
              background: #d4af37;
              border-radius: 999px;
            }

            .trab-modal {
              border-radius: 20px;
              max-height: 94vh;
            }

            .trab-modal-header,
            .trab-modal-body {
              padding: 16px;
            }

            .actions-grid {
              grid-template-columns: 1fr 1fr;
            }
          }

          @media (max-width: 576px) {
            .trabajador-card-wrap {
              min-width: 92%;
            }

            .btn-gold,
            .btn-dark-outline {
              width: 100%;
            }

            .trab-modal-backdrop {
              padding: 10px;
              align-items: flex-end;
            }

            .trab-modal {
              border-radius: 22px 22px 0 0;
              max-height: 92vh;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

export default Trabajadores;