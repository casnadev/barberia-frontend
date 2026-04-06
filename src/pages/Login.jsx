import { useState } from "react";
import API_BASE from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const navigate = useNavigate();

  const login = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const res = await fetch(`${API_BASE}/Auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          correo,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "Error al iniciar sesión");
        return;
      }

      localStorage.setItem("token", data.token);

      localStorage.setItem(
        "usuario",
        JSON.stringify({
          idUsuario: data.idUsuario,
          idNegocio: data.idNegocio,
          nombre: data.nombre,
          correo: data.correo,
          rol: data.rol,
        })
      );

      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Error de conexión");
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

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <div className="mb-3">
          <label className="login-label">Correo</label>
          <input
            type="email"
            className="form-control login-input"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="admin@barberia.com"
            autoComplete="username"
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
              placeholder="**"
              autoComplete="current-password"
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
    </div>
  );
}