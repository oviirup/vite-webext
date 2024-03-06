import path from 'path';
import { manifest } from './src/manifest';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import webExtension from 'vite-plugin-webext';
import tsConfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tsConfigPaths(),
    react(),
    webExtension({
      manifest: manifest,
    }),
  ],
});
