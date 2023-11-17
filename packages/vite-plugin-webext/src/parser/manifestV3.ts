import ManifestParser, { Result } from './manifestParser';
import DevBuilder from '@/builder';
import DevBuilderV3 from '@/builder/manifestV3';
import { getFileName, isHTML } from '@/utils/files';
import { getSwLoader } from '@/utils/loader';
import { getScriptChunkInfo } from '@/utils/rollup';
import type * as Rollup from 'rollup';

export default class ManifestV3 extends ManifestParser<Manifest> {
  protected createDevBuilder(): DevBuilder<Manifest> {
    return new DevBuilderV3(
      this.viteConfig,
      this.options,
      this.devServer,
      this.inputManifest,
    );
  }

  /** get all html files from */
  protected getHtmlFiles(manifest: Manifest): string[] {
    const htmlFiles = [
      manifest.action?.default_popup,
      manifest.options_ui?.page,
      manifest.devtools_page,
      manifest.chrome_url_overrides?.newtab,
      manifest.chrome_url_overrides?.history,
      manifest.chrome_url_overrides?.bookmarks,
    ];

    manifest.web_accessible_resources?.forEach(({ resources }) => {
      resources.filter(isHTML).forEach((html) => htmlFiles.push(html));
    });

    return htmlFiles.filter((file): file is string => typeof file === 'string');
  }

  /** gets available parser input methods */
  protected getParseInputMethods(): ((result: ParseResult) => ParseResult)[] {
    return [this.parseInputBackground];
  }

  /** gets available parser output methods */
  protected getParseOutputMethods(): ((
    result: ParseResult,
    bundle: Rollup.OutputBundle,
  ) => Promise<ParseResult>)[] {
    return [this.parseOutputSw];
  }

  /** gets available parser output methods */
  protected parseInputBackground(result: ParseResult): ParseResult {
    if (!result.manifest.background?.service_worker) return result;

    const swScript = result.manifest.background?.service_worker;

    const { inputFile, outputFile } = getFileName(swScript, this.viteConfig);
    if (inputFile) {
      result.inputScripts.push([outputFile, inputFile]);
      result.manifest.background.type = 'module';
    }

    return result;
  }

  /** parse input web-accessible-resources */
  protected parseInputWas(result: Result<Manifest>): Result<Manifest> {
    result.manifest.web_accessible_resources?.forEach((struct) => {
      struct.resources.forEach((resource) => {
        if (resource.includes('*')) return;

        const { inputFile, outputFile } = getFileName(
          resource,
          this.viteConfig,
        );

        if (inputFile && this.WasFilter(inputFile)) {
          result.inputScripts.push([outputFile, inputFile]);
        }
      });
    });

    return result;
  }

  /** parse content script for output */
  protected async parseOutputCs(
    result: ParseResult,
    bundle: Rollup.OutputBundle,
  ): Promise<ParseResult> {
    const waResources = new Set<WAResources>(
      result.manifest.web_accessible_resources ?? [],
    );

    result.manifest.content_scripts?.forEach((script) => {
      const resources = new Set<string>([]);
      // loop through content-script js
      script.js?.forEach((scriptFileName, i) => {
        const parsedScript = this.parseOutputJs(scriptFileName, result, bundle);
        if (parsedScript?.fileName) script.js![i] = parsedScript.fileName;
        // add to web-accessible-resource
        parsedScript?.waFiles.forEach(resources.add, resources);
      });
      // loop through content-script css
      script.css?.forEach((cssFileName, i) => {
        const parsedCss = this.parseOutputCss(cssFileName, bundle);
        script.css![i] = parsedCss.file;
        // add to web-accessible-resource
        resources.add(parsedCss.file);
      });

      if (resources.size > 0) {
        waResources.add({
          matches: script.matches!.map((pattern) => {
            const pathMatch = /[^:\/]\//.exec(pattern);
            if (!pathMatch) return pattern;
            const path = pattern.slice(pathMatch.index + 1);
            if (['/', '/*'].includes(path)) return pattern;
            return pattern.replace(path, '/*');
          }),
          resources: Array.from(resources),
          // @ts-ignore
          use_dynamic_url: this.options.useDynamicUrl || undefined,
        });
      }
    });

    if (waResources.size > 0) {
      result.manifest.web_accessible_resources = Array.from(waResources);
    }

    return result;
  }

  /** parse output web-accessible-resource */
  protected async parseOutputWas(
    result: ParseResult,
    bundle: Rollup.OutputBundle,
  ): Promise<ParseResult> {
    if (!result.manifest.web_accessible_resources) return result;

    for (const resource of result.manifest.web_accessible_resources) {
      if (!resource.resources) continue;
      for (const fileName of resource.resources) {
        // do not run parser for wild cards or filters
        if (fileName.includes('*') || !this.WasFilter(fileName)) continue;

        const parsedScript = this.parseOutputWaScript(fileName, result, bundle);

        if (parsedScript.webAccessibleFiles.size) {
          resource.resources = [
            ...resource.resources,
            ...parsedScript.webAccessibleFiles,
          ];
        }
      }
    }

    return result;
  }

  /** parse output background service-worker */
  protected async parseOutputSw(
    result: ParseResult,
    bundle: Rollup.OutputBundle,
  ): Promise<ParseResult> {
    const swFile = result.manifest.background?.service_worker;
    if (!swFile) return result;

    const chunkInfo = getScriptChunkInfo(bundle, swFile);
    if (!chunkInfo) {
      throw new Error(`Failed to find chunk info for ${swFile}`);
    }

    const loader = getSwLoader(chunkInfo.fileName);
    result.manifest.background!.service_worker = loader.fileName;

    result.emitFiles.push({
      type: 'asset',
      fileName: loader.fileName,
      source: loader.source,
    });

    return result;
  }
}

type WAResources = Exclude<
  chrome.runtime.ManifestV3['web_accessible_resources'],
  undefined
>[number];

type Manifest = chrome.runtime.ManifestV3;
type ParseResult = Result<Manifest>;
