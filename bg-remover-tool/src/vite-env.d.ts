/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Test overrides; production loads from the CDNs in src/lib/model.ts.
  readonly VITE_ORT_URL?: string;
  readonly VITE_MODEL_BASE?: string;
}
