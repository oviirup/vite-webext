import ManifestParser from './manifestParser';
import ManifestV2 from './manifestV2';
import ManifestV3 from './manifestV3';
import type { WebExtensionOptions } from '@/plugin.d';
import type * as Vite from 'vite';

export default class ManifestParserFactory {
  static getParser(
    options: WebExtensionOptions,
    userConfig: Vite.ResolvedConfig,
  ):
    | ManifestParser<chrome.runtime.ManifestV2>
    | ManifestParser<chrome.runtime.ManifestV3> {
    switch (options.manifest.manifest_version) {
      case 2:
        return new ManifestV2(options, userConfig);
      case 3:
        return new ManifestV3(options, userConfig);
      default:
        throw new Error(
          `No parser available for manifest_version ${
            // @ts-expect-error - Allow showing manifest version for invalid usage
            manifest.manifest_version ?? 0
          }`,
        );
    }
  }
}
