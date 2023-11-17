import fs from 'node:fs';
import path from 'node:path';
import { isWriteable } from '@/utils/is-writable';
import { blue, red } from 'picocolors';
import prompts, { Choice } from 'prompts';

/**
 * Generates the template from given options
 * @param opts commander options
 */
export async function getTemplate(opts: Options): Promise<void> {
  let template = opts.template;
  const frameworks = getFrameworkList();

  const isDirWritable = await isWriteable(path.dirname(opts.project.path));
  if (!isDirWritable) {
    console.error(
      '\nThe application path is not writable, please check folder permissions and try again.',
      '\nIt is likely you do not have write permissions for this folder.',
    );
    process.exit(1);
  }

  if (!template && frameworks.length === 1) {
    template = frameworks[0];
    opts.template = frameworks[0];
  } else {
    const reactIndex = frameworks.findIndex((e) => e === 'react') ?? 0;
    const res = await prompts(
      {
        type: 'select',
        name: 'template',
        message: `Select a ${blue('framework')}`,
        initial: reactIndex,
        choices: frameworks.reduce((acc: Choice[], value) => {
          acc.push({ title: value, value });
          console.log(acc);
          return acc;
        }, []),
      },
      { onCancel: onCancelState },
    );
    template = res.template;
    opts.template = res.template;
  }

  if (!template || !frameworks.includes(template)) {
    console.error(
      `Template ${red(template)} is not valid, please select a valid one`,
    );
    process.exit(1);
  }
}

export function getFrameworkList() {
  const root = path.resolve(__dirname, '../template');
  const ls = fs.readdirSync(path.join(root, 'framework'));
  return ls.filter((e) => !e.endsWith('-ts'));
}

/** Handler function to exit process tree on termination */
function onCancelState() {
  console.log(red('Exiting.'));
  process.exit(1);
}
