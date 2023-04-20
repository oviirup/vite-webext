let Browser = chrome ?? browser

export async function mountShadow(container) {
	const isDev = import.meta.env.DEV || false
	if (!container) container = document.createElement('div')
	const shadow = container.attachShadow({ mode: isDev ? 'open' : 'closed' })
	const root = document.createElement('div')

	// enables HMR in development mode
	if (import.meta.hot) {
		const { addStyleTarget } = await import('/@vite/client')
		addStyleTarget(shadow)
	}
	// runs on production build
	else {
		const cssPaths = import.meta.CURRENT_CHUNK_CSS_PATHS
		// inject css to shadow root
		for (const css of cssPaths) {
			const style = document.createElement('link')
			style.setAttribute('rel', 'stylesheet')
			style.setAttribute('href', Browser.runtime.getURL(css))
			shadow.appendChild(style)
		}
	}

	shadow?.appendChild(root)

	return {
		container,
		root,
	}
}
