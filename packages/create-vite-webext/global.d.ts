type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

interface Options  {
	project: { name: string; path: string };
	template?: string;
	packman?: string;
	javascript?: boolean;
	typescript?: boolean;
  tailwind?: boolean;
}

interface TemplateArgs {
	appName: string;
	appRoot: string;
	template: string;
	packman: PackageManager;
	useTS: boolean;
  useTailwind: boolean;
}

declare module 'merge-packages' {
	function mergePackages(srcPkg: string|Buffer, destPkg: string|Buffer): string;
	export default mergePackages
}
