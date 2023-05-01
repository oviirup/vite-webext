import crypto from 'crypto'
import { ensureDir, writeFile } from 'fs-extra'
import path from 'path'
import { createFilter } from 'vite'
import { getFileName } from '@/utils/files'
import { getScriptLoader } from '@/utils/loader'
import DevBuilder from '.'
import { getCSP } from '@/utils/server'

export default class DevBuilderV2 extends DevBuilder<chrome.runtime.ManifestV2> {
	updatePermissions(
		manifest: chrome.runtime.ManifestV2,
		port: number,
	): chrome.runtime.ManifestV2 {
		// write host permissions
		manifest.permissions ??= []
		manifest.permissions.push(
			`http://localhost:${port}/*`,
			`http://127.0.0.1:${port}/*`,
		)
		return manifest
	}

	protected updateCSP(manifest: chrome.runtime.ManifestV2) {
		let currentCSP = manifest.content_security_policy
		manifest.content_security_policy = getCSP(currentCSP)

		return manifest
	}

	/** add checksum to scripts */
	protected parseScriptHashes(content: string) {
		const matches = content.matchAll(/<script.*?>([^<]+)<\/script>/gs)
		for (const match of matches) {
			const shasum = crypto.createHash('sha256')
			shasum.update(match[1])
			this.scriptHashes.add(`'sha256-${shasum.digest('base64')}'`)
		}
	}

	protected async writeOutputWas(
		manifest: chrome.runtime.ManifestV2,
		wasFilter: ReturnType<typeof createFilter>,
	) {
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
			await ensureDir(outFileDir)
			await writeFile(outFile, loader.source)
		}
	}
}
