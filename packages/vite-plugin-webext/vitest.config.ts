import { defineConfig } from 'vite';
import viteTsconfig from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [viteTsconfig()],
  test: {},
});
