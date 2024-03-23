import { resolvePrompts } from './prompts/resolvePrompts';
import { renderTemplate } from './render/renderTemplate';
import pi from 'picocolors';
import type { CLIArgs } from '@/types';
import type { Command } from 'commander';

export async function create(
  init: string | undefined,
  opt: CLIArgs,
  program: Command,
) {
  let programName = program.name();

  // log out the program name
  console.log(pi.bold(pi.cyan(programName.replace(/-/g, ' ').toUpperCase())));
  console.log(`${pi.dim(program.description())}\n`);

  const config = await resolvePrompts(opt, program);
  await renderTemplate(config);
}
