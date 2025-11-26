interface ImportMetaEnv {
  readonly VITE_USE_API_AUTH: string
  readonly VITE_API_BASE: string
  readonly VITE_TENANT_SLUG: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
