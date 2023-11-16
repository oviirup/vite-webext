import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import DevBuilder from './index';
import { getFileName } from '@/utils/files';
import { getScriptLoader, getSwLoader } from '@/utils/loader';
import { getCSP } from '@/utils/server';
import { ensureDir } from 'fs-extra';
import { createFilter } from 'vite';

export default class DevBuilderV3 extends DevBuilder<chrome.runtime.ManifestV3> {
	updateCSP(): void {
		this.manifest.content_security_policy ??= {};
		let currentCSP = this.manifest.content_security_policy.extension_pages;
		this.manifest.content_security_policy.extension_pages = getCSP(currentCSP);
	}

	async writeBuildFiles(): Promise<void> {
		await this.writeManifestSW(this.manifest);
	}

	private async writeManifestSW(manifest: chrome.runtime.ManifestV3) {
		if (!manifest.background?.service_worker) return;

		const fileName = manifest.background?.service_worker;
		const serviceWorkerLoader = getSwLoader(`${this.hmrServer}/${fileName}`);
		manifest.background.service_worker = serviceWorkerLoader.fileName;

		const outFile = `${this.outDir}/${serviceWorkerLoader.fileName}`;
		const outFileDir = path.dirname(outFile);

		await ensureDir(outFileDir);
		await writeFile(outFile, serviceWorkerLoader.source);
	}

	protected async writeOutputWas(wasFilter: ReturnType<typeof createFilter>) {
		let manifestWAS = this.manifest.web_accessible_resources;
		if (!manifestWAS) return;

		for (const [i, struct] of manifestWAS.entries()) {
			if (!struct || !struct.resources.length) continue;

			for (const [j, fileName] of struct.resources.entries()) {
				if (!wasFilter(fileName)) continue;

				const { outputFile } = getFileName(fileName);
				const loader = getScriptLoader(
					outputFile,
					`${this.hmrServer}/${fileName}`,
				);

				manifestWAS[i].resources[j] = loader.fileName;

				const outFile = `${this.outDir}/${loader.fileName}`;
				const outFileDir = path.dirname(outFile);
				await ensureDir(outFileDir);
				await writeFile(outFile, loader.source);
			}
		}
	}
}
