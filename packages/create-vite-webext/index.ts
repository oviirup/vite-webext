#!/usr/bin/env node
import { name as pkgName, version as pkgVersion } from './package.json';
import { getPackman } from './utils/get-packman';
import { getProjectInfo } from '@/prompts/get-project-info';
import { getTemplate } from '@/prompts/get-template';
import { getUseTailwind } from '@/prompts/get-use-tailwind';
import { getUseTypescript } from '@/prompts/get-use-typescript';
import { renderTemplate } from '@/template/render-template';
import { Command } from 'commander';
import { cyan, red } from 'picocolors';

// exit process on termination
['SIGINT', 'SIGTERM', 'SIGQUIT', 'SIGKILL'].forEach((signal) =>
  process.on(signal, () => process.exit()),
);

// parse the cli commands and arguments
const program = new Command(pkgName)
  .version(pkgVersion)
  .arguments('[project-directory]')
  .usage('<project-directory> [options]')
  .option(
    '--ts, --typescript',
    'Initialize as a TypeScript project. Explicitly tell the CLI to use Typescript version of the templates',
  )
  .option(
    '--js, --javascript',
    'Initialize as a TypeScript project. Explicitly tell the CLI to use Typescript version of the templates',
  )
  .option(
    '-t, --template [name]',
    'Bootstrap your project with pre-templated frameworks',
  )
  .option(
    '--tailwind',
    'Create the project with tailwindcss, postcss and sass integration',
  )
  .option(
    '-p, --packman <package-manager>',
    'Explicitly tell the CLI to bootstrap the application using npm, pnpm, or yarn',
  )
  .allowUnknownOption()
  .parse(process.argv);

const opts: Options = program.opts();

async function initialize() {
  await getProjectInfo(program, opts);
  await getUseTypescript(opts);
  await getTemplate(opts);
  await getUseTailwind(opts);

  const templateConfig = {
    appName: opts.project.name,
    appRoot: opts.project.path,
    template: opts.template!,
    packman: getPackman(opts.packman),
    useTS: Boolean(opts.typescript),
    useTailwind: Boolean(opts.tailwind),
  };

  await renderTemplate(templateConfig);
}

initialize()
  .then(() => {})
  .catch(async (reason) => {
    console.log(`Aborting installation.`);
    if (reason.command) {
      console.log(`  ${cyan(reason.command)} has failed.`);
    } else {
      console.log(`${red('Unexpected error. Please report it as a bug:')}`);
      console.log(`  ${reason}`);
    }
    process.exit(1);
  });
