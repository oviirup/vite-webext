import ManifestParser, { Result } from './manifestParser';
import DevBuilder from '@/builder';
import DevBuilderV2 from '@/builder/manifestV2';
import { getFileName, isHTML } from '@/utils/files';
import type * as Rollup from 'rollup';

type Manifest = chrome.runtime.ManifestV2;
type ManifestParseResult = Result<Manifest>;

export default class ManifestV2 extends ManifestParser<Manifest> {
  protected createDevBuilder(): DevBuilder<Manifest> {
    return new DevBuilderV2(
      this.viteConfig,
      this.options,
      this.devServer,
      this.inputManifest,
    );
  }

  /** get all html files from manifest */
  protected getHtmlFiles(manifest: Manifest): string[] {
    const htmlFiles = [
      manifest.background?.page,
      manifest.browser_action?.default_popup,
      manifest.options_ui?.page,
      manifest.devtools_page,
      manifest.chrome_url_overrides?.newtab,
      manifest.chrome_url_overrides?.history,
      manifest.chrome_url_overrides?.bookmarks,
    ];

    manifest.web_accessible_resources?.filter(isHTML).forEach((html) => {
      htmlFiles.push(html);
    });

    return htmlFiles.filter((file): file is string => typeof file === 'string');
  }

  /** gets available input methods */
  protected getParseInputMethods(): ((
    result: ManifestParseResult,
  ) => ManifestParseResult)[] {
    return [];
  }

  /** gets available parser output methods */
  protected getParseOutputMethods(): ((
    result: ManifestParseResult,
  ) => Promise<ManifestParseResult>)[] {
    return [this.parseWatchMode.bind(this)];
  }

  /** parse input web-accessible-resources */
  protected parseInputWas(result: Result<Manifest>): Result<Manifest> {
    result.manifest.web_accessible_resources?.forEach((resource) => {
      if (resource.includes('*')) return;

      const { inputFile, outputFile } = getFileName(resource, this.viteConfig);
      if (inputFile && this.WasFilter(inputFile)) {
        result.inputScripts.push([outputFile, inputFile]);
      }
    });

    return result;
  }

  /** parse content script for output */
  protected async parseOutputCs(
    result: ManifestParseResult,
    bundle: Rollup.OutputBundle,
  ): Promise<ManifestParseResult> {
    const waResources = new Set<string>(
      result.manifest.web_accessible_resources ?? [],
    );

    result.manifest.content_scripts?.forEach((script) => {
      // loop through content-script js
      script.js?.forEach((scriptFileName, i) => {
        const parsedScript = this.parseOutputJs(scriptFileName, result, bundle);
        if (parsedScript?.fileName) script.js![i] = parsedScript.fileName;
        // add to web-accessible-resource
        parsedScript?.waFiles.forEach(waResources.add, waResources);
      });
      // loop through content-script css
      script.css?.forEach((cssFileName, i) => {
        const parsedCss = this.parseOutputCss(cssFileName, bundle);
        script.css![i] = parsedCss.file;
        // add to web-accessible-resource
        waResources.add(parsedCss.file);
      });
    });

    if (waResources.size > 0) {
      result.manifest.web_accessible_resources = Array.from(waResources);
    }

    return result;
  }

  /** parse output web-accessible-resource */
  protected async parseOutputWas(
    result: ManifestParseResult,
    bundle: Rollup.OutputBundle,
  ): Promise<ManifestParseResult> {
    if (!result.manifest.web_accessible_resources) return result;

    for (const resource of result.manifest.web_accessible_resources) {
      // do not run parser for wild cards or filters
      if (resource.includes('*') || !this.WasFilter(resource)) continue;

      const parsedScript = this.parseOutputWaScript(resource, result, bundle);

      result.manifest.web_accessible_resources = [
        ...result.manifest.web_accessible_resources,
        ...parsedScript.webAccessibleFiles,
      ];
    }

    return result;
  }

  protected async parseWatchMode(
    result: ManifestParseResult,
  ): Promise<ManifestParseResult> {
    if (!result.manifest.web_accessible_resources) {
      return result;
    }

    if (
      result.manifest.web_accessible_resources.length > 0 &&
      this.viteConfig.build.watch
    ) {
      // expose all files in watch mode to allow web-ext reloading to work when manifest changes are not applied on reload (eg. Firefox)
      result.manifest.web_accessible_resources.push('*.js');
    }

    return result;
  }
}
