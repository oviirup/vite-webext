import path from 'path';
import { manifest } from './src/manifest';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import webExtension from 'vite-plugin-webext';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  plugins: [
    viteTsconfig(),
    react(),
    webExtension({
      manifest: manifest,
    }),
  ],
});
