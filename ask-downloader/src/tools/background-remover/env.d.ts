/// <reference types="vite/client" />

// Test-only overrides for where the tool loads its runtime and models from
// (see lib/model.ts). Production builds leave them unset and use the CDNs.
interface ImportMetaEnv {
  readonly VITE_ORT_URL?: string;
  readonly VITE_ORT_GPU_URL?: string;
  readonly VITE_MODEL_BASE?: string;
}
