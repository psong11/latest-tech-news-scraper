import { Innertube } from "youtubei.js";
import { JSDOM } from "jsdom";
import { BG } from "bgutils-js";
import type { WebPoSignalOutput, IntegrityTokenData } from "bgutils-js";

export interface PoTokenResult {
  poToken: string;
  visitorData: string;
  mintContentToken: (videoId: string) => Promise<string>;
}

interface CachedMinter {
  minter: InstanceType<typeof BG.WebPoMinter>;
  sessionToken: string;
  visitorData: string;
  generatedAt: number;
  dom: JSDOM;
  domGlobals: Record<string, unknown>;
  savedDescriptors: Record<string, PropertyDescriptor | undefined>;
  injectedKeys: string[];
}

const MINTER_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";

// Integrity token endpoint (same as bgutils-js internals)
const GENERATE_IT_URL =
  "https://jnn-pa.googleapis.com/$rpc/google.internal.waa.v1.Waa/GenerateIT";
const IT_HEADERS = {
  "content-type": "application/json+protobuf",
  "x-goog-api-key": "AIzaSyDyT5W0Jh49F30Pqqtyfdf7pDLFKLJoAnw",
  "x-user-agent": "grpc-web-javascript/0.1",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36(KHTML, like Gecko)",
};

let cachedMinter: CachedMinter | null = null;

/**
 * Temporarily inject JSDOM globals onto globalThis, run a callback,
 * then restore the originals. BotGuard's VM closures reference `window`
 * etc. on the global scope, so we must provide them during minting.
 */
async function withDomGlobals<T>(
  cached: CachedMinter,
  fn: () => Promise<T>
): Promise<T> {
  const globalObj = globalThis as Record<string, unknown>;

  // Inject
  for (const [key, value] of Object.entries(cached.domGlobals)) {
    Object.defineProperty(globalObj, key, {
      value,
      writable: true,
      configurable: true,
    });
  }

  try {
    return await fn();
  } finally {
    // Restore originals
    for (const key of cached.injectedKeys) {
      const desc = cached.savedDescriptors[key];
      if (desc) {
        Object.defineProperty(globalObj, key, desc);
      } else {
        delete globalObj[key];
      }
    }
  }
}

/**
 * Run the full BotGuard challenge and create a WebPoMinter that can mint
 * both session-bound and content-bound PO tokens.
 *
 * The minter is cached so we only run the expensive BotGuard challenge once.
 * Individual tokens are cheap to mint (~1ms each).
 */
async function createMinter(): Promise<CachedMinter> {
  const yt = await Innertube.create({
    generate_session_locally: true,
    retrieve_player: false,
  });

  const visitorData = yt.session.context.client.visitorData;
  if (!visitorData) {
    throw new Error("Failed to get visitorData from Innertube session");
  }

  const dom = new JSDOM(
    "<!DOCTYPE html><html><head></head><body></body></html>",
    { url: "https://www.youtube.com/", runScripts: "dangerously" }
  );

  // Save original descriptors so we can restore them after each mint
  const globalObj = globalThis as Record<string, unknown>;
  const injectedKeys: string[] = [];
  const savedDescriptors: Record<string, PropertyDescriptor | undefined> = {};

  const domGlobals: Record<string, unknown> = {
    document: dom.window.document,
    window: dom.window,
    location: dom.window.location,
    origin: dom.window.origin,
    navigator: dom.window.navigator,
  };

  for (const [key, value] of Object.entries(domGlobals)) {
    savedDescriptors[key] = Object.getOwnPropertyDescriptor(globalObj, key);
    Object.defineProperty(globalObj, key, {
      value,
      writable: true,
      configurable: true,
    });
    injectedKeys.push(key);
  }

  try {
    const bgConfig = {
      fetch: fetch as typeof globalThis.fetch,
      globalObj: globalObj as Record<string, unknown>,
      identifier: visitorData,
      requestKey: REQUEST_KEY,
    };

    const bgChallenge = await BG.Challenge.create(bgConfig);

    if (
      !bgChallenge?.interpreterJavascript
        ?.privateDoNotAccessOrElseSafeScriptWrappedValue
    ) {
      throw new Error("BotGuard challenge did not return interpreter script");
    }

    // Execute in Node's global context (not JSDOM's) so instanceof checks work
    new Function(
      bgChallenge.interpreterJavascript
        .privateDoNotAccessOrElseSafeScriptWrappedValue
    )();

    // Replicate BG.PoToken.generate() internals but keep the WebPoMinter alive
    // for per-video content-bound token minting.
    const botguard = await BG.BotGuardClient.create({
      program: bgChallenge.program,
      globalName: bgChallenge.globalName,
      globalObj: bgConfig.globalObj,
    });

    const webPoSignalOutput: WebPoSignalOutput = [];
    const botguardResponse = await botguard.snapshot({ webPoSignalOutput });

    // Fetch integrity token from Google's WAA service
    const itResponse = await fetch(GENERATE_IT_URL, {
      method: "POST",
      headers: IT_HEADERS,
      body: JSON.stringify([REQUEST_KEY, botguardResponse]),
    });

    const itJson = await itResponse.json();
    const [
      integrityToken,
      estimatedTtlSecs,
      mintRefreshThreshold,
      websafeFallbackToken,
    ] = itJson;

    const integrityTokenData: IntegrityTokenData = {
      integrityToken,
      estimatedTtlSecs,
      mintRefreshThreshold,
      websafeFallbackToken,
    };

    const minter = await BG.WebPoMinter.create(
      integrityTokenData,
      webPoSignalOutput
    );

    // Mint the session-bound token (bound to visitorData) while globals are up
    const sessionToken = await minter.mintAsWebsafeString(visitorData);

    return {
      minter,
      sessionToken,
      visitorData,
      generatedAt: Date.now(),
      dom,
      domGlobals,
      savedDescriptors,
      injectedKeys,
    };
  } finally {
    // Restore globals — we'll re-inject them briefly for each mint call
    for (const key of injectedKeys) {
      const desc = savedDescriptors[key];
      if (desc) {
        Object.defineProperty(globalObj, key, desc);
      } else {
        delete globalObj[key];
      }
    }
  }
}

/**
 * Clean up a cached minter's JSDOM instance.
 */
function disposeMinter(cached: CachedMinter): void {
  try {
    cached.dom.window.close();
  } catch {
    // ignore cleanup errors
  }
}

/**
 * Get PO token capabilities, using cached minter if still valid.
 *
 * Returns:
 * - poToken: session-bound token (for Innertube.create)
 * - visitorData: visitor data (for Innertube.create)
 * - mintContentToken(videoId): mint a content-bound token per video
 *
 * Returns null on failure (graceful degradation).
 */
export async function getPoToken(): Promise<PoTokenResult | null> {
  if (cachedMinter && Date.now() - cachedMinter.generatedAt < MINTER_TTL_MS) {
    console.log("[po-token] Using cached minter");
    const cached = cachedMinter;
    return {
      poToken: cached.sessionToken,
      visitorData: cached.visitorData,
      mintContentToken: (id) =>
        withDomGlobals(cached, () => cached.minter.mintAsWebsafeString(id)),
    };
  }

  // Clean up old minter
  if (cachedMinter) {
    disposeMinter(cachedMinter);
    cachedMinter = null;
  }

  try {
    const start = Date.now();
    cachedMinter = await createMinter();
    const elapsed = Date.now() - start;

    console.log(`[po-token] Minter created in ${elapsed}ms`);
    const cached = cachedMinter;
    return {
      poToken: cached.sessionToken,
      visitorData: cached.visitorData,
      mintContentToken: (id) =>
        withDomGlobals(cached, () => cached.minter.mintAsWebsafeString(id)),
    };
  } catch (error) {
    console.error("[po-token] Failed to create minter:", error);
    return null;
  }
}

/**
 * Clear the cached minter (for testing).
 */
export function clearPoTokenCache(): void {
  if (cachedMinter) {
    disposeMinter(cachedMinter);
    cachedMinter = null;
  }
}
