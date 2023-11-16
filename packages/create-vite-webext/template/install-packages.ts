import { getPackman } from '@/utils/get-packman';
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
export function installPackages(packman: PackageManager) {
	let args: string[] = ['install'];

	if (!isOnline()) {
		console.log(yellow('You appear to be offline.\nUsing the local cache.'));
		args.push('--offline');
	}

	/** Return a Promise that resolves once the installation is finished */
	return new Promise((resolve, reject) => {
		const child = spawn(packman, args, {
			stdio: 'inherit',
			env: { ...process.env, ADBLOCK: '1', NODE_ENV: 'development' },
		});
		child.on('close', (code) => {
			if (code !== 0) {
				return reject({ command: `${packman} ${args.join(' ')}` });
			}
			resolve(true);
		});
	});
}
