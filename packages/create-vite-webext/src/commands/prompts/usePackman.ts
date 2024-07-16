import { getPackman } from '@/utils';
import pi from 'picocolors';
import type { PromptOptions } from '@/types';

/**
 * Specifies which package manager to use
 *
 * @param opts Commander options
 */
export async function usePackman({ opt, prompts }: PromptOptions) {
  const packman = await getPackman();

  if (!opt.packman || !packman.available(opt.packman)) {
    if (opt.packman) {
      console.log(`${pi.red('!')} Selected package manager is not available`);
    }
    const res = await prompts({
      type: 'select',
      name: 'packman',
      message: `Select a ${pi.blue('package manager')} to use:`,
      choices: packman.list.map((pm) => ({
        title: pm.name,
        value: pm.name,
        description: pm.version,
        disabled: !pm.version,
      })),
      initial: packman.list.findIndex((pm) => pm.name === packman.current),
    });
    opt.packman = res.packman;
  }
}
