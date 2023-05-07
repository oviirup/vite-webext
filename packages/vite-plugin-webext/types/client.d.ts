interface ImportMeta {
	CURRENT_CHUNK_CSS_PATHS: string[] | undefined
}

declare module 'vite-plugin-webext/client' {
	export function mountShadow<Container = HTMLDivElement>(
		container?: Container | null,
		mode?: 'open' | 'closed',
	): Promise<{
		container: Container
		root: HTMLDivElement
	}>
}
