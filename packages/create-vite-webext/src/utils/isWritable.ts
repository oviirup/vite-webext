import fs from 'node:fs';

/**
 * Checks if a directory is writable.
 *
 * @param {string} dir - Working directory.
 * @returns A Promise that resolves to a boolean value.
 */
export async function isWriteable(dir: string): Promise<boolean> {
  try {
    await fs.promises.access(dir, (fs.constants || fs).W_OK);
    return true;
  } catch (err) {
    return false;
  }
}
