interface ImportMeta {
	CURRENT_CHUNK_CSS_PATHS: string[] | undefined
}

declare function mountShadow(options: {
	container?: HTMLElement | null
	cssPaths?: string[]
	shadowMode?: 'open' | 'closed'
}): Promise<{
	container: HTMLDivElement
	root: HTMLDivElement
}>
export { mountShadow }
