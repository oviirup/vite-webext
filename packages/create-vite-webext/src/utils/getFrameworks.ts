import fs from 'node:fs';
import path from 'node:path';
import { TEMPLATES_PATH } from '@/constants';

export function getFrameworks() {
  const rootPath = path.resolve(TEMPLATES_PATH);
  const frameworkPath = path.resolve(rootPath, 'frameworks');
  const ls = fs.readdirSync(path.join(frameworkPath));
  const list = ls.filter((e) => !e.endsWith('-ts'));

  return {
    list,
    rootPath,
    /** check if the list include specified framework */
    includes: list.includes,
    /** Check if the framework has typescript available */
    hasTS: (name: string) => {
      return ls.includes(`${name}-ts`);
    },
    /** find the framework directory */
    resolve: (name: string, hasTS: boolean = false) => {
      const fw = name + (hasTS ? '-ts' : '');
      const fwPath = path.resolve(rootPath, 'frameworks', fw);
      return { name, hasTS, basename: fw, path: fwPath };
    },
  };
}
