import { useState } from "react";
import { Link } from "react-router-dom";
import API_BASE from "../services/api";
import Toast from "../components/ui/Toast";
import LogoAnimado from "../components/ui/LogoAnimado";

export default function RecuperarPassword() {
  const [correo, setCorreo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("success");
  const [cargando, setCargando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setMensaje("");

    const correoLimpio = correo.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
      setTipoMensaje("error");
      setMensaje("Ingresa un correo válido.");
      return;
    }

    try {
      setCargando(true);

      const res = await fetch(`${API_BASE}/Auth/recuperar-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correoLimpio }),
      });

      const data = await res.json();

      setTipoMensaje(res.ok ? "success" : "error");
      setMensaje(
        data.mensaje ||
          "Si el correo existe, recibirás instrucciones para recuperar tu contraseña."
      );
    } catch {
      setTipoMensaje("error");
      setMensaje("Error de conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="auth-premium-page">
      <div className="auth-premium-card">
        <div
            style={{
              margin: "0 auto 16px",
              width: "90px",
              height: "90px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LogoAnimado width={90} height={90} />
          </div>

        <h1>Recuperar contraseña</h1>
        <p>
          Ingresa tu correo. Si existe una cuenta, enviaremos un enlace seguro
          para restablecer tu contraseña.
        </p>

        <form onSubmit={enviar}>
          <label>Correo electrónico</label>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tuemail@gmail.com"
            disabled={cargando}
          />

          <button type="submit" disabled={cargando}>
            {cargando ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>

        <Link className="auth-link" to="/login">
          Volver al login
        </Link>
      </div>

      <Toast
        mensaje={mensaje}
        tipo={tipoMensaje}
        onClose={() => setMensaje("")}
      />
    </div>
  );
}