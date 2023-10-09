import ManifestParserFactory from './parser'
import type ManifestParser from './parser/manifestParser'
import { appendInputScripts } from './utils/rollup'
import { contentScriptStyleHandler } from './utils/server'
import { getModule, transformImports, updateConfig } from './utils/vite'

export default function webExtension(
	pluginOptions: WebExtensionOptions,
): Vite.PluginOption {
	// assign defaults
	pluginOptions.useDynamicUrl ??= true
	pluginOptions.useHashedFileName ??= true

	if (!pluginOptions.manifest) {
		throw new Error('Missing manifest definition')
	}

	let userConfig: Vite.ResolvedConfig
	let emitQueue: Rollup.EmittedFile[] = []
	let manifestParser:
		| ManifestParser<chrome.runtime.ManifestV2>
		| ManifestParser<chrome.runtime.ManifestV3>

	return {
		name: 'webExtension',
		enforce: 'post', // required to revert vite asset self.location transform to import.meta.url

		config: (config) => {
			return updateConfig(config, pluginOptions)
		},

		configResolved: (config) => {
			userConfig = config
		},

		configureServer: (server) => {
			server.middlewares.use(contentScriptStyleHandler)

			server.httpServer!.once('listening', () => {
				manifestParser.setDevServer(server)
				manifestParser.writeDevBuild(server.config.server.port!)
			})
		},

		async options(options) {
			manifestParser = ManifestParserFactory.getParser(
				pluginOptions,
				userConfig,
			)

			const { inputScripts, emitFiles } = await manifestParser.parseInput()
			options.input = appendInputScripts(inputScripts, options.input)

			emitQueue = emitQueue.concat(emitFiles)

			return options
		},

		buildStart: function () {
			emitQueue.forEach((file) => {
				this.emitFile(file)
				if (file.fileName) this.addWatchFile(file.fileName)
			})
			emitQueue = []
		},

		load: getModule,

		resolveId: (id) => (getModule(id) ? id : null),

		transform: (code) => transformImports(code, userConfig),

		generateBundle: async function (_options, bundle) {
			const { emitFiles } = await manifestParser.parseOutput(bundle)
			emitFiles.forEach(this.emitFile)
		},
	}
}
