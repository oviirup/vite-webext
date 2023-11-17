/// <reference types="vite/client" />

declare const browser: any;

type MountOptions = {
  container?: HTMLElement | null;
  cssPaths?: string[];
  shadowMode?: 'open' | 'closed';
};
export async function mountShadow({
  container,
  cssPaths,
  shadowMode = 'closed',
}: MountOptions) {
  if (!container) container = document.createElement('div');
  const shadow = container.attachShadow({ mode: shadowMode });
  const root = document.createElement('div');

  // enables HMR in development mode
  if (import.meta.hot) {
    // @ts-ignore
    const { addStyleTarget } = await import('/@vite/client');
    addStyleTarget(shadow);
  }
  // runs on production build
  else if (Array.isArray(cssPaths)) {
    // inject css to shadow root
    cssPaths.forEach((css) => {
      const style = document.createElement('link');
      style.setAttribute('rel', 'stylesheet');
      if (typeof chrome?.runtime?.getURL !== 'undefined') {
        style.setAttribute('href', chrome.runtime.getURL(css));
      } else {
        style.setAttribute('href', browser.runtime.getURL(css));
      }
      shadow.prepend(style);
    });
  }
  shadow.appendChild(root);

  return { container, root };
}
