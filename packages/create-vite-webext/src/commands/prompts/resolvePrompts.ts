import { usePackman } from './usePackman';
import { useProject } from './useProject';
import { useTailwind } from './useTailwind';
import { useTemplate } from './useTemplate';
import { useTypescript } from './useTypescript';
import pi from 'picocolors';
import prompts, { PromptObject } from 'prompts';
import type { CLIArgs, PromptOptions, TemplateArgs } from '@/types';
import type { Command } from 'commander';

export async function resolvePrompts(options: CLIArgs, program: Command) {
  // exit cli on cancel current step
  const onCancel = () => {
    console.log(pi.red('× Exiting ...\n'));
    process.exit(1);
  };
  // prompt config options
  const promptConfig: PromptOptions = {
    opt: options,
    program,
    prompts: (query) => prompts(query, { onCancel }),
  };

  await usePackman(promptConfig);
  await useProject(promptConfig);
  await useTailwind(promptConfig);
  await useTypescript(promptConfig);
  await useTemplate(promptConfig);

  return structuredClone(options) as TemplateArgs;
}
