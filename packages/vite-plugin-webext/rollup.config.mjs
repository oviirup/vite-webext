import { createRequire } from 'node:module'
import typescript from '@rollup/plugin-typescript'

const require = createRequire(import.meta.url)
const pkg = require('./package.json')

const external = [
	'node:path',
	'node:fs',
	'node:fs/promises',
	'node:crypto',
	'/@vite/client',
	...Object.keys(pkg.dependencies ?? {}),
]

const plugin = {
	input: 'source/plugin.ts',
	plugins: [typescript()],
	external,
	output: [
		{ format: 'cjs', file: pkg.main, exports: 'auto' },
		{ format: 'esm', file: pkg.module },
	],
}

const client = {
	input: 'source/client.ts',
	plugins: [typescript()],
	external,
	output: [
		{ format: 'esm', file: 'client/index.mjs' }
	],
}

export default [plugin, client]
