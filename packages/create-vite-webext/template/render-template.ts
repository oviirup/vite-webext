import fs from 'node:fs';
import path from 'node:path';
import { installPackages } from './install-packages';
import { copyFiles } from '@/utils/copy-files';
import { isWriteable } from '@/utils/is-writable';
import mergePackages from 'merge-packages';
import { blue, cyan, red } from 'picocolors';

/**
 * Responsible for scaffolding the template from frameworks and base files
 * - Checks if the folder is writable
 * - Clones the template
 * - Update the package as per the user input
 */
export async function renderTemplate({
  appName,
  appRoot,
  template,
  packman,
  useTS,
  useTailwind,
}: TemplateArgs) {
  const isDirWritable = await isWriteable(path.dirname(appRoot));
  if (!isDirWritable) {
    console.error(
      '\nThe application path is not writable, please check folder permissions and try again.',
      '\nIt is likely you do not have write permissions for this folder.',
    );
    process.exit(1);
  }

  const tsDIR = (name: string) => (useTS ? `${name}-ts` : name);

  const root = path.resolve(__dirname, '../template');
  const templatePath = path.join(root, 'framework', tsDIR(template));

  console.log(
    `\nUsing ${blue(packman)} as package manager`,
    `\nInitializing project with template: ${cyan(template)}\n`,
  );

  // check if template exists
  if (!fs.existsSync(templatePath)) {
    console.log(`Template not found for: ${red(template)}`);
    process.exit(1);
  }

  const useJSX = ['react', 'preact', 'solid'].includes(template);

  /* Merges two package.json files, updating the name and displayName properties */
  const mergePackageJson = (src: string, dest: string) => {
    let pkgData = readFile(src);
    if (fs.existsSync(dest)) {
      let existing = readFile(dest);
      pkgData = mergePackages(pkgData, existing);
    }
    let pkgJson = JSON.parse(pkgData);
    pkgJson.name &&= appName;
    pkgJson.displayName &&= toTitleCase(appName);
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
    cwd: path.join(root, 'base'),
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
    cwd: templatePath,
    rename: (name) => name.replace(/^_/, '.'),
    transform: async ({ fileName, src, dest }) => {
      if (fileName === 'package.json') {
        return mergePackageJson(src, dest);
      }
    },
  });

  if (useTailwind) {
    // copy tailwind files
    let tailwindGlobs = ['*', useTS ? '!**/*.js' : '!**/*.ts'];
    await copyFiles(tailwindGlobs, appRoot, {
      parents: true,
      cwd: path.join(root, 'tailwind'),
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
  installPackages(packman);
}

/**
 * Converts a snake-case string to title case string.
 * @param {string} text - text to convert
 * @returns the input text with each word capitalized.
 */
function toTitleCase(text: string) {
  let regex = /(?:^-*|-+)(.)/g;
  text = text.replace(regex, (_, e: string) => ` ${e.toUpperCase()}`);
  return text.trim();
}

/**
 * Reads the contents of a file and returns it as a string.
 * @param {string} file - the file path
 */
function readFile(file: string, encoding: BufferEncoding = 'utf-8') {
  return fs.readFileSync(file, encoding);
}
