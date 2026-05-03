import { useState } from "react";
import API_BASE from "../services/api";
import { useNavigate } from "react-router-dom";
import Toast from "../components/ui/Toast";

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("error");
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const navigate = useNavigate();

  const login = async (e) => {
    e.preventDefault();
    setError("");

    const correoLimpio = correo.trim().toLowerCase();

    if (!correoLimpio || !password.trim()) {
      setTipoMensaje("error");
      setError("Ingresa correo y contraseña.");
      return;
    }

    setCargando(true);

    try {
      const res = await fetch(`${API_BASE}/Auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          correo: correoLimpio,
          password,
        }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setTipoMensaje("error");
        setError(data.mensaje || "Correo o contraseña incorrectos.");
        return;
      }

      if (!data.token) {
        setTipoMensaje("error");
        setError("No se recibió token de acceso.");
        return;
      }

      const usuario = {
        idUsuario: data.idUsuario,
        idNegocio: data.idNegocio,
        idTrabajador: data.idTrabajador,
        nombre: data.nombre,
        correo: data.correo,
        rol: data.rol,
      };

      localStorage.setItem("token", data.token);
      localStorage.setItem("usuario", JSON.stringify(usuario));

      if (data.rol === "Trabajador") {
        navigate("/trabajador", { replace: true });
      } else if (data.rol === "Admin") {
        navigate("/", { replace: true });
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        setTipoMensaje("error");
        setError("Rol no autorizado.");
      }
    } catch (err) {
      console.error(err);
      setTipoMensaje("error");
      setError("Error de conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-overlay" />

      <form className="login-card" onSubmit={login}>
        <div className="login-header">
          <h1>Iniciar sesión</h1>
          <p>Accede al panel de gestión de la barbería</p>
        </div>

        <div className="mb-3">
          <label className="login-label">Correo</label>
          <input
            type="email"
            className="form-control login-input"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="admin@barberstyles.com"
            autoComplete="username"
            disabled={cargando}
          />
        </div>

        <div className="mb-2">
          <label className="login-label">Contraseña</label>

          <div style={{ position: "relative" }}>
            <input
              type={mostrarPassword ? "text" : "password"}
              className="form-control login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              autoComplete="current-password"
              disabled={cargando}
            />

            <button
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                color: "#d4af37",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {mostrarPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        <div
          style={{
            color: "#b8b8b8",
            fontSize: "0.85rem",
            marginBottom: "18px",
          }}
        >
          ¿Olvidaste tu contraseña? Contáctanos para restablecerla.
        </div>

        <button
          type="submit"
          className="btn login-button w-100"
          disabled={cargando}
        >
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <Toast mensaje={error} tipo={tipoMensaje} onClose={() => setError("")} />
    </div>
  );
}