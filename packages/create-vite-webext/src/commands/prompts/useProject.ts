import path from 'node:path';
import { DEFAULT_NAME } from '@/constants';
import { isFolderEmpty, validateProjectName } from '@/utils';
import pi from 'picocolors';
import type { PromptOptions } from '@/types';

/**
 * Gets the project name and path from the cli args.
 *
 * @param opt Commander options
 * @param program Commander program
 */
export async function useProject({ opt, program, prompts }: PromptOptions) {
  let programName = program.name();
  let projectPath = program.args[0];

  if (!projectPath) {
    const res = await prompts({
      type: 'text',
      name: 'path',
      message: 'What is your project name:',
      initial: DEFAULT_NAME,
      validate: (name: string) => {
        const dir = path.resolve(name ?? DEFAULT_NAME);
        const v = validateProjectName(path.basename(dir));
        const isEmpty = isFolderEmpty(dir);
        if (!v.valid) {
          return `Invalid project name: ${v.error![0]}`;
        } else if (!isEmpty) {
          return `Selected path is not empty. Enter a new project name or clear out the directory`;
        } else {
          return true;
        }
      },
    });
    projectPath = res.path;
  }

  if (!projectPath) {
    console.log(
      `\n${pi.red('!')} Please specify the project directory:`,
      `\n  ${pi.cyan(programName)} ${pi.green('<project-directory>')}`,
    );
    process.exit(1);
  }

  projectPath = path.resolve(projectPath);
  let projectName = path.basename(projectPath);

  opt.project = {
    path: projectPath,
    name: projectName,
  };
}
