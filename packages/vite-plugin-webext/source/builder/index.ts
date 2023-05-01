import { getFileName } from '@/utils/files'
import { getScriptLoader } from '@/utils/loader'
import { filterScripts, getModule } from '@/utils/vite'
import fs from 'fs-extra'
import path from 'path'
import { createFilter, normalizePath } from 'vite'

export default abstract class DevBuilder<
	Manifest extends chrome.runtime.Manifest,
> {
	protected hmrServer = ''
	protected scriptHashes = new Set<string>()
	protected outDir: string
	protected WasFilter: ReturnType<typeof createFilter>

	constructor(
		private viteConfig: Vite.ResolvedConfig,
		private options: WebExtensionOptions,
		private devServer?: Vite.ViteDevServer,
	) {
		this.outDir = path.resolve(
			process.cwd(),
			this.viteConfig.root,
			this.viteConfig.build.outDir,
		)

		this.WasFilter = filterScripts(this.options.webAccessibleScripts)
	}

	async writeBuild({
		port,
		manifest,
		htmlFiles,
	}: {
		port: number
		manifest: Manifest
		htmlFiles: string[]
	}) {
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

	protected abstract updatePermissions(
		manifest: Manifest,
		port: number,
	): Manifest
	protected abstract updateCSP(manifest: Manifest): Manifest

	protected async writeBuildFiles(
		_manifest: Manifest,
		_manifestHtmlFiles: string[],
	): Promise<void> {}

	protected async writeOutputHtml(htmlFiles: string[]) {
		for (const file of htmlFiles) {
			const { inputFile } = getFileName(file, this.viteConfig)
			if (!inputFile) continue
			await this.writeManifestHtmlFile(file, inputFile)

			this.devServer!.watcher.on('change', async (path) => {
				if (normalizePath(path) !== inputFile) return
				await this.writeManifestHtmlFile(file, inputFile)
			})
		}
	}

	private async writeManifestHtmlFile(
		fileName: string,
		outputFile: string,
	): Promise<void> {
		let content = getModule(outputFile)
		content ??= await fs.readFile(outputFile, { encoding: 'utf-8' })

		// apply plugin html transforms
		if (this.options.devHtmlTransform) {
			content = await this.devServer!.transformIndexHtml(fileName, content)
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

	protected parseScriptHashes(_content: string): void {}

	protected async writeOutputScripts(manifest: Manifest) {
		if (!manifest.content_scripts) return

		for (const [i, script] of manifest.content_scripts.entries()) {
			if (!script.js) continue

			for (const [j, file] of script.js.entries()) {
				const { outputFile } = getFileName(file)
				const loader = getScriptLoader(outputFile, `${this.hmrServer}/${file}`)

				manifest.content_scripts[i].js![j] = loader.fileName
				const outFile = `${this.outDir}/${loader.fileName}`
				const outFileDir = path.dirname(outFile)

				await fs.ensureDir(outFileDir)
				await fs.writeFile(outFile, loader.source)
			}
		}
	}

	protected async writeOutputCss(manifest: Manifest) {
		if (!manifest.content_scripts) return

		for (const [i, script] of manifest.content_scripts.entries()) {
			if (!script.css) continue

			for (const [j, fileName] of script.css.entries()) {
				const { inputFile, outputFile } = getFileName(fileName, this.viteConfig)
				if (!inputFile) continue
				manifest.content_scripts[i].css![j] = outputFile
				await this.writeManifestCssFile(outputFile, inputFile)

				this.devServer!.watcher.on('change', async (path) => {
					if (normalizePath(path) !== inputFile) return
					await this.writeManifestCssFile(outputFile, fileName)
				})
			}
		}
	}

	protected async writeManifestCssFile(outputFile: string, file: string) {
		const module = await this.devServer!.ssrLoadModule(file)
		const source = module.default as string

		const loaderFile = {
			fileName: outputFile,
			source,
		}

		const outFile = `${this.outDir}/${loaderFile.fileName}`
		const outFileDir = path.dirname(outFile)

		await fs.ensureDir(outFileDir)
		await fs.writeFile(outFile, loaderFile.source)
	}

	protected abstract writeOutputWas(
		manifest: Manifest,
		wasFilter: ReturnType<typeof createFilter>,
	): Promise<void>

	/** get hmr server url with port */
	private getHmrServer(devServerPort: number): string {
		if (typeof this.viteConfig.server.hmr! === 'boolean') {
			throw new Error('Vite HMR is misconfigured')
		}

		return `http://${this.viteConfig.server.hmr!.host}:${devServerPort}`
	}
}
