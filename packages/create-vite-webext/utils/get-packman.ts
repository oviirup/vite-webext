const packman: PackageManager[] = ['yarn', 'pnpm', 'bun', 'npm'];

/**
 * The function `getPackman` returns the package manager based on the user agent or
 * the initial value provided.
 * @param {string} [initial] - The `initial` parameter is an optional string that
 * represents the initial package manager to use.
 * @returns a value of type `PackageManager`.
 */
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
