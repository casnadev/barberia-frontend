import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getBranding, urlToBase64 } from "./exportHelpers";
import API_BASE from "../services/api";

export async function exportarPDF({
  titulo,
  columnas,
  filas,
  nombreArchivo,
}) {
  const doc = new jsPDF("l", "mm", "a4");

  const { nombreNegocio, logoNegocio } = getBranding();
  const logoUrl = logoNegocio
    ? `${API_BASE.replace("/api", "")}${logoNegocio}`
    : "";

  console.log("logoNegocio:", logoNegocio);
  console.log("logoUrl final:", logoUrl);

  const logoData = await urlToBase64(logoUrl);

  if (logoData?.base64) {
    const formato = logoData.mimeType?.includes("jpeg") || logoData.mimeType?.includes("jpg")
      ? "JPEG"
      : "PNG";

    doc.addImage(logoData.base64, formato, 14, 8, 24, 24);
  }

  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(nombreNegocio, 42, 15);

  doc.setFontSize(13);
  doc.text(titulo, 42, 22);

  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 42, 28);

  autoTable(doc, {
    startY: 36,
    head: [columnas],
    body: filas,
    styles: {
      fontSize: 9,
      cellPadding: 3,
      valign: "middle",
    },
    headStyles: {
      fillColor: [212, 175, 55],
      textColor: [17, 17, 17],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { top: 20, right: 10, bottom: 10, left: 10 },
  });

  doc.save(`${nombreArchivo}.pdf`);
}