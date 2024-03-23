import pkg from './package.json';

export const manifest = {
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
    page: './src/option/index.html',
    open_in_tab: true,
  },
  icons: {
    16: 'icon-16.png',
    32: 'icon-32.png',
    64: 'icon-64.png',
    128: 'icon-128.png',
  },
  background: {
    service_worker: './src/background/main.js',
  },
  host_permissions: ['https://*/*'],
};
