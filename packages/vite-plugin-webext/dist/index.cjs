'use strict'

var path = require('path')
var crypto = require('crypto')
var vite = require('vite')
var fs = require('fs-extra')
var MagicString = require('magic-string')
var getEtag = require('etag')

function sanitise(...filePaths) {
	let filePath = filePaths.join('/')
	let nPath = vite.normalizePath(path.normalize(filePath))
	let { dir = '', name, ext } = path.parse(nPath)
	let fileName = `${dir}/${name}`.replace(/^\/+/, '')
	return {
		name: fileName,
		path: fileName + ext,
	}
}
/** returns the path only if it exists */
function validatePath(filePath, noCheck = false) {
	if (!filePath) return
	if (noCheck) return filePath
	if (fs.existsSync(filePath)) return filePath
	return
}
/** checks is the file is in public or source */
function getFileName(fileName, config, noCheck = false) {
	fileName = vite.normalizePath(fileName)
	const outputPath = sanitise(fileName).name
	// probable file path in root and public folder
	const file = {
		S:
			(config === null || config === void 0 ? void 0 : config.root) &&
			sanitise(config.root, fileName).path,
		P:
			(config === null || config === void 0 ? void 0 : config.publicDir) &&
			sanitise(config.publicDir, fileName).path,
	}
	return {
		inputFile: validatePath(file.S, noCheck),
		publicFile: validatePath(file.P, noCheck),
		outputFile: outputPath,
	}
}
function isHTML(file) {
	return /[^*]+.html$/.test(file)
}
function getHash(text) {
	return crypto.createHash('sha256').update(text).digest('hex').substring(0, 8)
}

/** loader for scripts in html form */
function getHtmlLoader(fileName, sourceFiles) {
	const scripts = sourceFiles
		.map((src) => `<script type="module" src="${src}"></script>`)
		.join('')
	return {
		fileName: `${fileName}.html`,
		source: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />${scripts}</head></html>`,
	}
}
/** loader for any scripts */
function getScriptLoader(inputFile, outputFile) {
	const hash = getHash(inputFile)
	const importPath = outputFile.startsWith('http')
		? `'${outputFile}'`
		: `(chrome??browser).runtime.getURL("${outputFile}")`
	return {
		fileName: `script-${hash}.js`,
		source: `(async()=>{await import(${importPath})})();`,
	}
}
/** loader for service worker (MV3) */
function getSwLoader(file) {
	const importPath = file.startsWith('http') ? `${file}` : `/${file}`
	return {
		fileName: `service-worker.js`,
		source: `import "${importPath}";`,
	}
}
/** loader for all content scripts */
function getCsLoader(fileName, chunk) {
	if (!chunk.imports.length && !chunk.dynamicImports.length) {
		return { fileName: chunk.fileName }
	}
	return getScriptLoader(fileName, chunk.fileName)
}
/** loader for web accessible scripts */
function getWasLoader(fileName, chunk) {
	if (!chunk.imports.length && !chunk.dynamicImports.length) {
		return {
			fileName: fileName,
			source: chunk.code,
		}
	}
	return getScriptLoader(fileName, chunk.fileName)
}

/** Updates vite config with necessary settings */
function updateConfig(config, pluginOptions) {
	var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p
	var _q, _r, _s, _t, _u, _v, _w, _x, _y, _z
	const { manifest, useHashedFileName } = pluginOptions
	const version = manifest.manifest_version
	;(_a = config.build) !== null && _a !== void 0 ? _a : (config.build = {})
	// update the build target based on manifest version
	if (!config.build.target) {
		if (version === 2) config.build.target = ['chrome64', 'firefox89']
		if (version === 3) config.build.target = ['chrome91']
	}
	;(_b = (_q = config.build).minify) !== null && _b !== void 0
		? _b
		: (_q.minify = true)
	;(_c = (_r = config.build).emptyOutDir) !== null && _c !== void 0
		? _c
		: (_r.emptyOutDir = true)
	;(_d = (_s = config.build).modulePreload) !== null && _d !== void 0
		? _d
		: (_s.modulePreload = false)
	;(_e = (_t = config.build).rollupOptions) !== null && _e !== void 0
		? _e
		: (_t.rollupOptions = {})
	;(_f = (_u = config.build.rollupOptions).input) !== null && _f !== void 0
		? _f
		: (_u.input = {})
	;(_g = config.optimizeDeps) !== null && _g !== void 0
		? _g
		: (config.optimizeDeps = {})
	;(_h = (_v = config.optimizeDeps).exclude) !== null && _h !== void 0
		? _h
		: (_v.exclude = [])
	;(_j = config.optimizeDeps.exclude) === null || _j === void 0
		? void 0
		: _j.push('/@vite/client')
	;(_k = (_w = config.build.rollupOptions).output) !== null && _k !== void 0
		? _k
		: (_w.output = {})
	// enable support for hot-module-reload
	;(_l = config.server) !== null && _l !== void 0 ? _l : (config.server = {})
	if (config.server.hmr === true || !config.server.hmr) config.server.hmr = {}
	config.server.hmr.protocol = 'ws'
	config.server.hmr.host = 'localhost'
	// prettier-ignore
	if (useHashedFileName && !Array.isArray(config.build.rollupOptions.output)) {
        (_m = (_x = config.build.rollupOptions.output).assetFileNames) !== null && _m !== void 0 ? _m : (_x.assetFileNames = 'assets/[ext]/[hash].[ext]');
        (_o = (_y = config.build.rollupOptions.output).chunkFileNames) !== null && _o !== void 0 ? _o : (_y.chunkFileNames = 'assets/js/[hash].js');
        (_p = (_z = config.build.rollupOptions.output).entryFileNames) !== null && _p !== void 0 ? _p : (_z.entryFileNames = 'assets/js/[hash].js');
    }
	return config
}
/** transforms self.location to import.meta.url */
function transformImports(code, config) {
	if (!code.includes('new URL') || !code.includes(`self.location`)) return null
	let updatedCode = null
	// prettier-ignore
	let regex = /\bnew\s+URL\s*\(\s*('[^']+'|"[^"]+"|`[^`]+`)\s*,\s*self\.location\s*\)/g;
	let match
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
function filterScripts(scriptFilterOption) {
	return vite.createFilter(
		(scriptFilterOption === null || scriptFilterOption === void 0
			? void 0
			: scriptFilterOption.include) || /\.(([cem]?js|ts)|(s?[ca]ss))$/,
		(scriptFilterOption === null || scriptFilterOption === void 0
			? void 0
			: scriptFilterOption.exclude) || '',
		scriptFilterOption === null || scriptFilterOption === void 0
			? void 0
			: scriptFilterOption.options,
	)
}
const store = new Map()
function setModule(id, source) {
	store.set(id, source)
}
function getModule(id) {
	var _a
	return (_a = store.get(id)) !== null && _a !== void 0 ? _a : null
}

class DevBuilder {
	constructor(viteConfig, options, devServer) {
		this.viteConfig = viteConfig
		this.options = options
		this.devServer = devServer
		this.hmrServer = ''
		this.scriptHashes = new Set()
		this.outDir = path.resolve(
			process.cwd(),
			this.viteConfig.root,
			this.viteConfig.build.outDir,
		)
		this.WasFilter = filterScripts(this.options.webAccessibleScripts)
	}
	async writeBuild({ port, manifest, htmlFiles }) {
		this.hmrServer = this.getHmrServer(port)
		// copies the content of public ditrectory
		await fs.emptyDir(this.outDir)
		const publicDir = path.resolve(
			process.cwd(),
			this.viteConfig.root,
			this.viteConfig.publicDir,
		)
		const publicDirExists = await fs.pathExists(publicDir)
		if (publicDirExists) fs.copy(publicDir, this.outDir)
		await this.writeOutputHtml(htmlFiles)
		await this.writeOutputScripts(manifest)
		await this.writeOutputCss(manifest)
		await this.writeOutputWas(manifest, this.WasFilter)
		await this.writeBuildFiles(manifest, htmlFiles)
		this.updatePermissions(manifest, port)
		this.updateCSP(manifest)
		// write the extension manifest file
		await fs.writeFile(
			`${this.outDir}/manifest.json`,
			JSON.stringify(manifest, null, 2),
		)
	}
	async writeBuildFiles(_manifest, _manifestHtmlFiles) {}
	async writeOutputHtml(htmlFiles) {
		for (const file of htmlFiles) {
			const { inputFile } = getFileName(file, this.viteConfig)
			if (!inputFile) continue
			await this.writeManifestHtmlFile(file, inputFile)
			this.devServer.watcher.on('change', async (path) => {
				if (vite.normalizePath(path) !== inputFile) return
				await this.writeManifestHtmlFile(file, inputFile)
			})
		}
	}
	async writeManifestHtmlFile(fileName, outputFile) {
		let content = getModule(outputFile)
		content !== null && content !== void 0
			? content
			: (content = await fs.readFile(outputFile, { encoding: 'utf-8' }))
		// apply plugin html transforms
		if (this.options.devHtmlTransform) {
			content = await this.devServer.transformIndexHtml(fileName, content)
		}
		// update root paths with hmr server path
		content = content.replace(/src="\//g, `src="${this.hmrServer}/`)
		content = content.replace(/from "\//g, `from "${this.hmrServer}/`)
		// update relative paths
		const inputFileDir = path.dirname(fileName)
		const dir = inputFileDir ? `${inputFileDir}/` : ''
		content = content.replace(/src="\.\//g, `src="${this.hmrServer}/${dir}`)
		this.parseScriptHashes(content)
		const outFile = `${this.outDir}/${fileName}`
		const outFileDir = path.dirname(outFile)
		await fs.ensureDir(outFileDir)
		await fs.writeFile(outFile, content)
	}
	parseScriptHashes(_content) {}
	async writeOutputScripts(manifest) {
		if (!manifest.content_scripts) return
		for (const [i, script] of manifest.content_scripts.entries()) {
			if (!script.js) continue
			for (const [j, file] of script.js.entries()) {
				const { outputFile } = getFileName(file)
				const loader = getScriptLoader(outputFile, `${this.hmrServer}/${file}`)
				manifest.content_scripts[i].js[j] = loader.fileName
				const outFile = `${this.outDir}/${loader.fileName}`
				const outFileDir = path.dirname(outFile)
				await fs.ensureDir(outFileDir)
				await fs.writeFile(outFile, loader.source)
			}
		}
	}
	async writeOutputCss(manifest) {
		if (!manifest.content_scripts) return
		for (const [i, script] of manifest.content_scripts.entries()) {
			if (!script.css) continue
			for (const [j, fileName] of script.css.entries()) {
				const { inputFile, outputFile } = getFileName(fileName, this.viteConfig)
				if (!inputFile) continue
				manifest.content_scripts[i].css[j] = outputFile
				await this.writeManifestCssFile(outputFile, inputFile)
				this.devServer.watcher.on('change', async (path) => {
					if (vite.normalizePath(path) !== inputFile) return
					await this.writeManifestCssFile(outputFile, fileName)
				})
			}
		}
	}
	async writeManifestCssFile(outputFile, file) {
		const module = await this.devServer.ssrLoadModule(file)
		const source = module.default
		const loaderFile = {
			fileName: outputFile,
			source,
		}
		const outFile = `${this.outDir}/${loaderFile.fileName}`
		const outFileDir = path.dirname(outFile)
		await fs.ensureDir(outFileDir)
		await fs.writeFile(outFile, loaderFile.source)
	}
	/** get hmr server url with port */
	getHmrServer(devServerPort) {
		if (typeof this.viteConfig.server.hmr === 'boolean') {
			throw new Error('Vite HMR is misconfigured')
		}
		return `http://${this.viteConfig.server.hmr.host}:${devServerPort}`
	}
}

/** add hmr support to shadow dom */
function contentScriptStyleHandler(req, res, next) {
	const _originalEnd = res.end
	// @ts-ignore
	res.end = function end(chunk, ...otherArgs) {
		if (req.url === '/@vite/client' && typeof chunk === 'string') {
			if (
				!/const sheetsMap/.test(chunk) ||
				!/document\.head\.appendChild\(style\)/.test(chunk) ||
				!/document\.head\.removeChild\(style\)/.test(chunk) ||
				(!/style\.textContent = content/.test(chunk) &&
					!/style\.innerHTML = content/.test(chunk))
			) {
				console.error(
					'Content script HMR style support disabled -- failed to rewrite vite client',
				)
				res.setHeader('Etag', getEtag(chunk, { weak: true }))
				// @ts-ignore
				return _originalEnd.call(this, chunk, ...otherArgs)
			}
			chunk = chunk.replace(
				'const sheetsMap',
				'const styleTargets = new Set(); const styleTargetsStyleMap = new Map(); const sheetsMap',
			)
			chunk = chunk.replace('export {', 'export { addStyleTarget, ')
			chunk = chunk.replace(
				'document.head.appendChild(style)',
				'styleTargets.size ? styleTargets.forEach(target => addStyleToTarget(style, target)) : document.head.appendChild(style)',
			)
			chunk = chunk.replace(
				'document.head.removeChild(style)',
				'styleTargetsStyleMap.get(style) ? styleTargetsStyleMap.get(style).forEach(style => style.parentNode.removeChild(style)) : document.head.removeChild(style)',
			)
			const styleProperty = /style\.textContent = content/.test(chunk)
				? 'style.textContent'
				: 'style.innerHTML'
			const lastStyleInnerHtml = chunk.lastIndexOf(`${styleProperty} = content`)
			chunk =
				chunk.slice(0, lastStyleInnerHtml) +
				chunk
					.slice(lastStyleInnerHtml)
					.replace(
						`${styleProperty} = content`,
						`${styleProperty} = content; styleTargetsStyleMap.get(style)?.forEach(style => ${styleProperty} = content)`,
					)
			chunk += `
        function addStyleTarget(newStyleTarget) {
          for (const [, style] of sheetsMap.entries()) {
            addStyleToTarget(style, newStyleTarget, styleTargets.size !== 0);
          }
          styleTargets.add(newStyleTarget);
        }
        function addStyleToTarget(style, target, cloneStyle = true) {
          const addedStyle = cloneStyle ? style.cloneNode(true) : style;
          target.appendChild(addedStyle);
          styleTargetsStyleMap.set(style, [...(styleTargetsStyleMap.get(style) ?? []), addedStyle]);
        }
      `
			res.setHeader('Etag', getEtag(chunk, { weak: true }))
		}
		// @ts-ignore
		return _originalEnd.call(this, chunk, ...otherArgs)
	}
	next()
}
class ContentSecurityPolicy {
	constructor(csp) {
		this.data = {}
		if (csp) {
			const sections = csp.split(';').map((section) => section.trim())
			this.data = sections.reduce((data, section) => {
				const [key, ...values] = section.split(' ').map((item) => item.trim())
				if (key) data[key] = values
				return data
			}, {})
		}
	}
	/** add values to directive */
	add(directive, ...newValues) {
		var _a
		const values =
			(_a = this.data[directive]) !== null && _a !== void 0 ? _a : []
		newValues.forEach((newValue) => {
			if (!values.includes(newValue)) values.push(newValue)
		})
		this.data[directive] = values
		return this
	}
	/** convert to csp string */
	toString() {
		const directives = Object.entries(this.data).sort(([l], [r]) => {
			var _a, _b
			const lo =
				(_a = ContentSecurityPolicy.DIRECTIVE_ORDER[l]) !== null &&
				_a !== void 0
					? _a
					: 2
			const ro =
				(_b = ContentSecurityPolicy.DIRECTIVE_ORDER[r]) !== null &&
				_b !== void 0
					? _b
					: 2
			return lo - ro
		})
		return directives.map((entry) => entry.flat().join(' ')).join('; ') + ';'
	}
}
ContentSecurityPolicy.DIRECTIVE_ORDER = {
	'default-src': 0,
	'script-src': 1,
	'object-src': 2,
}
const getCSP = (cspString) => {
	const csp = new ContentSecurityPolicy(cspString)
	csp.add('object-src', "'self'")
	csp.add('script-src', "'self'", 'http://localhost:*', 'http://127.0.0.1:*')
	return csp.toString()
}

class DevBuilderV2 extends DevBuilder {
	updatePermissions(manifest, port) {
		var _a
		// write host permissions
		;(_a = manifest.permissions) !== null && _a !== void 0
			? _a
			: (manifest.permissions = [])
		manifest.permissions.push(
			`http://localhost:${port}/*`,
			`http://127.0.0.1:${port}/*`,
		)
		return manifest
	}
	updateCSP(manifest) {
		let currentCSP = manifest.content_security_policy
		manifest.content_security_policy = getCSP(currentCSP)
		return manifest
	}
	/** add checksum to scripts */
	parseScriptHashes(content) {
		const matches = content.matchAll(/<script.*?>([^<]+)<\/script>/gs)
		for (const match of matches) {
			const shasum = crypto.createHash('sha256')
			shasum.update(match[1])
			this.scriptHashes.add(`'sha256-${shasum.digest('base64')}'`)
		}
	}
	async writeOutputWas(manifest, wasFilter) {
		if (!manifest.web_accessible_resources) return
		for (const [i, resource] of manifest.web_accessible_resources.entries()) {
			if (!resource) continue
			if (!wasFilter(resource)) continue
			const { outputFile } = getFileName(resource)
			const loader = getScriptLoader(
				outputFile,
				`${this.hmrServer}/${resource}`,
			)
			manifest.web_accessible_resources[i] = loader.fileName
			const outFile = `${this.outDir}/${loader.fileName}`
			const outFileDir = path.dirname(outFile)
			await fs.ensureDir(outFileDir)
			await fs.writeFile(outFile, loader.source)
		}
	}
}

function appendInputScripts(inputScripts, optionsInput) {
	const optionsInputObject = parseOptionsInput(optionsInput)
	inputScripts.forEach(
		([output, input]) => (optionsInputObject[output] = input),
	)
	return optionsInputObject
}
/** parse input options as object */
function parseOptionsInput(input) {
	if (typeof input === 'string') {
		if (!input.trim()) return {}
		return { [input]: input }
	} else if (input instanceof Array) {
		if (!input.length) return {}
		const inputObject = {}
		input.forEach((input) => (inputObject[input] = input))
		return inputObject
	}
	return input !== null && input !== void 0 ? input : {}
}
/** fetches all script file info from build output */
function getScriptChunkInfo(bundle, chunkId) {
	const file = sanitise(chunkId).path
	return Object.values(bundle).find((chunk) => {
		var _a
		if (chunk.type === 'asset') return false
		return (
			((_a = chunk.facadeModuleId) === null || _a === void 0
				? void 0
				: _a.endsWith(file)) || chunk.fileName.endsWith(file)
		)
	})
}
/** fetches all css/sass file info from build output */
function getCssAssetInfo(bundle, assetFileName) {
	let fileName = sanitise(assetFileName).name + '.css'
	return Object.values(bundle).find((chunk) => {
		var _a, _b
		if (chunk.type === 'chunk') return
		const chunkName =
			(_a = chunk.name) !== null && _a !== void 0 ? _a : chunk.fileName
		if (!/\.(s?[ca]ss)$/.test(chunkName)) return false
		return fileName.endsWith(
			(_b = chunk.name) !== null && _b !== void 0 ? _b : chunk.fileName,
		)
	})
}

class ManifestParser {
	constructor(options, viteConfig) {
		this.options = options
		this.viteConfig = viteConfig
		this.parseChunkIds = new Set()
		if (this.options.manifest.version === 'DATE') {
			let now = new Date()
			const version = [
				now.getFullYear().toString().slice(2),
				now.getMonth() + 1,
				now.getDate(),
			].join('.')
			this.options.manifest.version = version
		}
		this.inputManifest = this.options.manifest
		this.WasFilter = filterScripts(this.options.webAccessibleScripts)
	}
	async parseInput() {
		const result = {
			manifest: this.inputManifest,
			inputScripts: [],
			emitFiles: [],
		}
		return this.pipe(
			result,
			this.parseInputHtml,
			this.parseInputCs,
			this.parseInputWas,
			this.parseInputSw,
			...this.getParseInputMethods(),
		)
	}
	async writeDevBuild(port) {
		await this.createDevBuilder().writeBuild({
			port,
			manifest: this.inputManifest,
			htmlFiles: this.getHtmlFiles(this.inputManifest),
		})
	}
	async parseOutput(bundle) {
		let result = {
			inputScripts: [],
			emitFiles: [],
			manifest: this.inputManifest,
		}
		result = await this.parseOutputWas(result, bundle)
		result = await this.parseOutputCs(result, bundle)
		for (const parseMethod of this.getParseOutputMethods()) {
			result = await parseMethod(result, bundle)
		}
		result.emitFiles.push({
			type: 'asset',
			fileName: 'manifest.json',
			source: JSON.stringify(result.manifest, null, 2),
		})
		return result
	}
	setDevServer(server) {
		this.devServer = server
	}
	parseInputHtml(result) {
		this.getHtmlFiles(result.manifest).forEach((htmlFileName) =>
			this.parseInputHtmlFile(htmlFileName, result),
		)
		return result
	}
	/** imports all CS files */
	parseInputCs(result) {
		var _a
		;(_a = result.manifest.content_scripts) === null || _a === void 0
			? void 0
			: _a.forEach((script) => {
					var _a, _b
					/** get all css & js files */
					const files = [
						...((_a = script.js) !== null && _a !== void 0 ? _a : []),
						...((_b = script.css) !== null && _b !== void 0 ? _b : []),
					]
					files === null || files === void 0
						? void 0
						: files.forEach((file) => {
								const { inputFile, outputFile } = getFileName(
									file,
									this.viteConfig,
								)
								if (inputFile) {
									// push to input scripts
									result.inputScripts.push([outputFile, inputFile])
								}
						  })
			  })
		return result
	}
	/** get all input html files */
	parseInputHtmlFile(html, result) {
		if (!html) return result
		const { inputFile, outputFile } = getFileName(html, this.viteConfig)
		if (inputFile) {
			// push to input scripts
			result.inputScripts.push([outputFile, inputFile])
		}
		return result
	}
	/** get the output css files */
	parseOutputCss(file, bundle) {
		const cssAssetInfo = getCssAssetInfo(bundle, file)
		// throw error if css not found
		if (!cssAssetInfo) {
			throw new Error(`Failed to find CSS asset info for ${file}`)
		}
		return { file: cssAssetInfo.fileName }
	}
	/** get the output js files */
	parseOutputJs(file, result, bundle) {
		const { inputFile, publicFile } = getFileName(file, this.viteConfig)
		if (!inputFile) return
		if (publicFile) return { waFiles: new Set([publicFile]) }
		const chunk = getScriptChunkInfo(bundle, inputFile)
		// throw error if script not found
		if (!chunk) {
			throw new Error(`Failed to find chunk info for ${inputFile}`)
		}
		const loader = getCsLoader(file, chunk)
		if (loader.source) {
			result.emitFiles.push({
				type: 'asset',
				fileName: loader.fileName,
				source: loader.source,
			})
		}
		const metadata = this.getMetadata(
			chunk.fileName,
			bundle,
			Boolean(loader.source),
		)
		/** gets all css output files of current script */
		chunk.code = chunk.code.replace(
			new RegExp('import.meta.CURRENT_CHUNK_CSS_PATHS', 'g'),
			`[${[...metadata.css].map((path) => `"${path}"`).join(',')}]`,
		)
		return {
			fileName: loader.fileName,
			waFiles: new Set([...metadata.assets, ...metadata.css]),
		}
	}
	parseOutputWaScript(file, result, bundle) {
		const chunkInfo = getScriptChunkInfo(bundle, file)
		// throw error if chunk not found
		if (!chunkInfo) {
			throw new Error(`Failed to find chunk info for ${file}`)
		}
		const loader = getWasLoader(file, chunkInfo)
		result.emitFiles.push({
			type: 'asset',
			fileName: loader.fileName,
			source: loader.source,
		})
		const metadata = this.getMetadata(
			chunkInfo.fileName,
			bundle,
			Boolean(loader.source),
		)
		chunkInfo.code = chunkInfo.code.replace(
			new RegExp('import.meta.CURRENT_CHUNK_CSS_PATHS', 'g'),
			`[${[...metadata.css].map((path) => `"${path}"`).join(',')}]`,
		)
		return {
			scriptFileName: loader.fileName,
			webAccessibleFiles: new Set([...metadata.assets, ...metadata.css]),
		}
	}
	pipe(initialValue, ...fns) {
		return fns.reduce(
			(previousValue, fn) => fn.call(this, previousValue),
			initialValue,
		)
	}
	getMetadata(chunkId, bundle, includeAsAsset, metadata = null) {
		// clear metadata
		if (metadata === null) {
			this.parseChunkIds.clear()
			metadata = {
				css: new Set(),
				assets: new Set(),
			}
		}
		// return metadata if already exists
		if (this.parseChunkIds.has(chunkId)) return metadata
		// fetch metadata of current chunk
		const chunkInfo = getScriptChunkInfo(bundle, chunkId)
		if (!chunkInfo) return metadata
		if (includeAsAsset) metadata.assets.add(chunkInfo.fileName)
		chunkInfo.viteMetadata.importedCss.forEach(metadata.css.add, metadata.css)
		chunkInfo.viteMetadata.importedAssets.forEach(
			metadata.assets.add,
			metadata.assets,
		)
		this.parseChunkIds.add(chunkId)
		// get metadata of imported assets imports
		chunkInfo.imports.forEach((chunkId) => {
			metadata = this.getMetadata(chunkId, bundle, true, metadata)
		})
		chunkInfo.dynamicImports.forEach((chunkId) => {
			metadata = this.getMetadata(chunkId, bundle, true, metadata)
		})
		return metadata
	}
	parseInputSw(result) {
		var _a
		// @ts-expect-error - Force support of event pages in manifest V3
		if (
			!((_a = result.manifest.background) === null || _a === void 0
				? void 0
				: _a.scripts)
		)
			return result
		const loader = getHtmlLoader(
			'background',
			// @ts-expect-error - Force support of event pages in manifest V3
			result.manifest.background.scripts.map((s) => s.replace(/^\.\//, '/')),
		)
		const file = loader.fileName
		const { inputFile, outputFile } = getFileName(file, this.viteConfig, true)
		if (inputFile) {
			result.inputScripts.push([outputFile, inputFile])
			setModule(inputFile, loader.source)
		}
		// @ts-expect-error - Force support of event pages in manifest V3
		delete result.manifest.background.scripts
		// @ts-expect-error - Force support of event pages in manifest V3
		result.manifest.background.page = loader.fileName
		return result
	}
}

class ManifestV2 extends ManifestParser {
	createDevBuilder() {
		return new DevBuilderV2(this.viteConfig, this.options, this.devServer)
	}
	/** get all html files from manifest */
	getHtmlFiles(manifest) {
		var _a, _b, _c, _d, _e, _f, _g
		const htmlFiles = [
			(_a = manifest.background) === null || _a === void 0 ? void 0 : _a.page,
			(_b = manifest.browser_action) === null || _b === void 0
				? void 0
				: _b.default_popup,
			(_c = manifest.options_ui) === null || _c === void 0 ? void 0 : _c.page,
			manifest.devtools_page,
			(_d = manifest.chrome_url_overrides) === null || _d === void 0
				? void 0
				: _d.newtab,
			(_e = manifest.chrome_url_overrides) === null || _e === void 0
				? void 0
				: _e.history,
			(_f = manifest.chrome_url_overrides) === null || _f === void 0
				? void 0
				: _f.bookmarks,
		]
		;(_g = manifest.web_accessible_resources) === null || _g === void 0
			? void 0
			: _g.filter(isHTML).forEach((html) => {
					htmlFiles.push(html)
			  })
		return htmlFiles.filter((file) => typeof file === 'string')
	}
	/** gets available input methods */
	getParseInputMethods() {
		return []
	}
	/** gets available parser output methods */
	getParseOutputMethods() {
		return [this.parseWatchMode.bind(this)]
	}
	/** parse input web-accessible-resources */
	parseInputWas(result) {
		var _a
		;(_a = result.manifest.web_accessible_resources) === null || _a === void 0
			? void 0
			: _a.forEach((resource) => {
					if (resource.includes('*')) return
					const { inputFile, outputFile } = getFileName(
						resource,
						this.viteConfig,
					)
					if (inputFile && this.WasFilter(inputFile)) {
						result.inputScripts.push([outputFile, inputFile])
					}
			  })
		return result
	}
	/** parse content script for output */
	async parseOutputCs(result, bundle) {
		var _a, _b
		const waResources = new Set(
			(_a = result.manifest.web_accessible_resources) !== null && _a !== void 0
				? _a
				: [],
		)
		;(_b = result.manifest.content_scripts) === null || _b === void 0
			? void 0
			: _b.forEach((script) => {
					var _a, _b
					// loop through content-script js
					;(_a = script.js) === null || _a === void 0
						? void 0
						: _a.forEach((scriptFileName, i) => {
								const parsedScript = this.parseOutputJs(
									scriptFileName,
									result,
									bundle,
								)
								if (
									parsedScript === null || parsedScript === void 0
										? void 0
										: parsedScript.fileName
								)
									script.js[i] = parsedScript.fileName
								// add to web-accessible-resource
								parsedScript === null || parsedScript === void 0
									? void 0
									: parsedScript.waFiles.forEach(waResources.add, waResources)
						  })
					// loop through content-script css
					;(_b = script.css) === null || _b === void 0
						? void 0
						: _b.forEach((cssFileName, i) => {
								const parsedCss = this.parseOutputCss(cssFileName, bundle)
								script.css[i] = parsedCss.file
								// add to web-accessible-resource
								waResources.add(parsedCss.file)
						  })
			  })
		if (waResources.size > 0) {
			result.manifest.web_accessible_resources = Array.from(waResources)
		}
		return result
	}
	/** parse output web-accessible-resource */
	async parseOutputWas(result, bundle) {
		if (!result.manifest.web_accessible_resources) return result
		for (const resource of result.manifest.web_accessible_resources) {
			// do not run parser for wild cards or filters
			if (resource.includes('*') || !this.WasFilter(resource)) continue
			const parsedScript = this.parseOutputWaScript(resource, result, bundle)
			result.manifest.web_accessible_resources = [
				...result.manifest.web_accessible_resources,
				...parsedScript.webAccessibleFiles,
			]
		}
		return result
	}
	async parseWatchMode(result) {
		if (!result.manifest.web_accessible_resources) {
			return result
		}
		if (
			result.manifest.web_accessible_resources.length > 0 &&
			this.viteConfig.build.watch
		) {
			// expose all files in watch mode to allow web-ext reloading to work when manifest changes are not applied on reload (eg. Firefox)
			result.manifest.web_accessible_resources.push('*.js')
		}
		return result
	}
}

class DevBuilderV3 extends DevBuilder {
	updatePermissions(manifest, port) {
		var _a
		;(_a = manifest.host_permissions) !== null && _a !== void 0
			? _a
			: (manifest.host_permissions = [])
		manifest.host_permissions.push(
			`http://localhost:${port}/*`,
			`http://127.0.0.1:${port}/*`,
		)
		return manifest
	}
	async writeBuildFiles(manifest) {
		await this.writeManifestSW(manifest)
	}
	updateCSP(manifest) {
		var _a
		;(_a = manifest.content_security_policy) !== null && _a !== void 0
			? _a
			: (manifest.content_security_policy = {})
		let currentCSP = manifest.content_security_policy.extension_pages
		manifest.content_security_policy.extension_pages = getCSP(currentCSP)
		return manifest
	}
	async writeManifestSW(manifest) {
		var _a, _b
		if (
			!((_a = manifest.background) === null || _a === void 0
				? void 0
				: _a.service_worker)
		)
			return
		const fileName =
			(_b = manifest.background) === null || _b === void 0
				? void 0
				: _b.service_worker
		const serviceWorkerLoader = getSwLoader(`${this.hmrServer}/${fileName}`)
		manifest.background.service_worker = serviceWorkerLoader.fileName
		const outFile = `${this.outDir}/${serviceWorkerLoader.fileName}`
		const outFileDir = path.dirname(outFile)
		await fs.ensureDir(outFileDir)
		await fs.writeFile(outFile, serviceWorkerLoader.source)
	}
	async writeOutputWas(manifest, wasFilter) {
		if (!manifest.web_accessible_resources) return
		for (const [i, struct] of manifest.web_accessible_resources.entries()) {
			if (!struct || !struct.resources.length) continue
			for (const [j, fileName] of struct.resources.entries()) {
				if (!wasFilter(fileName)) continue
				const { outputFile } = getFileName(fileName)
				const loader = getScriptLoader(
					outputFile,
					`${this.hmrServer}/${fileName}`,
				)
				manifest.web_accessible_resources[i].resources[j] = loader.fileName
				const outFile = `${this.outDir}/${loader.fileName}`
				const outFileDir = path.dirname(outFile)
				await fs.ensureDir(outFileDir)
				await fs.writeFile(outFile, loader.source)
			}
		}
	}
}

class ManifestV3 extends ManifestParser {
	createDevBuilder() {
		return new DevBuilderV3(this.viteConfig, this.options, this.devServer)
	}
	/** get all html files from */
	getHtmlFiles(manifest) {
		var _a, _b, _c, _d, _e, _f
		const htmlFiles = [
			(_a = manifest.action) === null || _a === void 0
				? void 0
				: _a.default_popup,
			(_b = manifest.options_ui) === null || _b === void 0 ? void 0 : _b.page,
			manifest.devtools_page,
			(_c = manifest.chrome_url_overrides) === null || _c === void 0
				? void 0
				: _c.newtab,
			(_d = manifest.chrome_url_overrides) === null || _d === void 0
				? void 0
				: _d.history,
			(_e = manifest.chrome_url_overrides) === null || _e === void 0
				? void 0
				: _e.bookmarks,
		]
		;(_f = manifest.web_accessible_resources) === null || _f === void 0
			? void 0
			: _f.forEach(({ resources }) => {
					resources.filter(isHTML).forEach((html) => htmlFiles.push(html))
			  })
		return htmlFiles.filter((file) => typeof file === 'string')
	}
	/** gets available parser input methods */
	getParseInputMethods() {
		return [this.parseInputBackground]
	}
	/** gets available parser output methods */
	getParseOutputMethods() {
		return [this.parseOutputSw]
	}
	/** gets available parser output methods */
	parseInputBackground(result) {
		var _a, _b
		if (
			!((_a = result.manifest.background) === null || _a === void 0
				? void 0
				: _a.service_worker)
		)
			return result
		const swScript =
			(_b = result.manifest.background) === null || _b === void 0
				? void 0
				: _b.service_worker
		const { inputFile, outputFile } = getFileName(swScript, this.viteConfig)
		if (inputFile) {
			result.inputScripts.push([outputFile, inputFile])
			result.manifest.background.type = 'module'
		}
		return result
	}
	/** parse input web-accessible-resources */
	parseInputWas(result) {
		var _a
		;(_a = result.manifest.web_accessible_resources) === null || _a === void 0
			? void 0
			: _a.forEach((struct) => {
					struct.resources.forEach((resource) => {
						if (resource.includes('*')) return
						const { inputFile, outputFile } = getFileName(
							resource,
							this.viteConfig,
						)
						if (inputFile && this.WasFilter(inputFile)) {
							result.inputScripts.push([outputFile, inputFile])
						}
					})
			  })
		return result
	}
	/** parse content script for output */
	async parseOutputCs(result, bundle) {
		var _a, _b
		const waResources = new Set(
			(_a = result.manifest.web_accessible_resources) !== null && _a !== void 0
				? _a
				: [],
		)
		;(_b = result.manifest.content_scripts) === null || _b === void 0
			? void 0
			: _b.forEach((script) => {
					var _a, _b
					const resources = new Set([])
					// loop through content-script js
					;(_a = script.js) === null || _a === void 0
						? void 0
						: _a.forEach((scriptFileName, i) => {
								const parsedScript = this.parseOutputJs(
									scriptFileName,
									result,
									bundle,
								)
								if (
									parsedScript === null || parsedScript === void 0
										? void 0
										: parsedScript.fileName
								)
									script.js[i] = parsedScript.fileName
								// add to web-accessible-resource
								parsedScript === null || parsedScript === void 0
									? void 0
									: parsedScript.waFiles.forEach(resources.add, resources)
						  })
					// loop through content-script css
					;(_b = script.css) === null || _b === void 0
						? void 0
						: _b.forEach((cssFileName, i) => {
								const parsedCss = this.parseOutputCss(cssFileName, bundle)
								script.css[i] = parsedCss.file
								// add to web-accessible-resource
								resources.add(parsedCss.file)
						  })
					if (resources.size > 0) {
						waResources.add({
							matches: script.matches.map((pattern) => {
								const pathMatch = /[^:\/]\//.exec(pattern)
								if (!pathMatch) return pattern
								const path = pattern.slice(pathMatch.index + 1)
								if (['/', '/*'].includes(path)) return pattern
								return pattern.replace(path, '/*')
							}),
							resources: Array.from(resources),
							// @ts-ignore
							use_dynamic_url: this.options.useDynamicUrl || undefined,
						})
					}
			  })
		if (waResources.size > 0) {
			result.manifest.web_accessible_resources = Array.from(waResources)
		}
		return result
	}
	/** parse output web-accessible-resource */
	async parseOutputWas(result, bundle) {
		if (!result.manifest.web_accessible_resources) return result
		for (const resource of result.manifest.web_accessible_resources) {
			if (!resource.resources) continue
			for (const fileName of resource.resources) {
				// do not run parser for wild cards or filters
				if (fileName.includes('*') || !this.WasFilter(fileName)) continue
				const parsedScript = this.parseOutputWaScript(fileName, result, bundle)
				if (parsedScript.webAccessibleFiles.size) {
					resource.resources = [
						...resource.resources,
						...parsedScript.webAccessibleFiles,
					]
				}
			}
		}
		return result
	}
	/** parse output background service-worker */
	async parseOutputSw(result, bundle) {
		var _a
		const swFile =
			(_a = result.manifest.background) === null || _a === void 0
				? void 0
				: _a.service_worker
		if (!swFile) return result
		const chunkInfo = getScriptChunkInfo(bundle, swFile)
		if (!chunkInfo) {
			throw new Error(`Failed to find chunk info for ${swFile}`)
		}
		const loader = getSwLoader(chunkInfo.fileName)
		result.manifest.background.service_worker = loader.fileName
		result.emitFiles.push({
			type: 'asset',
			fileName: loader.fileName,
			source: loader.source,
		})
		return result
	}
}

class ManifestParserFactory {
	static getParser(options, userConfig) {
		var _a
		switch (options.manifest.manifest_version) {
			case 2:
				return new ManifestV2(options, userConfig)
			case 3:
				return new ManifestV3(options, userConfig)
			default:
				throw new Error(
					`No parser available for manifest_version ${
						// @ts-expect-error - Allow showing manifest version for invalid usage
						(_a = manifest.manifest_version) !== null && _a !== void 0 ? _a : 0
					}`,
				)
		}
	}
}

function webExtension(pluginOptions) {
	var _a, _b, _c
	// assign defaults
	;(_a = pluginOptions.devHtmlTransform) !== null && _a !== void 0
		? _a
		: (pluginOptions.devHtmlTransform = false)
	;(_b = pluginOptions.useDynamicUrl) !== null && _b !== void 0
		? _b
		: (pluginOptions.useDynamicUrl = true)
	;(_c = pluginOptions.useHashedFileName) !== null && _c !== void 0
		? _c
		: (pluginOptions.useHashedFileName = true)
	if (!pluginOptions.manifest) {
		throw new Error('Missing manifest definition')
	}
	let userConfig
	let emitQueue = []
	let manifestParser
	return {
		name: 'webExtension',
		enforce: 'post',
		config: (config) => {
			return updateConfig(config, pluginOptions)
		},
		configResolved: (config) => {
			userConfig = config
		},
		configureServer: (server) => {
			server.middlewares.use(contentScriptStyleHandler)
			server.httpServer.once('listening', () => {
				manifestParser.setDevServer(server)
				manifestParser.writeDevBuild(server.config.server.port)
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
				var _a
				this.emitFile(file)
				this.addWatchFile(
					(_a = file.fileName) !== null && _a !== void 0 ? _a : file.name,
				)
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

module.exports = webExtension
