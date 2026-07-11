// Versión de cada documento legal. Súbela cuando cambie el contenido; el flujo
// de aceptación/re-aceptación las registra por separado (tabla ConsentimientoLegal).
export const LEGAL_VERSIONS = {
  terminos: '1.0',
  privacidad: '1.0',
  usoAceptable: '1.0',
  declaracionNegocio: '1.0',
} as const

export type DocumentoLegal = keyof typeof LEGAL_VERSIONS

// Fecha de vigencia mostrada en los documentos (edítala al publicar una versión).
export const LEGAL_VIGENCIA = '15 de julio de 2026'
