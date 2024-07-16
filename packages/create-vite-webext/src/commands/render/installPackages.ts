import { isOnline } from '@/utils';
import { execa } from 'execa';
import pi from 'picocolors';
import type { PackageManager } from '@/types';

/**
 * Installs packages using a package manager, with an option to use the local
 * cache if offline, and returns a promise that resolves once the installation
 * is finished.
 *
 * @param {PackageManager} packman - Preferred package manager
 * @returns A Promise is being returned.
 */
export async function installPackages(packman: PackageManager) {
  let args: string[] = ['install'];

  if (!isOnline()) {
    console.log(`${pi.yellow('!')} You appear to be offline`);
    console.log(pi.dim('  Using the local cache'));
    args.push('--offline');
  }

  const env = { ...process.env, ADBLOCK: '1', NODE_ENV: 'development' };

  let result: unknown;
  try {
    // install packages with current package manager
    console.log(`${pi.green('>')} Installing packages`);
    result = await execa(packman, args, { stdio: 'inherit', env });
    // prettify the code
    result = await execa(packman, ['run', 'format'], { env });
  } catch {
    console.log(`${pi.yellow('×')} Installation failed`);
  }
  return result;
}
