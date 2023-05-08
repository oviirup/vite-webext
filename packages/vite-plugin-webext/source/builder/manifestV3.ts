import { getFileName } from '@/utils/files'
import { getScriptLoader, getSwLoader } from '@/utils/loader'
import { getCSP } from '@/utils/server'
import { ensureDir } from 'fs-extra'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createFilter } from 'vite'
import DevBuilder from './index'

export default class DevBuilderV3 extends DevBuilder<chrome.runtime.ManifestV3> {
	updatePermissions(
		manifest: chrome.runtime.ManifestV3,
		port: number,
	): chrome.runtime.ManifestV3 {
		manifest.host_permissions ??= []
		manifest.host_permissions.push(
			`http://localhost:${port}/*`,
			`http://127.0.0.1:${port}/*`,
		)
		return manifest
	}

	async writeBuildFiles(manifest: chrome.runtime.ManifestV3): Promise<void> {
		await this.writeManifestSW(manifest)
	}

	updateCSP(manifest: chrome.runtime.ManifestV3): chrome.runtime.ManifestV3 {
		manifest.content_security_policy ??= {}

		let currentCSP = manifest.content_security_policy.extension_pages
		manifest.content_security_policy.extension_pages = getCSP(currentCSP)

		return manifest
	}

	private async writeManifestSW(manifest: chrome.runtime.ManifestV3) {
		if (!manifest.background?.service_worker) return

		const fileName = manifest.background?.service_worker
		const serviceWorkerLoader = getSwLoader(`${this.hmrServer}/${fileName}`)

		manifest.background.service_worker = serviceWorkerLoader.fileName

		const outFile = `${this.outDir}/${serviceWorkerLoader.fileName}`
		const outFileDir = path.dirname(outFile)

		await ensureDir(outFileDir)
		await writeFile(outFile, serviceWorkerLoader.source)
	}

	protected async writeOutputWas(
		manifest: chrome.runtime.ManifestV3,
		wasFilter: ReturnType<typeof createFilter>,
	) {
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
				await ensureDir(outFileDir)
				await writeFile(outFile, loader.source)
			}
		}
	}
}
