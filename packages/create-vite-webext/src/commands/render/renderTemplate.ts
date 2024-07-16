import fs from 'node:fs';
import path from 'node:path';
import { copyFiles } from './copyFiles';
import { installPackages } from './installPackages';
import { TemplateArgs } from '@/types';
import { getFrameworks } from '@/utils';
import mergePackages from 'deep-extend';
import pi from 'picocolors';

/**
 * Responsible for scaffolding the template from frameworks and base files
 *
 * - Checks if the folder is writable
 * - Clones the template
 * - Update the package as per the user input
 */
export async function renderTemplate(opt: TemplateArgs) {
  const fw = getFrameworks();
  const appRoot = opt.project.path;
  const templateRoot = fw.rootPath;
  const template = fw.resolve(opt.framework, opt.typescript);
  const useTS = opt.typescript;
  const useJSX = ['react', 'preact', 'solid'].includes(opt.framework);

  console.log(
    `\n${pi.gray('*')} Using ${pi.blue(opt.packman)} as package manager`,
    `\n  Initializing project with: ${pi.cyan(pi.bold(opt.framework))}\n`,
  );

  // throw error if template does not exists
  if (!fs.existsSync(template.path)) {
    console.log(`${pi.red('!')} Template not found: ${pi.red(opt.framework)}`);
    process.exit(1);
  }

  type PkgJson = Record<string, any>;
  /* Merges two package.json files, updating the name and displayName properties */
  const mergePackageJson = (src: string, dest: string) => {
    let pkgJson: PkgJson = JSON.parse(readFile(src, 'utf-8') ?? '{}');
    if (fs.existsSync(dest)) {
      let existing: PkgJson = JSON.parse(readFile(dest, 'utf-8') ?? '{}');
      pkgJson = mergePackages(pkgJson, existing);
    }
    pkgJson.name &&= opt.project.name;
    pkgJson.displayName &&= toTitleCase(opt.project.name);
    return { code: JSON.stringify(pkgJson, null, 2) };
  };

  /** Transforms html files to use respective filename extensions */
  const transformHTML = (src: string) => {
    let code = readFile(src);
    if (useJSX) code = code.replace('.js', '.jsx');
    if (useTS) code = code.replace('.js', '.ts');
    return { code };
  };

  // copy base files
  let baseGlobs = ['**', useTS ? '!**/*.js' : '!**/*.ts'];
  await copyFiles(baseGlobs, appRoot, {
    parents: true,
    cwd: path.join(templateRoot, 'base'),
    rename: (name) => name.replace(/^_/, '.'),
    transform: async ({ fileName, src, dest }) => {
      if (fileName === 'package.json') {
        return mergePackageJson(src, dest);
      } else if (/\.html$/.test(fileName)) {
        return transformHTML(src);
      }
    },
  });

  // copy framework specific files
  copyFiles('**', appRoot, {
    parents: true,
    cwd: template.path,
    rename: (name) => name.replace(/^_/, '.'),
    transform: async ({ fileName, src, dest }) => {
      if (fileName === 'package.json') {
        return mergePackageJson(src, dest);
      }
    },
  });

  if (opt.tailwind) {
    // copy tailwind files
    let tailwindGlobs = ['*', useTS ? '!**/*.js' : '!**/*.ts'];
    await copyFiles(tailwindGlobs, appRoot, {
      parents: true,
      cwd: path.join(templateRoot, 'tailwind'),
      rename: (name) => name.replace(/^_/, '.'),
      transform: async ({ fileName, src, dest }) => {
        if (fileName === 'package.json') {
          return mergePackageJson(src, dest);
        }
      },
    });
  }

  // move working dir to app root and install packages
  process.chdir(appRoot);
  if (!opt.skipInstall) {
    installPackages(opt.packman);
  }
}

/**
 * Converts a snake-case string to title case string.
 *
 * @param {string} text - Text to convert
 * @returns The input text with each word capitalized.
 */
function toTitleCase(text: string) {
  let regex = /(?:^-*|-+)(.)/g;
  text = text.replace(regex, (_, e: string) => ` ${e.toUpperCase()}`);
  return text.trim();
}

/**
 * Reads the contents of a file and returns it as a string.
 *
 * @param {string} file - The file path
 */
function readFile(file: string, encoding: BufferEncoding = 'utf-8') {
  return fs.readFileSync(file, encoding);
}
