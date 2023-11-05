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

			// Ensure the destination directory exists
			await fs.promises.mkdir(path.dirname(to), { recursive: true });

			if (typeof transform === 'function') {
				const res = await transform(basename, from, to);
				if (typeof res === 'string') {
				} else {
					await fs.promises.copyFile(from, to);
				}
			} else {
				await fs.promises.copyFile(from, to);
			}
		}),
	);
}
