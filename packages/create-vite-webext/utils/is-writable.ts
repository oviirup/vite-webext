import fs from 'node:fs';

export async function isWriteable(dir: string): Promise<boolean> {
	try {
		await fs.promises.access(dir, (fs.constants || fs).W_OK);
		return true;
	} catch (err) {
		return false;
	}
}
