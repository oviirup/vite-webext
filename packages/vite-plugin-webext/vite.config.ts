import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import pkg from './package.json'

// prettier-ignore
const external = [
	'node:path','node:fs','node:fs/promises','node:crypto','/@vite/client',
	...Object.keys(pkg.dependencies ?? {}),
]

const entries = { dist: 'src/plugin.ts', client: 'src/client.ts' }

function copyDeclarations() {
	let _entries = Object.entries(entries)
	_entries.forEach(([out, entry]) => {
		let inputFile = entry.replace(/src\/(.*).ts/, 'types/$1.d.ts')
		let outputFile = path.resolve(__dirname, out, 'index.d.ts')
		if (!fs.existsSync(out)) fs.mkdirSync(out)
		fs.copyFileSync(inputFile, outputFile)
	})
}

export default defineConfig({
	resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
	build: {
		outDir: './',
		lib: {
			entry: entries,
			formats: ['cjs', 'es'],
			fileName: '[name]/index',
		},
		rollupOptions: { external },
		minify: 'esbuild',
	},
	plugins: [{ name: 'copyTypes', buildEnd: copyDeclarations }],
	test: {},
})
