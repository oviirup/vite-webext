import path from 'node:path';
import { getFrameworks, isWriteable } from '@/utils';
import pi from 'picocolors';
import type { PromptOptions } from '@/types';

/**
 * Generates the template from given options
 * @param opt commander options
 */
export async function useTemplate({ opt, prompts }: PromptOptions) {
  let framework = opt.framework;
  const fw = getFrameworks();

  const isDirWritable = await isWriteable(path.dirname(opt.project.path));
  if (!isDirWritable) {
    console.log(
      '\nThe application path is not writable, please check folder permissions and try again.',
      '\nIt is likely you do not have write permissions for this folder.',
    );
    process.exit(1);
  }

  if (!framework || !fw.includes(framework)) {
    if (framework && !fw.includes(framework)) {
      console.log(`${pi.red('!')} Template "${framework}" is not valid`);
    }
    if (fw.list.length > 1) {
      const res = await prompts({
        type: 'select',
        name: 'framework',
        message: `Select a ${pi.blue('Framework')}`,
        initial: fw.list.findIndex((e) => e === 'react') ?? 0,
        choices: fw.list.map((value) => ({
          title: value,
          value,
        })),
      });
      framework = res.framework;
      console.log({ framework });
    } else {
      framework = fw.list[0];
    }
    opt.framework = framework;
  }
}
