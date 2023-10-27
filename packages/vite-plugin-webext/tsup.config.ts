import { copyFileSync } from 'node:fs'
import { defineConfig, Format, Options } from 'tsup'

const commons: Options = {
	minify: true,
	clean: true,
	skipNodeModulesBundle: true,
	external: ['vite', 'rollup', '/@vite/client'],
}

const commonConfig = (
	entry: string,
	outDir: string,
	format: Format[],
): Options => ({
	minify: true,
	clean: true,
	skipNodeModulesBundle: true,
	external: ['vite', 'rollup', '/@vite/client'],
	entry: { index: `src/${entry}.ts` },
	format,
	outDir,
	onSuccess: async () => {
		copyFileSync(`src/${entry}.d.ts`, `${outDir}/index.d.ts`)
	},
})

export default defineConfig([
	commonConfig('plugin', 'dist', ['cjs', 'esm']),
	commonConfig('client', 'client', ['esm']),
])
