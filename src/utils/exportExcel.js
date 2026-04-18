import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { getBranding, urlToBase64 } from "./exportHelpers";
import API_BASE from "../services/api";

export async function exportarExcel({
  titulo,
  columnas,
  filas,
  nombreArchivo,
  nombreHoja = "Reporte",
}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(nombreHoja);

  const { nombreNegocio, logoNegocio } = getBranding();
  const logoUrl = logoNegocio
    ? `${API_BASE.replace("/api", "")}${logoNegocio}`
    : "";

  console.log("logoNegocio:", logoNegocio);
  console.log("logoUrl final:", logoUrl);

  const logoData = await urlToBase64(logoUrl);

  worksheet.mergeCells("B2:E2");
  worksheet.getCell("B2").value = nombreNegocio;
  worksheet.getCell("B2").font = { size: 16, bold: true };
  worksheet.getCell("B2").alignment = { vertical: "middle" };

  worksheet.mergeCells("B3:E3");
  worksheet.getCell("B3").value = titulo;
  worksheet.getCell("B3").font = { size: 12, bold: true };
  worksheet.getCell("B3").alignment = { vertical: "middle" };

  worksheet.mergeCells("B4:E4");
  worksheet.getCell("B4").value = `Generado: ${new Date().toLocaleString()}`;
  worksheet.getCell("B4").font = { size: 10 };
  worksheet.getCell("B4").alignment = { vertical: "middle" };

  if (logoData?.base64) {
    const extension = logoData.mimeType?.includes("jpeg") || logoData.mimeType?.includes("jpg")
      ? "jpeg"
      : "png";

    const imageId = workbook.addImage({
      base64: logoData.base64,
      extension,
    });

    worksheet.addImage(imageId, {
      tl: { col: 0, row: 1 },
      ext: { width: 70, height: 70 },
    });
  }

  const filaHeader = 7;

  worksheet.columns = columnas.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 20,
  }));

  const headerRow = worksheet.getRow(filaHeader);
  columnas.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: "FF111111" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD4AF37" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  filas.forEach((fila) => {
    const row = worksheet.addRow(fila);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E5E5" } },
        left: { style: "thin", color: { argb: "FFE5E5E5" } },
        bottom: { style: "thin", color: { argb: "FFE5E5E5" } },
        right: { style: "thin", color: { argb: "FFE5E5E5" } },
      };
      cell.alignment = { vertical: "middle" };
    });
  });

  worksheet.views = [{ state: "frozen", ySplit: filaHeader }];
  worksheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, `${nombreArchivo}.xlsx`);
}