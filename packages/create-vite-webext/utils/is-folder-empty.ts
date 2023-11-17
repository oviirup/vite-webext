import fs from 'node:fs';
import path from 'node:path';
import { blue, green, red } from 'picocolors';

/**
 * The function checks if a folder is empty or contains conflicting files.
 * @param {string} root - working directory
 * @returns {boolean} a boolean value
 */
export function isFolderEmpty(root: string): boolean {
  if (!fs.existsSync(root)) return true;
  const folderName = path.basename(root);
  //
  // prettier-ignore
  const validFiles = [
		'.ds_store','.idea','.vscode','.git','.gitattributes','.gitignore',
		'.npmignore','.travis.yml','license','thumbs.db','npm-debug.log',
		'yarn-debug.log','yarn-error.log','yarnrc.yml','.yarn'
	];

  const conflicts = fs
    .readdirSync(root)
    .filter((file) => !validFiles.includes(file.toLowerCase()));

  if (conflicts.length > 0) {
    console.log(
      `\nThe folder ${green(folderName)} contains conflicting files:\n`,
    );
    for (const file of conflicts) {
      try {
        let isDir = fs.lstatSync(path.join(root, file)).isDirectory();
        console.log(isDir ? `  ${blue(`${file}/`)}` : `  ${file}`);
      } catch {
        console.log(`  - ${file}`);
      }
    }
    console.log(`\nEither try a new folder name, or remove the files.\n`);
    return false;
  }
  return true;
}
