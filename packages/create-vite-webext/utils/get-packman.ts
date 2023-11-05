const packman: PackageManager[] = ['yarn', 'pnpm', 'bun', 'npm'];
export function getPackman(initial?: string): PackageManager {
	const userAgent = process.env.npm_config_user_agent || '';
	if (
		typeof initial === 'string' &&
		packman.indexOf(initial as PackageManager)
	) {
		return initial as PackageManager;
	}
	for (const pm of packman) {
		if (userAgent.startsWith(pm)) return pm;
	}
	return 'npm';
}
