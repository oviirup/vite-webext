import path from 'node:path';
import { description, name, version } from '../package.json';

export const DEFAULT_NAME = 'web-extension';

export const CLI_NAME = name;
export const CLI_VERSION = version;
export const CLI_DESC = description;

export const ROOT_PATH = path.resolve(__dirname, '../');
export const TEMPLATES_PATH = path.resolve(ROOT_PATH, 'template');
