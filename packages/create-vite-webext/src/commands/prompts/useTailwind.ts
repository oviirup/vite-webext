import pi from 'picocolors';
import type { PromptOptions } from '@/types';

/**
 * Checks if the project uses tailwind from cli
 * @param opt Commander options
 */
export async function useTailwind({ opt, prompts }: PromptOptions) {
  if (typeof opt.tailwind === 'undefined') {
    const res = await prompts({
      type: 'toggle',
      name: 'tailwind',
      message: `Would you like to use ${pi.blue('Tailwind CSS')}?`,
      initial: true,
      active: 'Yes',
      inactive: 'No',
    });
    opt.tailwind = Boolean(res.tailwind);
  }
}
