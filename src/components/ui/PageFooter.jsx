import { Globe, MessageCircle, Play } from "lucide-react";

export default function PageFooter({
  nombreNegocio = "Negocio",
  redesSociales = [],
}) {
  return (
    <footer className="landing-footer-clean">
      <div className="landing-footer-clean-inner">
        <div className="landing-footer-clean-main">
          <span className="landing-footer-clean-badge">Reserva online</span>
          <p>
            Elige tu servicio, selecciona un especialista y confirma tu cita en minutos.
          </p>
        </div>

        {(redesSociales || []).length > 0 && (
          <div className="landing-footer-clean-social">
            {(redesSociales || []).map((r, index) => {
              const tipo = (r.tipo || r.Tipo || "").toLowerCase();
              const url = r.url || r.Url || "#";
              const idRed = r.idRedSocial || r.IdRedSocial || index;

              return (
                <a
                  key={idRed}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={tipo || "red social"}
                >
                  {tipo === "facebook" && <span>f</span>}
                  {tipo === "instagram" && <span>◎</span>}
                  {tipo === "whatsapp" && <MessageCircle size={18} />}
                  {tipo === "tiktok" && <span>♪</span>}
                  {tipo === "youtube" && <Play size={18} />}
                  {!["facebook", "instagram", "whatsapp", "tiktok", "youtube"].includes(tipo) && (
                    <Globe size={18} />
                  )}
                </a>
              );
            })}
          </div>
        )}
      </div>

      <div className="landing-footer-clean-bottom">
        <span>© 2026 {nombreNegocio}</span>
        <span>Servicios y reservas disponibles online</span>
      </div>
    </footer>
  );
}