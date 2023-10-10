//@ts-check

import typescript from '@rollup/plugin-typescript'
import { createRequire } from 'node:module'
import { defineConfig } from 'rollup'
import fs from 'node:fs'
import path from 'node:path'

const require = createRequire(import.meta.url)
const pkg = require('./package.json')

// prettier-ignore
const external = [
	'node:path','node:fs','node:fs/promises','node:crypto','/@vite/client',
	...Object.keys(pkg.dependencies ?? {}),
]

/** @type {import ('rollup').RollupOptions} */
const plugin = {
	input: 'source/plugin.ts',
	output: [
		{ format: 'cjs', file: pkg.main, exports: 'auto' },
		{ format: 'esm', file: pkg.module },
	],
}

/** @type {import ('rollup').RollupOptions} */
const client = {
	input: 'source/client.ts',
	output: [{ format: 'esm', file: 'client/index.mjs' }],
}

/* main rollup config ------------------------------------------------------- */
const rollupConfig = defineConfig(
	[plugin, client].map((options) => ({
		...options,
		plugins: [typescript()],
		external,
	})),
)

/* copy type definitions ---------------------------------------------------- */
const declarations = [
	{ src: 'types/client.d.ts', out: 'client/index.d.ts' },
	{ src: 'types/plugin.d.ts', out: 'dist/index.d.ts' },
]
declarations.forEach(({ src, out }) => {
	const dist = path.dirname(out)
	if (!fs.existsSync(dist)) fs.mkdirSync(dist)
	fs.copyFileSync(src, out)
})

export default rollupConfig
