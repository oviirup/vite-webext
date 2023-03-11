import { getHash } from '@/utils/files'
import { OutputChunk } from 'rollup'

type FileLoader = {
	fileName: string
	source: string
}
type FileLoaderPartial = {
	fileName: string
	source?: string
}

/** loader for scripts in html form */
export function getHtmlLoader(
	fileName: string,
	sourceFiles: string[],
): FileLoader {
	const scripts = sourceFiles
		.map((src) => `<script type="module" src="${src}"></script>`)
		.join('')

	return {
		fileName: `${fileName}.html`,
		source: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />${scripts}</head></html>`,
	}
}

/** loader for any scripts */
export function getScriptLoader(
	inputFile: string,
	outputFile: string,
): FileLoader {
	const hash = getHash(inputFile)

	const importPath = outputFile.startsWith('http')
		? `'${outputFile}'`
		: `(chrome??browser).runtime.getURL("${outputFile}")`

	return {
		fileName: `script-${hash}.js`,
		source: `(async()=>{await import(${importPath})})();`,
	}
}

/** loader for service worker (MV3) */
export function getSwLoader(file: string): FileLoader {
	const importPath = file.startsWith('http') ? `${file}` : `/${file}`
	return {
		fileName: `service-worker.js`,
		source: `import "${importPath}";`,
	}
}

/** loader for all content scripts */
export function getCsLoader(
	fileName: string,
	chunk: OutputChunk,
): FileLoaderPartial {
	if (!chunk.imports.length && !chunk.dynamicImports.length) {
		return { fileName: chunk.fileName }
	}

	return getScriptLoader(fileName, chunk.fileName)
}

/** loader for web accessible scripts */
export function getWasLoader(
	fileName: string,
	chunk: OutputChunk,
): FileLoaderPartial {
	if (!chunk.imports.length && !chunk.dynamicImports.length) {
		return {
			fileName: fileName,
			source: chunk.code,
		}
	}

	return getScriptLoader(fileName, chunk.fileName)
}
