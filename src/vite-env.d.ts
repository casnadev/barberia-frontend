/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_TENANT: string
  readonly VITE_GOOGLE_CLIENT_ID?: string
  // agrega aquí otras VITE_* que uses
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}