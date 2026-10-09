import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build --mode single` makes one self-contained HTML file for previewing
// the tool; the normal build is what the site will use.
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    plugins: [react(), tailwindcss(), ...(single ? [viteSingleFile()] : [])],
    worker: { format: single ? 'iife' : 'es' },
    resolve: single
      ? {
          alias: [
            {
              find: /^\.\/createWorker$/,
              replacement: fileURLToPath(new URL('./src/lib/createWorker.inline.ts', import.meta.url)),
            },
          ],
        }
      : undefined,
    build: single ? { outDir: 'dist-single' } : undefined,
  };
});
