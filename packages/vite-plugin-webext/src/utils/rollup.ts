import { sanitize } from './files';
import type * as Rollup from 'rollup';

export function appendInputScripts(
	inputScripts: [string, string][],
	optionsInput: Rollup.InputOptions['input'],
): { [entryAlias: string]: string } {
	const optionsInputObject = parseOptionsInput(optionsInput);

	inputScripts.forEach(
		([output, input]) => (optionsInputObject[output] = input),
	);

	return optionsInputObject;
}

/** parse input options as object */
function parseOptionsInput(input: Rollup.InputOptions['input']): {
	[entryAlias: string]: string;
} {
	if (typeof input === 'string') {
		if (!input.trim()) return {};
		return { [input]: input };
	} else if (input instanceof Array) {
		if (!input.length) return {};

		const inputObject: { [entryAlias: string]: string } = {};
		input.forEach((input) => (inputObject[input] = input));
		return inputObject;
	}

	return input ?? {};
}

/** fetches all script file info from build output */
export function getScriptChunkInfo(
	bundle: Rollup.OutputBundle,
	chunkId: string,
): Rollup.OutputChunk | undefined {
	const file = sanitize(chunkId).path;

	return Object.values(bundle).find((chunk) => {
		if (chunk.type === 'asset') return false;
		return (
			chunk.facadeModuleId?.endsWith(file) || chunk.fileName.endsWith(file)
		);
	}) as Rollup.OutputChunk | undefined;
}

/** fetches all css/sass file info from build output */
export function getCssAssetInfo(
	bundle: Rollup.OutputBundle,
	assetFileName: string,
): Rollup.OutputAsset | undefined {
	let fileName = sanitize(assetFileName).name + '.css';

	return Object.values(bundle).find((chunk) => {
		if (chunk.type === 'chunk') return;
		const chunkName = chunk.name ?? chunk.fileName;
		if (!/\.(s?[ca]ss)$/.test(chunkName)) return false;
		return fileName.endsWith(chunk.name ?? chunk.fileName);
	}) as Rollup.OutputAsset | undefined;
}
