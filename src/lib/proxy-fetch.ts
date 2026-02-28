import { ProxyAgent, fetch as undiciFetch } from "undici";

/**
 * If PROXY_URL is set, returns a fetch function that routes through
 * a residential proxy (e.g. Webshare). Otherwise returns undefined,
 * letting youtubei.js use its default fetch (fine for residential IPs).
 */
export function getProxyFetch(): typeof globalThis.fetch | undefined {
  const proxyUrl = process.env.PROXY_URL;
  if (!proxyUrl) {
    console.log("[proxy-fetch] No PROXY_URL set, using direct connection");
    return undefined;
  }

  // Log redacted proxy URL for debugging
  const redacted = proxyUrl.replace(/:([^@]+)@/, ":***@");
  console.log(`[proxy-fetch] Using proxy: ${redacted}`);

  const agent = new ProxyAgent(proxyUrl);

  return ((input: RequestInfo | URL, init?: RequestInit) => {
    // youtubei.js passes Request objects, but undici's fetch uses a
    // different Request class and stringifies ours to "[object Request]".
    // Unwrap to a plain URL + init so undici can handle it.
    let url: string | URL;
    let mergedInit: Record<string, unknown> = {
      ...(init as Record<string, unknown>),
      dispatcher: agent,
    };

    if (input instanceof Request) {
      url = input.url;
      mergedInit = {
        method: input.method,
        headers: input.headers,
        body: input.body,
        ...mergedInit,
      };
    } else {
      url = input;
    }

    return undiciFetch(
      url as Parameters<typeof undiciFetch>[0],
      mergedInit,
    ) as unknown as Promise<Response>;
  }) as typeof globalThis.fetch;
}
