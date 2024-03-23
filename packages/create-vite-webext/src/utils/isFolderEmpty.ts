import fs from 'node:fs';

export function isFolderEmpty(root: string) {
  // prettier-ignore
  const VALID_FILES = [
    '.ds_store','.idea','.vscode','.git','.gitattributes','.gitignore',
    '.npmignore','.travis.yml','license','thumbs.db','npm-debug.log',
    'yarn-debug.log','yarn-error.log','yarnrc.yml','.yarn'
  ];
  if (!fs.existsSync(root)) {
    return true;
  }
  const conflicts = fs
    .readdirSync(root)
    .filter((file) => !VALID_FILES.includes(file.toLowerCase()));
  return conflicts.length === 0;
}
