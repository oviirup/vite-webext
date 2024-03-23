#!/usr/bin/env node
import { CLI_DESC, CLI_NAME, CLI_VERSION } from './constants';
import { create } from '@/commands';
import { Command } from 'commander';
import pi from 'picocolors';

// exit process on termination
['SIGINT', 'SIGTERM', 'SIGQUIT', 'SIGKILL'].forEach((signal) =>
  process.on(signal, () => {
    console.log(pi.red('Exiting'));
    process.stdout.write('\x1B[?25h');
    process.exit();
  }),
);

// parse the cli commands and arguments
const creteWebextCLI = new Command(CLI_NAME)
  .description(CLI_DESC)
  .arguments('[project-directory]')
  .usage(`${pi.green('<project-name>')} [options]`)
  .option(
    '--ts, --typescript',
    'Initialize as a TypeScript project. Explicitly tell the CLI to use Typescript version of the templates',
  )
  .option(
    '--js, --javascript',
    'Initialize as a TypeScript project. Explicitly tell the CLI to use Typescript version of the templates',
  )
  .option(
    '--fw, --framework [name]',
    'Bootstrap your project with pre-templated frameworks',
  )
  .option(
    '--tailwind',
    'Create the project with tailwindcss, postcss and sass integration',
  )
  .option(
    '--skip-install',
    'Do not run a package manager install after creating the project',
    false,
  )
  .option(
    '-p, --packman <package-manager>',
    'Specify the package manager to use',
  )
  .version(CLI_VERSION, '-v, --version', 'Output the current version')
  .helpOption('-h, --help', 'Display help for command')
  .allowUnknownOption()
  .parse(process.argv)
  .action(create);

creteWebextCLI.parseAsync().catch(async (reason) => {
  console.log(`Aborting installation.`);
  if (reason.command) {
    console.log(`  ${pi.cyan(reason.command)} has failed.`);
  } else {
    console.log(`${pi.red('Unexpected error. Please report it as a bug:')}`);
    console.log(`  ${reason}`);
  }
  process.exit(1);
});
