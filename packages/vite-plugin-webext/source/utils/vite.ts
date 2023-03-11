import MagicString from 'magic-string'
import { createFilter } from 'vite'
import { sanitise } from './files'

/** Updates vite config with necessary settings */
export function updateConfig(
	config: Vite.UserConfig,
	pluginOptions: WebExtensionOptions,
): Vite.UserConfig {
	const { manifest, useHasedFileName } = pluginOptions
	const version = manifest.manifest_version
	config.build ??= {}

	// update the build target based on manifest version
	if (!config.build.target) {
		if (version === 2) config.build.target = ['chrome64', 'firefox89']
		if (version === 3) config.build.target = ['chrome91']
	}

	config.build.minify ??= true
	config.build.emptyOutDir ??= true
	config.build.modulePreload ??= false
	config.build.rollupOptions ??= {}
	config.build.rollupOptions.input ??= {}

	config.optimizeDeps ??= {}
	config.optimizeDeps.exclude ??= []
	config.optimizeDeps.exclude?.push('/@vite/client')
	config.build.rollupOptions.output ??= {} as Rollup.OutputOptions

	// enable support for hot-module-reload
	config.server ??= {}
	if (config.server.hmr === true || !config.server.hmr) config.server.hmr = {}
	config.server.hmr.protocol = 'ws'
	config.server.hmr.host = 'localhost'

	// prettier-ignore
	if (useHasedFileName && !Array.isArray(config.build.rollupOptions.output)) {
		config.build.rollupOptions.output.assetFileNames ??= 'assets/[ext]/[hash].[ext]'
		config.build.rollupOptions.output.chunkFileNames ??= 'assets/js/[hash].js'
		config.build.rollupOptions.output.entryFileNames ??= 'assets/js/[hash].js'
	}

	return config
}

/** transforms self.location to import.meta.url */
export function transformImports(code: string, config: Vite.ResolvedConfig) {
	if (!code.includes('new URL') || !code.includes(`self.location`)) return null

	let updatedCode: MagicString | null = null
	// prettier-ignore
	let regex = /\bnew\s+URL\s*\(\s*('[^']+'|"[^"]+"|`[^`]+`)\s*,\s*self\.location\s*\)/g

	let match: RegExpExecArray | null
	while ((match = regex.exec(code))) {
		const { 0: exp, index } = match
		if (!updatedCode) updatedCode = new MagicString(code)
		let start = index
		let end = index + exp.length
		let replacer = exp.replace('self.location', 'import.meta.url')
		updatedCode.overwrite(start, end, replacer)
	}

	if (!updatedCode) return null
	return {
		code: updatedCode.toString(),
		map: config.build.sourcemap
			? updatedCode.generateMap({ hires: true })
			: null,
	}
}

export function findChunk(
	manifest: Vite.Manifest,
	file: string,
): Vite.ManifestChunk | undefined {
	return manifest[sanitise(file).path]
}

export function filterScripts(
	scriptFilterOption: WebExtensionOptions['webAccessibleScripts'],
): ReturnType<typeof createFilter> {
	return createFilter(
		scriptFilterOption?.include || /\.(([cem]?js|ts)|(s?[ca]ss))$/,
		scriptFilterOption?.exclude || '',
		scriptFilterOption?.options,
	)
}

const store = new Map<string, string>()
export function setModule(id: string, source: string) {
	store.set(id, source)
}
export function getModule(id: string): string | null {
	return store.get(id) ?? null
}
