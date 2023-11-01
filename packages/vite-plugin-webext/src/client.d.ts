interface ImportMeta {
	CURRENT_CHUNK_CSS_PATHS: string[] | undefined
}

declare module 'vite-plugin-webext/client' {
	export function mountShadow(options: {
		container?: HTMLElement | null
		cssPaths?: string[]
		shadowMode?: 'open' | 'closed'
	}): Promise<{
		container: HTMLDivElement
		root: HTMLDivElement
	}>
}

declare module 'vite-plugin-webext/client/react-hmr' {}
