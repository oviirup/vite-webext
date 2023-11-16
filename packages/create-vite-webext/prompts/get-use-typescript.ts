import { blue, red } from 'picocolors';
import prompts from 'prompts';

/**
 * Checks if the project uses typescript or javascript from cli
 * @param opts Commander options
 */
export async function getUseTypescript(opts: Options): Promise<void> {
	let useJS = opts.javascript;
	let useTS = opts.typescript;

	if (useJS === undefined && useTS === undefined) {
		const res = await prompts(
			{
				type: 'toggle',
				name: 'typescript',
				message: `Would you like to use ${blue('typescript')}?`,
				initial: true,
				active: 'Yes',
				inactive: 'No',
			},
			{ onCancel: onCancelState },
		);

		opts.typescript = Boolean(res.typescript);
		opts.javascript = !Boolean(res.typescript);
	}

	if (opts.javascript) {
		opts.typescript = false;
	} else if (opts.typescript) {
		opts.javascript = false;
	}
}

/** Handler function to exit process tree on termination */
function onCancelState() {
	console.log(red('Exiting.'));
	process.exit(1);
}
