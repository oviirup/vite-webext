import path from 'node:path';
import { isFolderEmpty } from '@/utils/is-folder-empty';
import { cyan, green, red } from 'picocolors';
import prompts from 'prompts';
import validateName from 'validate-npm-package-name';
import type { Command } from 'commander';

/**
 * Gets the project name and path from the cli args.
 * If no args is passed creates cli prompt to input project name
 * @param program commander program
 * @param opts commander options
 */
export async function getProjectInfo(program: Command, opts: Options) {
  let programName = program.name();
  let projectPath = program.args[0];
  let projectName = '';

  if (!projectPath) {
    // prompt to get the project path
    const res = await prompts({
      onState: onPromptState,
      type: 'text',
      name: 'path',
      message: 'What is your project named?',
      initial: 'web-extension',
      validate: (name) => {
        const validation = validateProjectName(name);
        return validation.valid
          ? true
          : `Invalid project name: ${validation.error![0]}`;
      },
    });
    if (typeof res.path === 'string') {
      projectPath = res.path.trim();
    }
  }

  if (!projectPath) {
    console.log(
      `\nPlease specify the project directory:`,
      `\n  ${cyan(programName)} ${green('<project-directory>')}`,
      `\nFor example:`,
      `\n  ${cyan(programName)} ${green('web-extension')}`,
      `\nRun ${cyan(`${programName} --help`)} to see all options.`,
    );
    process.exit(1);
  }

  projectPath = path.resolve(projectPath);
  projectName = path.basename(projectPath);

  const validation = validateProjectName(projectName);
  if (!validation.valid) {
    console.log(`  Project can not be named ${red(projectName)} because:`);
    validation.error.forEach((p) => console.log(`    ${red(`* ${p}`)}`));
    process.exit(1);
  }

  if (!isFolderEmpty(projectPath)) {
    process.exit(1);
  }

  const project = { name: projectName, path: projectPath };
  opts.project = project;
  return project;
}

/** checks if the project name complies with newer npm rules */
export function validateProjectName(name: string) {
  const test = validateName(name);
  return {
    valid: test.validForNewPackages,
    error: [...(test.errors || []), ...(test.warnings || [])],
  };
}

/* Handler function to make the cursor visible after each prompt input */
export function onPromptState(state: any) {
  if (state.aborted) {
    process.stdout.write('\x1B[?25h\n\n');
    process.exit(1);
  }
}
