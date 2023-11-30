import { isOnline } from '@/utils/is-online';
import spawn from 'cross-spawn';
import { yellow } from 'picocolors';

/**
 * Installs packages using a package manager, with an option to use
 * the local cache if offline, and returns a promise that resolves
 * once the installation is finished.
 * @param {PackageManager} packman - preferred package manager
 * @returns A Promise is being returned.
 */
export async function installPackages(packman: PackageManager) {
  let args: string[] = ['install'];

  if (!isOnline()) {
    console.log(yellow('You appear to be offline.\nUsing the local cache.'));
    args.push('--offline');
  }

  const env = { ...process.env, ADBLOCK: '1', NODE_ENV: 'development' };

  // install packages with current package manager
  let result: unknown;
  result = await new Promise((resolve, reject) => {
    spawn(packman, args, { stdio: 'inherit', env }).on('close', (code) => {
      if (code !== 0) reject({ error: `${packman} ${args.join(' ')}` });
      else resolve(true);
    });
  });
  if (result !== true) return result;
  // format the files in correct way
  result = await new Promise((resolve, reject) => {
    spawn(packman, ['run', 'format']).on('close', (code) => {
      if (code !== 0) reject({ error: `${packman} run format` });
      else resolve(true);
    });
  });
  return result;
}
