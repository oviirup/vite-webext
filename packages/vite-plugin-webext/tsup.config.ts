import { copyFileSync } from 'node:fs';
import { defineConfig, Options } from 'tsup';

const commons: Options = {
	minify: true,
	clean: true,
	skipNodeModulesBundle: true,
	external: ['vite', 'rollup', '/@vite/client'],
};

export default defineConfig([
	{
		...commons,
		entry: { index: './src/plugin.ts' },
		format: ['esm', 'cjs'],
		outDir: 'dist',
		onSuccess: async () => {
			copyFileSync('./src/plugin.d.ts', './dist/index.d.ts');
		},
	},
	{
		...commons,
		entry: { index: './src/client.ts' },
		format: ['esm'],
		outDir: 'client',
		onSuccess: async () => {
			copyFileSync('./src/client.d.ts', './client/index.d.ts');
			copyFileSync('./src/lib/react-hmr.js', './client/react-hmr.js');
		},
	},
]);
