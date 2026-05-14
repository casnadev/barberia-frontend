import { Globe } from "lucide-react";

import {
  FaFacebookF,
  FaInstagram,
  FaWhatsapp,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa";

import "../../styles/components/pagefooter.css";

export default function PageFooter({
  nombreNegocio = "Mi negocio",
  redesSociales = [],
}) {
  const renderIcon = (tipo) => {
    const t = String(tipo || "").toLowerCase();

    if (t === "facebook") return <FaFacebookF />;
    if (t === "instagram") return <FaInstagram />;
    if (t === "whatsapp") return <FaWhatsapp />;
    if (t === "tiktok") return <FaTiktok />;
    if (t === "youtube") return <FaYoutube />;

    return <Globe size={18} />;
  };

  return (
    <footer className="landing-footer-clean">
      <div className="landing-footer-clean-inner">
        <div className="landing-footer-clean-main">
          <span className="landing-footer-clean-badge">
            Reserva online
          </span>

          <p>
            Elige tu servicio, selecciona un especialista y confirma tu cita en
            minutos.
          </p>

          {(redesSociales || []).length > 0 && (
            <div className="landing-footer-clean-social">
              {(redesSociales || []).map((r, index) => {
                const tipo = r.tipo || r.Tipo || "";
                const url = r.url || r.Url || "#";

                return (
                  <a
                    key={
                      r.idRedSocial ||
                      r.IdRedSocial ||
                      url ||
                      index
                    }
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={tipo || "red social"}
                    className={`social-${String(tipo).toLowerCase()}`}
                  >
                    {renderIcon(tipo)}
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div className="landing-footer-clean-bottom">
          <span>
            © {new Date().getFullYear()} {nombreNegocio}
          </span>

          <span>
            Servicios y reservas disponibles online
          </span>
        </div>
      </div>
    </footer>
  );
}