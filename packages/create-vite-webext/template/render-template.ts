import fs from 'node:fs';
import path from 'node:path';
import { installPackages } from './install-packages';
import { copyFiles } from '@/utils/copy-files';
import { isWriteable } from '@/utils/is-writable';
import mergePackages from 'merge-packages';
import { blue, cyan, red } from 'picocolors';

/**
 * Responsible for scaffolding the template from frameworks and base files
 * - Checks if the folder is writable
 * - Clones the template
 * - Update the package as per the user input
 */
export async function renderTemplate({
	appName,
	appRoot,
	template,
	packman,
	useTS,
}: TemplateArgs) {
	const isDirWritable = await isWriteable(path.dirname(appRoot));
	if (!isDirWritable) {
		console.error(
			'\nThe application path is not writable, please check folder permissions and try again.',
			'\nIt is likely you do not have write permissions for this folder.',
		);
		process.exit(1);
	}

	const tsDIR = (name: string) => (useTS ? `${name}-ts` : name);

	const root = path.resolve(__dirname, '../template');
	const templatePath = path.join(root, 'framework', tsDIR(template));

	console.log(
		`\nUsing ${blue(packman)} as package manager`,
		`\nInitializing project with template: ${cyan(template)}\n`,
	);

	// check if template exists
	if (!fs.existsSync(templatePath)) {
		console.log(`Template not found for: ${red(template)}`);
		process.exit(1);
	}

	const mergePackageJson = async (name: string, src: string, dest: string) => {
		if (name === 'package.json' && fs.existsSync(dest)) {
			const existing = fs.readFileSync(dest);
			const upcoming = fs.readFileSync(src);
			try {
				// Try to merge the two package json and update name fields
				const pkgJson = JSON.parse(mergePackages(existing, upcoming));
				pkgJson.name &&= appName;
				pkgJson.displayName &&= toTitleCase(appName);
				return JSON.stringify(pkgJson, null, 2);
			} catch {}
		}
	};

	// copy base files
	await copyFiles('**', appRoot, {
		parents: true,
		cwd: path.join(root, 'base'),
		rename: (name) => name.replace(/^_/, '.'),
		transform: mergePackageJson,
	});

	// copy framework specific files
	copyFiles('**', appRoot, {
		parents: true,
		cwd: templatePath,
		rename: (name) => name.replace(/^_/, '.'),
		transform: mergePackageJson,
	});

	// move working dir to app root and install packages
	process.chdir(appRoot);
	installPackages(packman);
}

function toTitleCase(text: string) {
	let regex = /(?:^-*|-+)(.)/g;
	text = text.replace(regex, (_, e: string) => ` ${e.toUpperCase()}`);
	return text.trim();
}
