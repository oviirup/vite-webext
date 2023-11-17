import DevBuilder from '@/builder';
import { getFileName } from '@/utils/files';
import { getCsLoader, getHtmlLoader, getWasLoader } from '@/utils/loader';
import { getCssAssetInfo, getScriptChunkInfo } from '@/utils/rollup';
import { filterScripts, setModule } from '@/utils/vite';
import { createFilter } from 'vite';
import type { WebExtensionOptions } from '@/plugin.d';
import type * as Rollup from 'rollup';
import type * as Vite from 'vite';

export interface Result<Manifest extends chrome.runtime.Manifest> {
  inputScripts: [string, string][];
  emitFiles: Rollup.EmittedFile[];
  manifest: Manifest;
}

export default abstract class ManifestParser<
  Manifest extends chrome.runtime.Manifest,
> {
  protected inputManifest: Manifest;
  protected WasFilter: ReturnType<typeof createFilter>;
  protected devServer: Vite.ViteDevServer | undefined;
  protected parseChunkIds = new Set<string>();

  constructor(
    protected options: WebExtensionOptions,
    protected viteConfig: Vite.ResolvedConfig,
  ) {
    // use date as version
    if (this.options.manifest.version === 'DATE') {
      let now = new Date();
      const version = [
        now.getFullYear().toString().slice(2),
        now.getMonth() + 1,
        now.getDate(),
      ].join('.');
      this.options.manifest.version = version;
    }
    this.inputManifest = JSON.parse(JSON.stringify(this.options.manifest));
    this.WasFilter = filterScripts(this.options.webAccessibleScripts);
  }

  async parseInput(): Promise<Result<Manifest>> {
    const result: Result<Manifest> = {
      manifest: this.inputManifest,
      inputScripts: [],
      emitFiles: [],
    };

    return this.pipe(
      result,
      this.parseInputHtml,
      this.parseInputCs,
      this.parseInputWas,
      this.parseInputSw,
      ...this.getParseInputMethods(),
    );
  }

  async writeDevBuild(port: number): Promise<void> {
    await this.createDevBuilder().writeBuild({
      devServerPort: port,
      htmlFiles: this.getHtmlFiles(this.inputManifest),
    });
  }

  async parseOutput(bundle: Rollup.OutputBundle): Promise<Result<Manifest>> {
    let result: Result<Manifest> = {
      inputScripts: [],
      emitFiles: [],
      manifest: this.inputManifest,
    };

    result = await this.parseOutputWas(result, bundle);
    result = await this.parseOutputCs(result, bundle);

    for (const parseMethod of this.getParseOutputMethods()) {
      result = await parseMethod(result, bundle);
    }

    result.emitFiles.push({
      type: 'asset',
      fileName: 'manifest.json',
      source: JSON.stringify(result.manifest, null, 2),
    });

    return result;
  }

  setDevServer(server: Vite.ViteDevServer) {
    this.devServer = server;
  }

  protected abstract createDevBuilder(): DevBuilder<Manifest>;

  protected abstract getHtmlFiles(manifest: Manifest): string[];

  protected abstract getParseInputMethods(): ((
    result: Result<Manifest>,
  ) => Result<Manifest>)[];

  protected abstract getParseOutputMethods(): ((
    result: Result<Manifest>,
    bundle: Rollup.OutputBundle,
  ) => Promise<Result<Manifest>>)[];

  protected abstract parseOutputCs(
    result: Result<Manifest>,
    bundle: Rollup.OutputBundle,
  ): Promise<Result<Manifest>>;

  protected abstract parseOutputWas(
    result: Result<Manifest>,
    bundle: Rollup.OutputBundle,
  ): Promise<Result<Manifest>>;

  protected parseInputHtml(result: Result<Manifest>) {
    this.getHtmlFiles(result.manifest).forEach((htmlFileName) =>
      this.parseInputHtmlFile(htmlFileName, result),
    );

    return result;
  }

  /** imports all CS files */
  protected parseInputCs(result: Result<Manifest>): Result<Manifest> {
    result.manifest.content_scripts?.forEach((script) => {
      /** get all css & js files */
      const files = [...(script.js ?? []), ...(script.css ?? [])];
      files?.forEach((file) => {
        const { inputFile, outputFile } = getFileName(file, this.viteConfig);
        if (inputFile) {
          // push to input scripts
          result.inputScripts.push([outputFile, inputFile]);
        }
      });
    });

    return result;
  }

  protected abstract parseInputWas(result: Result<Manifest>): Result<Manifest>;

  /** get all input html files */
  protected parseInputHtmlFile(
    html: string | undefined,
    result: Result<Manifest>,
  ): Result<Manifest> {
    if (!html) return result;

    const { inputFile, outputFile } = getFileName(html, this.viteConfig);
    if (inputFile) {
      // push to input scripts
      result.inputScripts.push([outputFile, inputFile]);
    }
    return result;
  }

  /** get the output css files */
  protected parseOutputCss(
    file: string,
    bundle: Rollup.OutputBundle,
  ): { file: string } {
    const cssAssetInfo = getCssAssetInfo(bundle, file);
    // throw error if css not found
    if (!cssAssetInfo) {
      throw new Error(`Failed to find CSS asset info for ${file}`);
    }
    return { file: cssAssetInfo.fileName };
  }

  /** get the output js files */
  protected parseOutputJs(
    file: string,
    result: Result<Manifest>,
    bundle: Rollup.OutputBundle,
  ): { fileName?: string; waFiles: Set<string> } | undefined {
    const { inputFile, publicFile } = getFileName(file, this.viteConfig);
    if (!inputFile) return;
    if (publicFile) return { waFiles: new Set([publicFile]) };

    const chunk = getScriptChunkInfo(bundle, inputFile);
    // throw error if script not found
    if (!chunk) {
      throw new Error(`Failed to find chunk info for ${inputFile}`);
    }

    const loader = getCsLoader(file, chunk);
    if (loader.source) {
      result.emitFiles.push({
        type: 'asset',
        fileName: loader.fileName,
        source: loader.source,
      });
    }

    const metadata = this.getMetadata(
      chunk.fileName,
      bundle,
      Boolean(loader.source),
    );
    /** gets all css output files of current script */
    chunk.code = chunk.code.replace(
      new RegExp('import.meta.CURRENT_CHUNK_CSS_PATHS', 'g'),
      `[${[...metadata.css].map((e) => JSON.stringify(e)).join(',')}]`,
    );
    return {
      fileName: loader.fileName,
      waFiles: new Set([...metadata.assets, ...metadata.css]),
    };
  }

  protected parseOutputWaScript(
    file: string,
    result: Result<Manifest>,
    bundle: Rollup.OutputBundle,
  ): { scriptFileName: string; webAccessibleFiles: Set<string> } {
    const chunkInfo = getScriptChunkInfo(bundle, file);
    console.log({ chunkInfo, file });
    // throw error if chunk not found
    if (!chunkInfo) {
      throw new Error(`Failed to find chunk info for ${file}`);
    }

    const loader = getWasLoader(file, chunkInfo);
    result.emitFiles.push({
      type: 'asset',
      fileName: loader.fileName,
      source: loader.source,
    });

    const metadata = this.getMetadata(
      chunkInfo.fileName,
      bundle,
      Boolean(loader.source),
    );

    chunkInfo.code = chunkInfo.code.replace(
      new RegExp('import.meta.CURRENT_CHUNK_CSS_PATHS', 'g'),
      `[${[...metadata.css].map((path) => `"${path}"`).join(',')}]`,
    );

    return {
      scriptFileName: loader.fileName,
      webAccessibleFiles: new Set([...metadata.assets, ...metadata.css]),
    };
  }

  protected pipe<T>(initialValue: T, ...fns: ((result: T) => T)[]): T {
    return fns.reduce(
      (previousValue, fn) => fn.call(this, previousValue),
      initialValue,
    );
  }

  private getMetadata(
    chunkId: string,
    bundle: Rollup.OutputBundle,
    includeAsAsset: boolean,
    metadata: { css: Set<string>; assets: Set<string> } | null = null,
  ): { css: Set<string>; assets: Set<string> } {
    // clear metadata
    if (metadata === null) {
      this.parseChunkIds.clear();
      metadata = {
        css: new Set<string>(),
        assets: new Set<string>(),
      };
    }

    // return metadata if already exists
    if (this.parseChunkIds.has(chunkId)) return metadata;

    // fetch metadata of current chunk
    const chunkInfo = getScriptChunkInfo(bundle, chunkId);
    if (!chunkInfo) return metadata;

    if (includeAsAsset) metadata.assets.add(chunkInfo.fileName);

    chunkInfo.viteMetadata!.importedCss.forEach(metadata.css.add, metadata.css);
    chunkInfo.viteMetadata!.importedAssets.forEach(
      metadata.assets.add,
      metadata.assets,
    );

    this.parseChunkIds.add(chunkId);

    // get metadata of imported assets imports
    chunkInfo.imports.forEach((chunkId) => {
      metadata = this.getMetadata(chunkId, bundle, true, metadata);
    });
    chunkInfo.dynamicImports.forEach((chunkId) => {
      metadata = this.getMetadata(chunkId, bundle, true, metadata);
    });

    return metadata;
  }

  private parseInputSw(result: Result<Manifest>): Result<Manifest> {
    // @ts-expect-error - Force support of event pages in manifest V3
    if (!result.manifest.background?.scripts) return result;

    const loader = getHtmlLoader(
      'background',
      // @ts-expect-error - Force support of event pages in manifest V3
      result.manifest.background.scripts.map((s) => s.replace(/^\.\//, '/')),
    );

    const file = loader.fileName;
    const { inputFile, outputFile } = getFileName(file, this.viteConfig, true);
    if (inputFile) {
      result.inputScripts.push([outputFile, inputFile]);
      setModule(inputFile, loader.source);
    }

    // @ts-expect-error - Force support of event pages in manifest V3
    delete result.manifest.background.scripts;
    // @ts-expect-error - Force support of event pages in manifest V3
    result.manifest.background.page = loader.fileName;

    return result;
  }
}
