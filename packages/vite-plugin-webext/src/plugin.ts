import ManifestParserFactory from './parser';
import { appendInputScripts } from './utils/rollup';
import { contentScriptStyleHandler } from './utils/server';
import TransformCode from './utils/transform';
import { getModule, updateConfig } from './utils/vite';
import type ManifestParser from './parser/manifestParser';
import type { BuildMode, WebExtensionOptions } from '@/plugin.d';
import type * as Rollup from 'rollup';
import type * as Vite from 'vite';

export default function webExtension(
  pluginOptions: WebExtensionOptions,
): Vite.PluginOption {
  // assign defaults
  pluginOptions.useReactHMR ??= true;
  pluginOptions.useDynamicUrl ??= true;
  pluginOptions.useHashedFileName ??= true;

  if (!pluginOptions.manifest) {
    throw new Error('Missing manifest definition');
  }

  let mode: BuildMode = 'BUILD';
  let userConfig: Vite.ResolvedConfig;
  let emitQueue: Rollup.EmittedFile[] = [];
  let manifestParser:
    | ManifestParser<chrome.runtime.ManifestV2>
    | ManifestParser<chrome.runtime.ManifestV3>;

  return {
    name: 'webExtension',
    enforce: 'post', // required to revert vite asset self.location transform to import.meta.url

    config: (config, env) => {
      if (env.command === 'serve') mode = 'DEV';
      else if (config.build?.watch) mode = 'WATCH';
      return updateConfig(config, pluginOptions);
    },

    configResolved: (config) => {
      userConfig = config;
    },

    configureServer: (server) => {
      server.middlewares.use(contentScriptStyleHandler);
      server.httpServer!.once('listening', () => {
        manifestParser.setDevServer(server);
        manifestParser.writeDevBuild(server.config.server.port!);
      });
    },

    async options(options) {
      manifestParser = ManifestParserFactory.getParser(
        pluginOptions,
        userConfig,
      );
      const { inputScripts, emitFiles } = await manifestParser.parseInput();
      options.input = appendInputScripts(inputScripts, options.input);
      emitQueue = emitQueue.concat(emitFiles);
      return options;
    },

    buildStart: function () {
      emitQueue.forEach((file) => {
        this.emitFile(file);
        if (file.fileName) this.addWatchFile(file.fileName);
      });
      emitQueue = [];
    },

    load: getModule,

    resolveId: (id) => (getModule(id) ? id : null),

    transform: (code, id) => {
      return new TransformCode(code, id)
        .convertImports()
        .enableReactHMR(pluginOptions, mode)
        .run(userConfig);
    },

    generateBundle: async function (_, bundle) {
      const { emitFiles } = await manifestParser.parseOutput(bundle);
      emitFiles.forEach(this.emitFile);
    },
  };
}
