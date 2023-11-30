import { blue, red } from 'picocolors';
import prompts from 'prompts';

/**
 * Checks if the project uses typescript or javascript from cli
 * @param opts Commander options
 */
export async function getUseTailwind(opts: Options): Promise<void> {
  let useTailwind = opts.tailwind;

  if (useTailwind === undefined) {
    const res = await prompts(
      {
        type: 'toggle',
        name: 'tailwind',
        message: `Would you like to use ${blue('Tailwind CSS')}?`,
        initial: true,
        active: 'Yes',
        inactive: 'No',
      },
      { onCancel: onCancelState },
    );

    opts.tailwind = Boolean(res.tailwind);
  }
}

/** Handler function to exit process tree on termination */
function onCancelState() {
  console.log(red('Exiting.'));
  process.exit(1);
}
