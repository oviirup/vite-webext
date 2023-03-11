interface ImportMeta {
	CURRENT_CHUNK_CSS_PATHS: string[] | undefined
}

declare module 'vite-plugin-webext/client' {
	export function mountShadow(): Promise<{
		container: HTMLDivElement
		shadow: ShadowRoot
		root: HTMLDivElement
	}>
}
