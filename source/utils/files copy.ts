import path from 'path'
import { existsSync } from 'fs-extra'
import { createHash } from 'crypto'
import { normalizePath } from 'vite'

export function parsePath(...filePaths: string[]) {
	let filePath = filePaths.join('/')
	let nPath = normalizePath(path.normalize(filePath))
	let { dir = '', name, ext } = path.parse(nPath)
	let fileName = `${dir}/${name}`.replace(/^\/+/, '')
	return {
		name: fileName,
		path: fileName + ext,
	}
}

export function normalizeFileName(...filePaths: string[]) {
	let filePath = filePaths.join('/')
	let nPath = normalizePath(path.normalize(filePath))
	let { dir = '', name, ext } = path.parse(nPath)
	return `${dir}/${name}${ext}`.replace(/^\/+/, '')
}

/** gets the absolute path or relative path */
export function getFileName(fileName: string, root?: string) {
	let nPath = normalizePath(path.normalize(fileName))
	let { dir = '', name, ext } = path.parse(nPath)

	// output: someLocation/path/fileName.ext
	const output = `${dir}/${name}`.replace(/^\/+/, '')
	// input: c:/projects/private/repo-name/source/script.ts
	const input = `${root}/${output}${ext}`

	return root ? input : output
}

/** checks is the file is in public or source */
export function getFileRoot(fileName: string, config?: Vite.ResolvedConfig) {
	fileName = normalizePath(fileName)
	const outputPath = parsePath(fileName).name

	const file = {
		source: config?.root && parsePath(config.root, fileName).path,
		public: config?.publicDir && parsePath(config.publicDir, fileName).path,
	}

	return {
		source: file.source && existsSync(file.source) ? file.source : undefined,
		public: file.public && existsSync(file.public) ? file.source : undefined,
		output: outputPath,
	}
}

export function isHTML(file: string): boolean {
	return /[^*]+.html$/.test(file)
}

export function hashFileName(file: string, format: string): string {
	let { name, ext } = path.parse(file)
	const hash = getHash(file)

	const filePath = format
		.replace(/\[ext\]/g, ext.substring(1))
		.replace(/\[name\]/g, name)
		.replace(/\[hash\]/g, hash)

	return filePath
}

export function getHash(text: string) {
	return createHash('sha256').update(text).digest('hex').substring(0, 8)
}
