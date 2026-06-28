/**
 * Exportación de reportes financieros a Excel (.xlsx) y PDF.
 *
 * - Las librerías pesadas (xlsx, jspdf) se cargan con import() dinámico SOLO al
 *   exportar, para no engordar el bundle inicial del dashboard.
 * - El PDF lleva encabezado con el nombre del negocio (y logo si se pasa),
 *   periodo, tabla de ventas y un resumen financiero. Pensado para imprimir o
 *   compartir como comprobante del periodo.
 */

export interface FilaVenta {
  fecha: string
  cliente: string
  metodoPago: string
  estado: string
  total: number
}

export interface ResumenExport {
  totalVentas: number
  totalPagosTrabajadores: number
  totalGastos: number
  utilidad: number
  cantidadVentas: number
}

export interface ExportMeta {
  negocio: string          // nombre del negocio/sede
  periodoLabel: string     // "27 jun 2026" o "1 jun – 27 jun 2026"
  logoDataUrl?: string | null  // data:image/png;base64,... (opcional)
  sedesLabel?: string      // "Datos de todas las sedes (X, Y, Z)" o "Sede: X" (opcional)
}

const money = (n: number) => `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Nombre de archivo seguro, sin espacios ni acentos. */
function slug(s: string): string {
  return (s || 'reporte')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'reporte'
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL (.xlsx)
// ─────────────────────────────────────────────────────────────────────────────
export async function exportarExcel(filas: FilaVenta[], resumen: ResumenExport, meta: ExportMeta): Promise<void> {
  const XLSX = await import('xlsx')

  // Hoja 1: Resumen
  const resumenAoA = [
    [meta.negocio],
    [`Reporte financiero · ${meta.periodoLabel}`],
    [],
    ['Concepto', 'Monto'],
    ['Ventas', resumen.totalVentas],
    ['Pagos a trabajadores', resumen.totalPagosTrabajadores],
    ['Gastos', resumen.totalGastos],
    ['Utilidad neta', resumen.utilidad],
    ['Cantidad de ventas', resumen.cantidadVentas],
  ]
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenAoA)
  wsResumen['!cols'] = [{ wch: 26 }, { wch: 16 }]

  // Hoja 2: Detalle de ventas
  const detalleAoA = [
    ['Fecha', 'Cliente', 'Método de pago', 'Estado', 'Total'],
    ...filas.map((f) => [f.fecha, f.cliente, f.metodoPago, f.estado, f.total]),
  ]
  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleAoA)
  wsDetalle['!cols'] = [{ wch: 18 }, { wch: 26 }, { wch: 16 }, { wch: 14 }, { wch: 12 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Ventas')

  XLSX.writeFile(wb, `reporte-${slug(meta.negocio)}-${slug(meta.periodoLabel)}.xlsx`)
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF (con encabezado de marca)
// ─────────────────────────────────────────────────────────────────────────────
export async function exportarPDF(filas: FilaVenta[], resumen: ResumenExport, meta: ExportMeta): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 40
  let y = 44

  // Logo (si hay)
  if (meta.logoDataUrl) {
    try { doc.addImage(meta.logoDataUrl, 'PNG', margin, y - 14, 40, 40) } catch { /* logo inválido, se ignora */ }
  }
  const textX = meta.logoDataUrl ? margin + 52 : margin

  // Encabezado
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(17, 24, 39)
  doc.text(meta.negocio || 'Reporte', textX, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(107, 114, 128)
  doc.text(`Reporte financiero · ${meta.periodoLabel}`, textX, y + 16)
  doc.text(`Generado: ${new Date().toLocaleString('es-PE')}`, textX, y + 30)

  y += 54

  // Tarjeta de resumen
  const resumenRows: [string, string][] = [
    ['Ventas', money(resumen.totalVentas)],
    ['Pagos a trabajadores', money(resumen.totalPagosTrabajadores)],
    ['Gastos', money(resumen.totalGastos)],
    ['Utilidad neta', money(resumen.utilidad)],
    ['Cantidad de ventas', String(resumen.cantidadVentas)],
  ]
  autoTable(doc, {
    startY: y,
    head: [['Resumen del periodo', '']],
    body: resumenRows,
    theme: 'grid',
    headStyles: { fillColor: [40, 85, 246], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: pageW - margin * 2 - 140 }, 1: { cellWidth: 140, halign: 'right', fontStyle: 'bold' } },
    margin: { left: margin, right: margin },
    styles: { fontSize: 10, cellPadding: 6 },
  })

  // Tabla de ventas
  const afterResumenY = (doc as any).lastAutoTable?.finalY ?? y + 120
  autoTable(doc, {
    startY: afterResumenY + 18,
    head: [['Fecha', 'Cliente', 'Método', 'Estado', 'Total']],
    body: filas.map((f) => [f.fecha, f.cliente, f.metodoPago, f.estado, money(f.total)]),
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 4: { halign: 'right' } },
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 5 },
    didDrawPage: () => {
      // Pie de página con numeración
      const page = doc.getNumberOfPages()
      doc.setFontSize(8); doc.setTextColor(156, 163, 175)
      doc.text(`Página ${page}`, pageW - margin, doc.internal.pageSize.getHeight() - 16, { align: 'right' })
    },
  })

  doc.save(`reporte-${slug(meta.negocio)}-${slug(meta.periodoLabel)}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTAR CLIENTES (portabilidad de datos)
// El negocio puede llevarse su base de clientes con todos los datos de contacto.
// ─────────────────────────────────────────────────────────────────────────────
export interface FilaCliente {
  nombre: string
  telefono: string
  correo: string
  genero?: string
  segmento?: string
  totalReservas?: number
  reservasAtendidas?: number
  ultimaVisita?: string
  registrado?: string
}

const SEG_LABEL: Record<string, string> = {
  nuevo: 'Nuevo', frecuente: 'Frecuente', inactivo: 'Inactivo', riesgo: 'En riesgo',
}

export async function exportarClientesExcel(filas: FilaCliente[], meta: ExportMeta): Promise<void> {
  const XLSX = await import('xlsx')

  const encabezado = [
    [meta.negocio],
    [`Base de clientes · ${meta.periodoLabel}`],
    ...(meta.sedesLabel ? [[meta.sedesLabel]] : []),
    [`Total: ${filas.length} cliente(s)`],
    [],
    ['Nombre', 'Teléfono', 'Correo', 'Género', 'Segmento', 'Reservas', 'Atendidas', 'Última visita', 'Registrado'],
  ]
  const cuerpo = filas.map((c) => [
    c.nombre, c.telefono, c.correo, c.genero || '',
    c.segmento ? (SEG_LABEL[c.segmento] || c.segmento) : 'Regular',
    c.totalReservas ?? 0, c.reservasAtendidas ?? 0, c.ultimaVisita || '', c.registrado || '',
  ])
  const ws = XLSX.utils.aoa_to_sheet([...encabezado, ...cuerpo])
  ws['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 16 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
  XLSX.writeFile(wb, `clientes-${slug(meta.negocio)}-${slug(meta.periodoLabel)}.xlsx`)
}

export async function exportarClientesPDF(filas: FilaCliente[], meta: ExportMeta): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 36
  let y = 42

  if (meta.logoDataUrl) {
    try { doc.addImage(meta.logoDataUrl, 'PNG', margin, y - 14, 38, 38) } catch { /* ignora logo inválido */ }
  }
  const textX = meta.logoDataUrl ? margin + 50 : margin

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(17, 24, 39)
  doc.text(meta.negocio || 'Clientes', textX, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(107, 114, 128)
  doc.text(`Base de clientes · ${meta.periodoLabel} · ${filas.length} cliente(s)`, textX, y + 16)
  let yGen = y + 30
  if (meta.sedesLabel) { doc.text(meta.sedesLabel, textX, yGen); yGen += 14 }
  doc.text(`Generado: ${new Date().toLocaleString('es-PE')}`, textX, yGen)

  autoTable(doc, {
    startY: (meta.sedesLabel ? y + 60 : y + 46),
    head: [['Nombre', 'Teléfono', 'Correo', 'Género', 'Segmento', 'Reservas', 'Última visita']],
    body: filas.map((c) => [
      c.nombre, c.telefono, c.correo, c.genero || '—',
      c.segmento ? (SEG_LABEL[c.segmento] || c.segmento) : 'Regular',
      String(c.totalReservas ?? 0), c.ultimaVisita || '—',
    ]),
    theme: 'striped',
    headStyles: { fillColor: [40, 85, 246], textColor: 255, fontStyle: 'bold' },
    margin: { left: margin, right: margin },
    styles: { fontSize: 8.5, cellPadding: 4 },
    didDrawPage: () => {
      const page = doc.getNumberOfPages()
      doc.setFontSize(8); doc.setTextColor(156, 163, 175)
      doc.text(`Página ${page}`, pageW - margin, doc.internal.pageSize.getHeight() - 14, { align: 'right' })
    },
  })

  doc.save(`clientes-${slug(meta.negocio)}-${slug(meta.periodoLabel)}.pdf`)
}
