import crypto from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import DevBuilder from './index';
import { getFileName } from '@/utils/files';
import { getScriptLoader } from '@/utils/loader';
import { getCSP } from '@/utils/server';
import { ensureDir } from 'fs-extra';
import { createFilter } from 'vite';

export default class DevBuilderV2 extends DevBuilder<chrome.runtime.ManifestV2> {
  protected updateCSP(): void {
    let currentCSP = this.manifest.content_security_policy;
    this.manifest.content_security_policy = getCSP(currentCSP);
  }

  /** add checksum to scripts */
  protected parseScriptHashes(content: string) {
    const matches = content.matchAll(/<script.*?>([^<]+)<\/script>/gis);
    for (const match of matches) {
      const shasum = crypto.createHash('sha256');
      shasum.update(match[1]);
      this.scriptHashes.add(`'sha256-${shasum.digest('base64')}'`);
    }
  }

  protected async writeOutputWas(wasFilter: ReturnType<typeof createFilter>) {
    if (!this.manifest.web_accessible_resources) return;

    for (const [
      i,
      resource,
    ] of this.manifest.web_accessible_resources.entries()) {
      if (!resource || !wasFilter(resource)) continue;

      const { outputFile } = getFileName(resource);
      const loader = getScriptLoader(
        outputFile,
        `${this.hmrServer}/${resource}`,
      );

      this.manifest.web_accessible_resources[i] = loader.fileName;

      const outFile = `${this.outDir}/${loader.fileName}`;
      const outFileDir = path.dirname(outFile);
      await ensureDir(outFileDir);
      await writeFile(outFile, loader.source);
    }
  }
}
