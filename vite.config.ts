import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { crx } from '@crxjs/vite-plugin'
import { resolve } from 'node:path'
import manifest from './manifest.config.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'src/panel/index.html'),
        viewer: resolve(__dirname, 'src/viewer/index.html'),
        intercept: resolve(__dirname, 'src/intercept/index.html'),
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
      },
    },
  },
  server: {
    port: 5733,
    strictPort: true,
    hmr: { port: 5733 },
  },
})
