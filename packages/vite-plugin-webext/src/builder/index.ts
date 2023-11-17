import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getFileName } from '@/utils/files';
import { getScriptLoader } from '@/utils/loader';
import { filterScripts, getModule } from '@/utils/vite';
import { copy, emptyDir, ensureDir, pathExists } from 'fs-extra';
import { createFilter, normalizePath } from 'vite';
import type { WebExtensionOptions } from '@/plugin.d';
import type * as Vite from 'vite';

export default abstract class DevBuilder<
  Manifest extends chrome.runtime.Manifest,
> {
  protected hmrServer = '';
  protected hmrViteClient = '';
  protected scriptHashes = new Set<string>();
  protected outDir: string;
  protected WasFilter: ReturnType<typeof createFilter>;

  constructor(
    private viteConfig: Vite.ResolvedConfig,
    private options: WebExtensionOptions,
    private devServer: Vite.ViteDevServer | undefined,
    protected manifest: Manifest,
  ) {
    this.outDir = path.resolve(
      process.cwd(),
      this.viteConfig.root,
      this.viteConfig.build.outDir,
    );

    this.WasFilter = filterScripts(this.options.webAccessibleScripts);
  }

  async writeBuild({
    devServerPort,
    htmlFiles,
  }: {
    devServerPort: number;
    htmlFiles: string[];
  }) {
    this.hmrServer = this.getHmrServer(devServerPort);
    this.hmrViteClient = `${this.hmrServer}/@vite/client`;

    // copies the content of public directory
    await emptyDir(this.outDir);
    const publicDir = path.resolve(
      process.cwd(),
      this.viteConfig.root,
      this.viteConfig.publicDir,
    );
    const publicDirExists = await pathExists(publicDir);
    if (publicDirExists) await copy(publicDir, this.outDir);

    await this.writeOutputHtml(htmlFiles);
    await this.writeOutputScripts();
    await this.writeOutputCss();
    await this.writeOutputWas(this.WasFilter);
    await this.writeBuildFiles(htmlFiles);
    this.updateCSP();

    // write the extension manifest file
    await writeFile(
      `${this.outDir}/manifest.json`,
      JSON.stringify(this.manifest, null, 2),
    );
  }

  protected abstract updateCSP(): void;

  protected async writeBuildFiles(
    _manifestHtmlFiles: string[],
  ): Promise<void> {}

  protected async writeOutputHtml(htmlFiles: string[]) {
    for (const file of htmlFiles) {
      const { inputFile } = getFileName(file, this.viteConfig);
      if (!inputFile) continue;
      await this.writeManifestHtmlFile(file, inputFile);

      this.devServer!.watcher.on('change', async (path) => {
        if (normalizePath(path) !== inputFile) return;
        await this.writeManifestHtmlFile(file, inputFile);
      });
    }
  }

  private async writeManifestHtmlFile(
    fileName: string,
    outputFile: string,
  ): Promise<string> {
    let content = getModule(outputFile);
    content ??= await readFile(outputFile, { encoding: 'utf-8' });
    content = await this.devServer!.transformIndexHtml(fileName, content);

    // get file path relative to hmr server
    let devServerFileName = `${this.hmrServer}${path
      .resolve(this.viteConfig.root, fileName)
      .slice(this.viteConfig.root.length)}`;
    // add base url to head
    let baseElement = `<base href="${devServerFileName}">`;
    let headRegex = /<head.*?>/ims;
    // resolve relative links
    content = content.match(headRegex)
      ? content.replace(headRegex, `$&${baseElement}`)
      : content.replace(/<html.*?>/ims, `$&<head>${baseElement}</head>`);

    this.parseScriptHashes(content);

    const outFile = `${this.outDir}/${fileName}`;
    const outFileDir = path.dirname(outFile);

    await ensureDir(outFileDir);
    await writeFile(outFile, content);

    return fileName;
  }

  protected parseScriptHashes(_content: string): void {}

  protected async writeOutputScripts() {
    let manifestCS = this.manifest.content_scripts;
    if (!manifestCS) return;

    for (const [i, script] of manifestCS.entries()) {
      if (!script.js) continue;

      for (const [j, file] of script.js.entries()) {
        const { outputFile } = getFileName(file);
        const loader = getScriptLoader(outputFile, `${this.hmrServer}/${file}`);

        manifestCS[i].js![j] = loader.fileName;
        const outFile = `${this.outDir}/${loader.fileName}`;
        const outFileDir = path.dirname(outFile);

        await ensureDir(outFileDir);
        await writeFile(outFile, loader.source);
      }
    }
  }

  protected async writeOutputCss() {
    let manifestCS = this.manifest.content_scripts;
    if (!manifestCS) return;

    for (const [i, script] of manifestCS.entries()) {
      if (!script.css) continue;

      for (const [j, fileName] of script.css.entries()) {
        const { inputFile, outputFile } = getFileName(
          fileName,
          this.viteConfig,
        );
        const outputCss = outputFile + '.css';
        if (!inputFile) continue;
        manifestCS[i].css![j] = outputCss;
        await this.writeManifestCssFile(outputCss, inputFile);

        this.devServer!.watcher.on('change', async (path) => {
          if (normalizePath(path) !== inputFile) return;
          await this.writeManifestCssFile(outputCss, fileName);
        });
      }
    }
  }

  protected async writeManifestCssFile(outputFile: string, file: string) {
    const module = await this.devServer!.ssrLoadModule(file);
    const source = module.default as string;

    const loaderFile = {
      fileName: outputFile,
      source,
    };

    const outFile = `${this.outDir}/${loaderFile.fileName}`;
    const outFileDir = path.dirname(outFile);

    await ensureDir(outFileDir);
    await writeFile(outFile, loaderFile.source);
  }

  protected abstract writeOutputWas(
    wasFilter: ReturnType<typeof createFilter>,
  ): Promise<void>;

  /** get hmr server url with port */
  private getHmrServer(devServerPort: number): string {
    if (typeof this.viteConfig.server.hmr! === 'boolean') {
      throw new Error('Vite HMR is misconfigured');
    }

    return `http://${this.viteConfig.server.hmr!.host}:${devServerPort}`;
  }
}
