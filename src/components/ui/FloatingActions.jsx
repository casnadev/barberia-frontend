import { MessageCircle } from "lucide-react";

export default function FloatingActions({
  onReserve,
  whatsappUrl = "#",
  whatsappText = "",
  reserveLabel = "Reservar",
  whatsappLabel = "WhatsApp",
}) {
  const finalWhatsappUrl = whatsappText
    ? `${whatsappUrl}?text=${encodeURIComponent(whatsappText)}`
    : whatsappUrl;

  return (
    <div className="mobile-bottom-actions">
      <button
        type="button"
        className="mobile-action-btn mobile-action-reserva"
        onClick={onReserve}
      >
        {reserveLabel}
      </button>

      <a
        href={finalWhatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="mobile-action-btn mobile-action-whatsapp"
      >
        <MessageCircle size={16} />
        {whatsappLabel}
      </a>
    </div>
  );
}