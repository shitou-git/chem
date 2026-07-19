import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

function versionJsonPlugin(): Plugin {
  return {
    name: 'version-json',
    apply: 'build',
    closeBundle() {
      const versionInfo = {
        version: pkg.version,
        buildTime: new Date().toISOString(),
      };
      writeFileSync(
        resolve(__dirname, 'dist', 'version.json'),
        JSON.stringify(versionInfo, null, 2)
      );
    },
  };
}

export default defineConfig({
  base: './',
  define: {
    '__APP_VERSION__': JSON.stringify(pkg.version),
  },
  build: {
    sourcemap: false,
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths(),
    versionJsonPlugin(),
  ],
})
