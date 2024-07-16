import { PromptOptions } from '@/types';
import pi from 'picocolors';

/**
 * Checks if the project uses typescript or javascript from cli
 *
 * @param opt Commander options
 */
export async function useTypescript({ opt, prompts }: PromptOptions) {
  let useJS = opt.javascript;
  let useTS = opt.typescript;

  if (useJS === undefined && useTS === undefined) {
    const res = await prompts<'typescript'>({
      type: 'toggle',
      name: 'typescript',
      message: `Would you like to use ${pi.blue('TypeScript')}:`,
      initial: true,
      active: 'Yes',
      inactive: 'No',
    });

    opt.typescript = Boolean(res.typescript);
    opt.javascript = !Boolean(res.typescript);
  }

  if (opt.javascript) {
    opt.typescript = false;
  } else if (opt.typescript) {
    opt.javascript = false;
  }
}
