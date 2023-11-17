import { execSync } from 'child_process';
import dns from 'node:dns';

/** gets the proxy config from node */
function getProxy(): string | undefined {
  if (process.env.https_proxy) {
    return process.env.https_proxy;
  }
  try {
    const proxy = execSync('npm config get https-proxy').toString().trim();
    return proxy !== 'null' ? proxy : undefined;
  } catch {}
}

/** Checks if the user is connected to internet */
export function isOnline(): Promise<boolean> {
  return new Promise((resolve) => {
    dns.lookup('registry.yarnpkg.com', (registryErr) => {
      if (!registryErr) {
        return resolve(true);
      }
      const proxy = getProxy();
      if (!proxy) {
        return resolve(false);
      }

      const { hostname } = new URL(proxy);
      if (!hostname) {
        return resolve(false);
      }
      dns.lookup(hostname, (proxyErr) => {
        resolve(proxyErr == null);
      });
    });
  });
}
