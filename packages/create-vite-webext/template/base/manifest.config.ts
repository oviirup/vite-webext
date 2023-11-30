import pkg from './package.json';

export const manifest: chrome.runtime.Manifest = {
  manifest_version: 3,
  name: pkg.displayName,
  description: pkg.description,
  version: pkg.version,
  content_scripts: [
    {
      js: ['./src/content/main.js'],
      matches: ['*://*/*'],
    },
  ],
  action: {
    default_popup: './src/popup/index.html',
  },
  options_ui: {
    page: './src/options/index.html',
    open_in_tab: true,
  },
  background: {
    service_worker: './src/background/main.js',
  },
  host_permissions: ['https://*/*'],
};
