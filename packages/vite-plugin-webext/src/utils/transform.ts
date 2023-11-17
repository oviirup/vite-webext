import MagicString, { SourceMap } from 'magic-string';
import type { BuildMode, WebExtensionOptions } from '@/plugin.d';
import type * as Vite from 'vite';

function transformSelfImports(code: string): MagicString | null {
  let hasUrlInit = code.includes('new URL');
  let hasSelfLoc = code.includes(`self.location`);
  if (!hasUrlInit || !hasSelfLoc) return null;

  let updatedCode: MagicString | null = null;
  // prettier-ignore
  let regex = /\bnew\s+URL\s*\(\s*('[^']+'|"[^"]+"|`[^`]+`)\s*,\s*self\.location\s*\)/g

  let match: RegExpExecArray | null;
  while ((match = regex.exec(code))) {
    const { 0: exp, index } = match;
    if (!updatedCode) updatedCode = new MagicString(code);
    let start = index;
    let end = index + exp.length;
    let replacer = exp.replace('self.location', 'import.meta.url');
    updatedCode.overwrite(start, end, replacer);
  }

  return updatedCode;
}

function transformReactHMR(code: string, file: string): MagicString | null {
  let isJSX = file?.endsWith('tsx') || file?.endsWith('jsx');
  let hasReactRefresh = code?.includes('RefreshRuntime from "/@react-refresh"');
  if (!code || (!isJSX && !hasReactRefresh)) return null;

  let reactHmrCode = `try {
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
  } catch {}`;

  code = reactHmrCode + code;
  return new MagicString(code);
}

export default class TransformCode {
  file: string;
  code: string;
  updatedCode: MagicString | null = null;
  map: SourceMap | null;

  constructor(code: string, id: string) {
    this.code = code;
    this.file = id?.toLowerCase();
    this.map = null;
  }

  convertImports() {
    this.updatedCode = transformSelfImports(this.code);
    return this;
  }

  enableReactHMR(options: WebExtensionOptions, mode: BuildMode) {
    if (mode === 'DEV' && options.useDynamicUrl)
      this.updatedCode = transformReactHMR(this.code, this.file);
    return this;
  }

  run(userConfig: Vite.ResolvedConfig) {
    if (!this.updatedCode) return null;
    let sourceMap = userConfig.build.sourcemap;
    return {
      code: this.updatedCode.toString(),
      map: sourceMap ? this.updatedCode.generateMap({ hires: true }) : null,
    };
  }
}
