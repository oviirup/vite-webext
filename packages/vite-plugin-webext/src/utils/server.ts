import { ContentSecurityPolicy } from '@/lib/csp';
import getEtag from 'etag';
import type * as HTTP from 'node:http';
import type * as Vite from 'vite';

/** add hmr support to shadow dom */
export function contentScriptStyleHandler(
	req: Vite.Connect.IncomingMessage,
	res: HTTP.ServerResponse,
	next: Vite.Connect.NextFunction,
) {
	const _originalEnd = res.end;

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
				);

				res.setHeader('Etag', getEtag(chunk, { weak: true }));

				// @ts-ignore
				return _originalEnd.call(this, chunk, ...otherArgs);
			}

			chunk = chunk.replace(
				'const sheetsMap',
				'const styleTargets = new Set(); const styleTargetsStyleMap = new Map(); const sheetsMap',
			);
			chunk = chunk.replace('export {', 'export { addStyleTarget, ');
			chunk = chunk.replace(
				'document.head.appendChild(style)',
				'styleTargets.size ? styleTargets.forEach(target => addStyleToTarget(style, target)) : document.head.appendChild(style)',
			);
			chunk = chunk.replace(
				'document.head.removeChild(style)',
				'styleTargetsStyleMap.get(style) ? styleTargetsStyleMap.get(style).forEach(style => style.parentNode.removeChild(style)) : document.head.removeChild(style)',
			);

			const styleProperty = /style\.textContent = content/.test(chunk)
				? 'style.textContent'
				: 'style.innerHTML';
			const lastStyleInnerHtml = chunk.lastIndexOf(
				`${styleProperty} = content`,
			);
			chunk =
				chunk.slice(0, lastStyleInnerHtml) +
				chunk
					.slice(lastStyleInnerHtml)
					.replace(
						`${styleProperty} = content`,
						`${styleProperty} = content; styleTargetsStyleMap.get(style)?.forEach(style => ${styleProperty} = content)`,
					);

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
      `;

			res.setHeader('Etag', getEtag(chunk, { weak: true }));
		}

		// @ts-ignore
		return _originalEnd.call(this, chunk, ...otherArgs);
	};

	next();
}

export const getCSP = (cspString?: string | undefined): string => {
	const csp = new ContentSecurityPolicy(cspString);

	csp.add('object-src', "'self'");
	csp.add('script-src', "'self'", 'http://localhost:*', 'http://127.0.0.1:*');

	return csp.toString();
};
