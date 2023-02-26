import path from 'path'
import { createHash } from 'crypto'
import { normalizePath } from 'vite'

export function normalizeFileName(fileName: string, includeExt = true): string {
	let nPath = normalizePath(path.normalize(fileName))
	let { dir = '', name, ext } = path.parse(nPath)

	return `${dir}/${name}${includeExt ? ext : ''}`.replace(/^\/+/, '')
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
