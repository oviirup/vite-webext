import getEtag from 'etag'

/** add hmr support to shadow dom */
export function contentScriptStyleHandler(
	req: Vite.Connect.IncomingMessage,
	res: Vite.Connect.OutgoingMessage,
	next: Vite.Connect.NextFunction,
) {
	const _originalEnd = res.end

	// @ts-ignore
	res.end = function end(chunk, ...otherArgs) {
		if (req.url === '/@vite/client' && typeof chunk === 'string') {
			if (
				!/const sheetsMap/.test(chunk) ||
				!/document\.head\.appendChild\(style\)/.test(chunk) ||
				!/document\.head\.removeChild\(style\)/.test(chunk) ||
				(!/style\.textContent = content/.test(chunk) &&
					!/style\.innerHTML = content/.test(chunk))
			) {
				console.error(
					'Content script HMR style support disabled -- failed to rewrite vite client',
				)

				res.setHeader('Etag', getEtag(chunk, { weak: true }))

				// @ts-ignore
				return _originalEnd.call(this, chunk, ...otherArgs)
			}

			chunk = chunk.replace(
				'const sheetsMap',
				'const styleTargets = new Set(); const styleTargetsStyleMap = new Map(); const sheetsMap',
			)
			chunk = chunk.replace('export {', 'export { addStyleTarget, ')
			chunk = chunk.replace(
				'document.head.appendChild(style)',
				'styleTargets.size ? styleTargets.forEach(target => addStyleToTarget(style, target)) : document.head.appendChild(style)',
			)
			chunk = chunk.replace(
				'document.head.removeChild(style)',
				'styleTargetsStyleMap.get(style) ? styleTargetsStyleMap.get(style).forEach(style => style.parentNode.removeChild(style)) : document.head.removeChild(style)',
			)

			const styleProperty = /style\.textContent = content/.test(chunk)
				? 'style.textContent'
				: 'style.innerHTML'
			const lastStyleInnerHtml = chunk.lastIndexOf(`${styleProperty} = content`)
			chunk =
				chunk.slice(0, lastStyleInnerHtml) +
				chunk
					.slice(lastStyleInnerHtml)
					.replace(
						`${styleProperty} = content`,
						`${styleProperty} = content; styleTargetsStyleMap.get(style)?.forEach(style => ${styleProperty} = content)`,
					)

			chunk += `
        function addStyleTarget(newStyleTarget) {
          for (const [, style] of sheetsMap.entries()) {
            addStyleToTarget(style, newStyleTarget, styleTargets.size !== 0);
          }
          styleTargets.add(newStyleTarget);
        }
        function addStyleToTarget(style, target, cloneStyle = true) {
          const addedStyle = cloneStyle ? style.cloneNode(true) : style;
          target.appendChild(addedStyle);
          styleTargetsStyleMap.set(style, [...(styleTargetsStyleMap.get(style) ?? []), addedStyle]);
        }
      `

			res.setHeader('Etag', getEtag(chunk, { weak: true }))
		}

		// @ts-ignore
		return _originalEnd.call(this, chunk, ...otherArgs)
	}

	next()
}

type CspDirective = 'default-src' | 'script-src' | 'object-src'
export class ContentSecurityPolicy {
	private static DIRECTIVE_ORDER: Record<string, number | undefined> = {
		'default-src': 0,
		'script-src': 1,
		'object-src': 2,
	}

	data: Record<string, string[]> = {}
	constructor(csp?: string) {
		if (csp) {
			const sections = csp.split(';').map((section) => section.trim())
			this.data = sections.reduce<Record<string, string[]>>((data, section) => {
				const [key, ...values] = section.split(' ').map((item) => item.trim())
				if (key) data[key] = values
				return data
			}, {})
		}
	}
	/** add values to directive */
	add(directive: CspDirective, ...newValues: string[]): ContentSecurityPolicy {
		const values = this.data[directive] ?? []
		newValues.forEach((newValue) => {
			if (!values.includes(newValue)) values.push(newValue)
		})
		this.data[directive] = values
		return this
	}
	/** convert to csp string */
	toString(): string {
		const directives = Object.entries(this.data).sort(([l], [r]) => {
			const lo = ContentSecurityPolicy.DIRECTIVE_ORDER[l] ?? 2
			const ro = ContentSecurityPolicy.DIRECTIVE_ORDER[r] ?? 2
			return lo - ro
		})
		return directives.map((entry) => entry.flat().join(' ')).join('; ') + ';'
	}
}

export const getCSP = (cspString?: string | undefined): string => {
	const csp = new ContentSecurityPolicy(cspString)

	csp.add('object-src', "'self'")
	csp.add('script-src', "'self'", 'http://localhost:*', 'http://127.0.0.1:*')

	return csp.toString()
}
