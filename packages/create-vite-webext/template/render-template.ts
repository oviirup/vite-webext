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

  /**
   * Merges two package.json files, updating the name and displayName properties.
   * @param {string} name - filename.
   * @param {string} src - source file path.
   * @param {string} dest - destination file path
   * @returns a stringified version of the merged package.json file.
   */
  const mergePackageJson = async (name: string, src: string, dest: string) => {
    if (name === 'package.json') {
      let pkgData = fs.readFileSync(src, 'utf-8');
      if (fs.existsSync(dest)) {
        let existing = fs.readFileSync(dest, 'utf-8');
        pkgData = mergePackages(pkgData, existing);
      }
      let pkgJson = JSON.parse(pkgData);
      pkgJson.name &&= appName;
      pkgJson.displayName &&= toTitleCase(appName);
      return JSON.stringify(pkgJson, null, 2);
    }
  };

  // copy base files
  await copyFiles('**', appRoot, {
    parents: true,
    cwd: path.join(root, 'base'),
    rename: (name) => name.replace(/^_/, '.'),
    transform: mergePackageJson,
  });

  // copy framework specific files
  copyFiles('**', appRoot, {
    parents: true,
    cwd: templatePath,
    rename: (name) => name.replace(/^_/, '.'),
    transform: mergePackageJson,
  });

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
