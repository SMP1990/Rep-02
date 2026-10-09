import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // onnxruntime-web ships its own .wasm files; pre-bundling breaks their paths.
  optimizeDeps: { exclude: ['onnxruntime-web'] },
});
