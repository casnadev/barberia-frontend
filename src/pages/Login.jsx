import { useState } from "react";
import API_BASE from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const login = async (e) => {
    e.preventDefault();
    setError("");

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

      localStorage.setItem("usuario", JSON.stringify(data));
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Error de conexión");
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
          />
        </div>

        <div className="mb-4">
          <label className="login-label">Contraseña</label>
          <input
            type="password"
            className="form-control login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="****"
          />
        </div>

        <button type="submit" className="btn login-button w-100">
          Ingresar
        </button>
      </form>
    </div>
  );
}