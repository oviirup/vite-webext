import { manifest } from './manifest.config';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import jsConfigPaths from 'vite-jsconfig-paths';
import webExtension from 'vite-plugin-webext';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    jsConfigPaths(),
    react(),
    webExtension({
      manifest: manifest,
    }),
  ],
});
