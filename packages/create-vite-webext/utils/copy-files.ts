/* eslint-disable import/no-extraneous-dependencies */
import fs from 'node:fs';
import path from 'node:path';
import { async as glob } from 'fast-glob';

export interface CopyOption {
	cwd?: string;
	rename?: (name: string) => string;
	transform?: (
		name: string,
		src: string,
		dest: string,
	) => Promise<string | undefined>;
	parents?: boolean;
}

/**
 * The `copyFiles` function copies files from a source directory to a destination
 * directory, with options for renaming, transforming, and creating parent
 * directories.
 * @param {string|string[]} source - glob pattern of files to copy
 * @param {string} dest - destination directory
 * @param {CopyOption}  options -
 *   - cwd - working directory
 *   - rename - rename the destination files
 *   - transform - render the code of the running files
 *   - parent - copy to parent folder
 * @returns
 */
export async function copyFiles(
	source: string | string[],
	dest: string,
	{
		cwd,
		rename = (name: string) => name,
		transform,
		parents = true,
	}: CopyOption = {},
) {
	source = typeof source === 'string' ? [source] : source;
	dest = cwd ? path.resolve(cwd, dest) : dest;

	if (source.length === 0 || !dest) {
		throw new TypeError('`src` and `dest` are required');
	}

	const globOptions = { cwd, dot: true, absolute: false, stats: false };
	const sourceFiles = await glob(source, globOptions);

	return Promise.all(
		sourceFiles.map(async (p) => {
			const dirname = path.dirname(p);
			const basename = rename(path.basename(p));

			const from = cwd ? path.resolve(cwd, p) : p;
			const to = parents
				? path.join(dest, dirname, basename)
				: path.join(dest, basename);

			/** Ensure the destination directory exists */
			await fs.promises.mkdir(path.dirname(to), { recursive: true });

			let fileData: string | undefined;
			if (typeof transform === 'function') {
				fileData = await transform(basename, from, to);
			}
			if (typeof fileData === 'string') {
				await fs.promises.writeFile(to, fileData, 'utf-8');
			} else {
				await fs.promises.copyFile(from, to);
			}
		}),
	);
}
