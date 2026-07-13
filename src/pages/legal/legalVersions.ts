// Versión de cada documento legal. Súbela cuando cambie el contenido; el flujo
// de aceptación/re-aceptación las registra por separado (tabla ConsentimientoLegal).
export const LEGAL_VERSIONS = {
  terminos: '2.0',
  privacidad: '2.0',
  // T4 — Aviso B2C para el CLIENTE FINAL. Separado del de arriba, que es el B2B
  // (dirigido al dueño del negocio que contrata el software).
  privacidadClientes: '1.0',
  usoAceptable: '2.0',
  declaracionNegocio: '2.0',
} as const

export type DocumentoLegal = keyof typeof LEGAL_VERSIONS

// Fecha de vigencia mostrada en los documentos (edítala al publicar una versión).
export const LEGAL_VIGENCIA = '15 de julio de 2026'
