import { Innertube } from "youtubei.js";
import { BG } from "bgutils-js";

interface CachedToken {
  poToken: string;
  visitorData: string;
  generatedAt: number;
}

const TOKEN_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";

let cachedToken: CachedToken | null = null;

/**
 * Generate a fresh PO token using bgutils-js BotGuard challenge.
 *
 * BotGuard's VM must run in Node's global context (not JSDOM's) so that
 * functions it produces pass `instanceof Function` checks in bgutils-js.
 * We inject JSDOM's DOM objects onto globalThis temporarily so the
 * BotGuard interpreter can access document/window/navigator.
 */
async function generatePoToken(): Promise<{ poToken: string; visitorData: string }> {
  // Lightweight Innertube instance just to get visitorData
  const yt = await Innertube.create({
    generate_session_locally: true,
    retrieve_player: false,
  });

  const visitorData = yt.session.context.client.visitorData;
  if (!visitorData) {
    throw new Error("Failed to get visitorData from Innertube session");
  }

  // Dynamic import avoids bundling issues on Vercel (ESM/CJS compat)
  const { JSDOM } = await import("jsdom");

  // JSDOM provides DOM objects that BotGuard scripts expect
  const dom = new JSDOM(
    '<!DOCTYPE html><html><head></head><body></body></html>',
    { url: "https://www.youtube.com/", runScripts: "dangerously" }
  );

  // Temporarily inject DOM globals so BotGuard script can access them.
  // Some (like navigator) are read-only getters, so use defineProperty.
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

    if (!bgChallenge?.interpreterJavascript?.privateDoNotAccessOrElseSafeScriptWrappedValue) {
      throw new Error("BotGuard challenge did not return interpreter script");
    }

    // Execute in Node's global context (not JSDOM's) so instanceof checks work
    new Function(bgChallenge.interpreterJavascript.privateDoNotAccessOrElseSafeScriptWrappedValue)();

    const poTokenResult = await BG.PoToken.generate({
      program: bgChallenge.program,
      globalName: bgChallenge.globalName,
      bgConfig,
    });

    return { poToken: poTokenResult.poToken, visitorData };
  } finally {
    // Restore/clean up injected globals
    for (const key of injectedKeys) {
      const desc = savedDescriptors[key];
      if (desc) {
        Object.defineProperty(globalObj, key, desc);
      } else {
        delete globalObj[key];
      }
    }
    dom.window.close();
  }
}

/**
 * Get a PO token, using cache if still valid.
 * Returns null on failure (graceful degradation).
 */
export async function getPoToken(): Promise<{ poToken: string; visitorData: string } | null> {
  // Return cached token if still valid
  if (cachedToken && Date.now() - cachedToken.generatedAt < TOKEN_TTL_MS) {
    console.log("[po-token] Using cached token");
    return { poToken: cachedToken.poToken, visitorData: cachedToken.visitorData };
  }

  try {
    const start = Date.now();
    const result = await generatePoToken();
    const elapsed = Date.now() - start;

    cachedToken = {
      poToken: result.poToken,
      visitorData: result.visitorData,
      generatedAt: Date.now(),
    };

    console.log(`[po-token] Token generated in ${elapsed}ms`);
    return result;
  } catch (error) {
    console.error("[po-token] Failed to generate token:", error);
    return null;
  }
}

/**
 * Clear the cached token (for testing).
 */
export function clearPoTokenCache(): void {
  cachedToken = null;
}
