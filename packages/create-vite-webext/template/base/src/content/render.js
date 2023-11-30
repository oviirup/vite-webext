import Browser from 'webextension-polyfill';

/**
 * Injects the element to DOM using shadow DOM
 * Shadow doms enables hot-module-reload in dev mode.
 * @param cssPaths array of imported css - import.meta.CURRENT_CHUNK_CSS_PATHS
 */
export async function render(cssPaths) {
  const wrapper = document.createElement('div');
  const shadowRoot = wrapper.attachShadow({ mode: 'closed' });
  const appRoot = document.createElement('div');
  // enables HMR in development mode
  if (import.meta.hot) {
    const { addStyleTarget } = await import('/@vite/client');
    addStyleTarget(shadowRoot);
  } // runs on production build
  else if (Array.isArray(cssPaths)) {
    // inject css to shadow root
    cssPaths.forEach((css) => {
      const style = document.createElement('link');
      style.setAttribute('rel', 'stylesheet');
      style.setAttribute('href', Browser.runtime.getURL(css));
      shadowRoot.prepend(style);
    });
  }
  shadowRoot.appendChild(appRoot);
  return { wrapper, appRoot };
}
