import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  base: './',
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths()
  ],
  server: {
    proxy: {
      '/api/agnes': {
        target: 'https://apihub.agnes-ai.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/agnes/, ''),
      },
    },
  },
})
