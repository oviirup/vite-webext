import { copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'

function path(path: string) {
	return resolve(process.cwd(), path)
}

// copy declarations of client.ts
copyFile(path('types/client.d.ts'), path('client/index.d.ts'))
console.log('\x1b[2mcoppied:\x1b[0m \x1b[92mclient/index.d.ts\x1b[0m')

// copy declarations of plugin.ts
copyFile(path('types/plugin.d.ts'), path('dist/index.d.ts'))
console.log('\x1b[2mcoppied:\x1b[0m \x1b[92mdist/index.d.ts\x1b[0m')
