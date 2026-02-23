import { describe, it, expect, beforeEach } from "vitest";
import { getPoToken, clearPoTokenCache } from "../lib/po-token";

describe("PO Token Generation", () => {
  beforeEach(() => {
    clearPoTokenCache();
  });

  it("generates a valid PO token and visitor data with minter", async () => {
    const result = await getPoToken();

    expect(result).not.toBeNull();
    expect(result!.poToken.length).toBeGreaterThan(50);
    expect(result!.visitorData).toBeTruthy();
    expect(result!.visitorData.length).toBeGreaterThan(0);
    expect(typeof result!.mintContentToken).toBe("function");
  }, 30_000);

  it("mints a content-bound token for a video ID", async () => {
    const result = await getPoToken();
    expect(result).not.toBeNull();

    const contentToken = await result!.mintContentToken("dQw4w9WgXcQ");
    expect(contentToken.length).toBeGreaterThan(50);
    // Content token should differ from session token (different binding)
    expect(contentToken).not.toBe(result!.poToken);
  }, 30_000);

  it("returns cached minter on second call", async () => {
    const first = await getPoToken();
    const second = await getPoToken();

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.poToken).toBe(second!.poToken);
    expect(first!.visitorData).toBe(second!.visitorData);
  }, 30_000);
});
