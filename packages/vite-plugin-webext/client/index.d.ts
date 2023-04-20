interface ImportMeta {
	CURRENT_CHUNK_CSS_PATHS: string[] | undefined
}

declare module 'vite-plugin-webext/client' {
	export function mountShadow<
		Container = HTMLDivElement,
		Root = HTMLDivElement,
	>(
		container?: Container,
	): Promise<{
		container: Container
		root: Root
	}>
}
