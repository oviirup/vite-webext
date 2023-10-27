import type { FilterPattern } from 'vite'

export type BuildMode = 'BUILD' | 'DEV' | 'WATCH'


export interface WebExtensionOptions {
	/** The manifest to generate extension */
	manifest: chrome.runtime.Manifest

	/**
	 * use hashed filenames
	 * Default: true
	 */
	useHashedFileName?: boolean

	/**
	 * Sets the use_dynamic_url property on web accessible resources
	 * Default: true
	 */
	useDynamicUrl?: boolean

	/**
	 * Enable React HMR for all 'jsx' and 'tsx' modules
	 * Default: true
	 */
	useReactHMR?: boolean

	/** filter scripts for compiling */
	webAccessibleScripts?: {
		include?: FilterPattern | undefined
		exclude?: FilterPattern | undefined
		options?: { resolve?: string | false | null | undefined }
	}
}

/**
 * Build cross platform, module-based web extensions using vite
 */
declare function webExtension(options?: WebExtensionOptions): any
export default webExtension
