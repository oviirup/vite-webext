import fs from 'node:fs';

/**
 * Checks if a directory is writable.
 * @param {string} dir - working directory.
 * @returns a Promise that resolves to a boolean value.
 */
export async function isWriteable(dir: string): Promise<boolean> {
  try {
    await fs.promises.access(dir, (fs.constants || fs).W_OK);
    return true;
  } catch (err) {
    return false;
  }
}
