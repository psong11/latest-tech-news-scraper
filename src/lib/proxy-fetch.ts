import { ProxyAgent, fetch as undiciFetch } from "undici";

/**
 * If PROXY_URL is set, returns a fetch function that routes through
 * a residential proxy (e.g. Webshare). Otherwise returns undefined,
 * letting youtubei.js use its default fetch (fine for residential IPs).
 */
export function getProxyFetch(): typeof globalThis.fetch | undefined {
  const proxyUrl = process.env.PROXY_URL;
  if (!proxyUrl) return undefined;

  const agent = new ProxyAgent(proxyUrl);

  return ((input: RequestInfo | URL, init?: RequestInit) =>
    undiciFetch(input as Parameters<typeof undiciFetch>[0], {
      ...(init as Record<string, unknown>),
      dispatcher: agent,
    }) as unknown as Promise<Response>) as typeof globalThis.fetch;
}
