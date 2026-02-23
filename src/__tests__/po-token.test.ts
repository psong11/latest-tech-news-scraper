import { describe, it, expect, beforeEach } from "vitest";
import { getPoToken, clearPoTokenCache } from "../lib/po-token";

describe("PO Token Generation", () => {
  beforeEach(() => {
    clearPoTokenCache();
  });

  it("generates a valid PO token and visitor data", async () => {
    const result = await getPoToken();

    expect(result).not.toBeNull();
    expect(result!.poToken.length).toBeGreaterThan(50);
    expect(result!.visitorData).toBeTruthy();
    expect(result!.visitorData.length).toBeGreaterThan(0);
  }, 30_000);

  it("returns cached token on second call", async () => {
    const first = await getPoToken();
    const second = await getPoToken();

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.poToken).toBe(second!.poToken);
    expect(first!.visitorData).toBe(second!.visitorData);
  }, 30_000);
});
