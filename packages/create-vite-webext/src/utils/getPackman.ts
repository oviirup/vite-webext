import os from 'node:os';
import { execa } from 'execa';
import type { PackageManager } from '@/types';

type Packman = {
  name: PackageManager;
  version: string;
};

export async function getPackman() {
  const res = await Promise.all([
    exec('npm', 'npm', ['--version']),
    exec('pnpm', 'pnpm', ['--version']),
    exec('yarn', 'yarnpkg', ['--version']),
    exec('bun', 'bun', ['--version']),
  ]);

  const list = res.filter((e): e is Packman => !!e);
  const entries = list.map((e) => e.name);
  const available = (name: string) => {
    const found = list.find((e) => e.name === name.trim());
    return !!found?.version;
  };
  const current = getCurrentPackman(entries);

  return { list, entries, available, current };
}

/** Finds the package mangers and their version */
async function exec(name: PackageManager, cmd: string, args: string[] = []) {
  try {
    const { stdout } = await execa(cmd, args, {
      cwd: os.tmpdir(),
      env: { COREPACK_ENABLE_STRICT: '0' },
    });
    return { name, version: stdout.trim() };
  } catch {
    return { name, version: undefined };
  }
}

/** Retrives the package manager using currently */
export function getCurrentPackman(entries: PackageManager[]): PackageManager {
  const userAgent = process.env.npm_config_user_agent!;
  for (const pm of entries) {
    if (userAgent.startsWith(pm)) return pm;
  }
  return 'npm';
}
