import { copyFile } from 'node:fs/promises';
import { defineConfig, Options } from 'tsup';

const commons: Options = {
  minify: false,
  sourcemap: true,
  clean: true,
  skipNodeModulesBundle: true,
  external: ['vite', 'rollup', '/@vite/client'],
  outExtension: (ctx) => ({
    js: ctx.format === 'esm' ? '.mjs' : '.cjs',
  }),
};

export default defineConfig([
  {
    ...commons,
    entry: { index: './src/plugin.ts' },
    format: ['esm', 'cjs'],
    outDir: 'dist',
    onSuccess: async () => {
      await copyFile('./src/plugin.d.ts', './dist/index.d.ts');
    },
  },
  {
    ...commons,
    entry: { index: './src/client.ts' },
    format: ['esm'],
    outDir: 'client',
    onSuccess: async () => {
      await copyFile('./src/client.d.ts', './client/index.d.ts');
      await copyFile('./src/lib/react-hmr.mjs', './client/react-hmr.mjs');
    },
  },
]);
