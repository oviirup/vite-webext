import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { normalizePath } from 'vite';
import type * as Vite from 'vite';

export function sanitize(...filePaths: string[]) {
	let filePath = filePaths.join('/');
	let nPath = normalizePath(path.normalize(filePath));
	let { dir = '', name, ext } = path.parse(nPath);
	let fileName = `${dir}/${name}`.replace(/^\/+/, '');
	return {
		name: fileName,
		path: fileName + ext,
	};
}

/** returns the path only if it exists */
export function validatePath(filePath: string | undefined, noCheck = false) {
	if (!filePath) return;
	if (noCheck) return filePath;
	if (existsSync(filePath)) return filePath;
	return;
}

/** checks is the file is in public or source */
export function getFileName(
	fileName: string,
	config?: Vite.ResolvedConfig,
	noCheck: boolean = false,
) {
	fileName = normalizePath(fileName);
	const outputPath = sanitize(fileName).name;

	// probable file path in root and public folder
	const file = {
		S: config?.root && sanitize(config.root, fileName).path,
		P: config?.publicDir && sanitize(config.publicDir, fileName).path,
	};
	return {
		inputFile: validatePath(file.S, noCheck),
		publicFile: validatePath(file.P, noCheck),
		outputFile: outputPath,
	};
}

export function isHTML(file: string): boolean {
	return /[^*]+.html$/.test(file);
}

export function hashFileName(file: string, format: string): string {
	let { name, ext } = path.parse(file);
	const hash = getHash(file);

	const filePath = format
		.replace(/\[ext\]/g, ext.substring(1))
		.replace(/\[name\]/g, name)
		.replace(/\[hash\]/g, hash);

	return filePath;
}

export function getHash(text: string, length = 8) {
	return createHash('sha256').update(text).digest('hex').substring(0, length);
}
