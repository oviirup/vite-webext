import path from 'node:path';
import { sanitizeFileName } from './files';
import { createFilter } from 'vite';
import type { WebExtensionOptions } from '@/plugin.d';
import type * as Rollup from 'rollup';
import type * as Vite from 'vite';

/** Updates vite config with necessary settings */
export function updateConfig(
  config: Vite.UserConfig,
  pluginOptions: WebExtensionOptions,
): Vite.UserConfig {
  const { manifest, useHashedFileName } = pluginOptions;
  const version = manifest.manifest_version;
  config.build ??= {};

  // update the build target based on manifest version
  if (!config.build.target) {
    if (version === 2) config.build.target = ['chrome64', 'firefox89'];
    if (version === 3) config.build.target = ['chrome91'];
  }

  // define output directory
  config.build.outDir ??= path.resolve(process.cwd(), '.extension');
  let outDir = config.build.outDir;

  config.build.minify ??= true;
  config.build.emptyOutDir ??= true;
  config.build.modulePreload ??= false;
  config.build.rollupOptions ??= {};
  config.build.rollupOptions.input ??= {};

  config.optimizeDeps ??= {};
  config.optimizeDeps.exclude ??= [];
  config.optimizeDeps.exclude?.push('/@vite/client');
  config.build.rollupOptions.output ??= {};

  // enable support for hot-module-reload
  config.server ??= {};
  if (config.server.hmr === true || !config.server.hmr) config.server.hmr = {};
  config.server.hmr.protocol = 'ws';
  config.server.hmr.host = 'localhost';

  const outputConfig = config.build.rollupOptions.output;

  function rename(chunk: Rollup.PreRenderedAsset): string;
  function rename(chunk: Rollup.PreRenderedChunk): string;
  function rename(chunk: Rollup.PreRenderedChunk | Rollup.PreRenderedAsset) {
    const { name, type } = chunk;
    if (!name) return;
    let fileName = path.parse(name).name;
    return type === 'chunk'
      ? `assets/js/${fileName}.[hash:6].js`
      : `assets/[ext]/${fileName}.[hash:6].[ext]`;
  }
  // prettier-ignore
  if (useHashedFileName && !Array.isArray(outputConfig)) {
		outputConfig.assetFileNames ??=rename
		outputConfig.chunkFileNames ??=rename
		outputConfig.entryFileNames ??=rename
	}

  return config;
}

export function findChunk(
  manifest: Vite.Manifest,
  file: string,
): Vite.ManifestChunk | undefined {
  return manifest[sanitizeFileName(file).extended];
}

export function filterScripts(
  scriptFilterOption: WebExtensionOptions['webAccessibleScripts'],
): ReturnType<typeof createFilter> {
  return createFilter(
    scriptFilterOption?.include || /\.(([cem]?js|ts)|(s?[ca]ss))$/,
    scriptFilterOption?.exclude || '',
    scriptFilterOption?.options,
  );
}

const store = new Map<string, string>();
export function setModule(id: string, source: string) {
  store.set(id, source);
}
export function getModule(id: string): string | null {
  return store.get(id) ?? null;
}
