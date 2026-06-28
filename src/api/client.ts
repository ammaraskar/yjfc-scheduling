export type ApiFetch = (path: string, init?: RequestInit) => Promise<Response>;

// Client that handles proxying requests through a CORS proxy.
export function createClient(corsProxyUrl: string, apiBaseUrl: string): ApiFetch {
  return (path, init) => {
    const target = `${apiBaseUrl}${path}`;
    const url = `${corsProxyUrl}?url=${encodeURIComponent(target)}`;
    return fetch(url, init);
  };
}

export const apiClient = createClient(
  "https://sm-cors-proxy.ammar-askar.workers.dev/",
  "https://my.schedulemaster.com"
);
