import { describe, it, expect } from "vitest";
import { fetchTranscript } from "@/lib/youtube";

describe("YouTube transcript fetching (integration)", () => {
  // TED talk: "Do schools kill creativity?" — long-standing video with reliable captions
  const TEST_VIDEO_ID = "iG9CE55wbtY";

  it("fetches video metadata and transcript via caption tracks", async () => {
    const result = await fetchTranscript(TEST_VIDEO_ID);

    expect(result.metadata.title).toBeDefined();
    expect(result.metadata.title.length).toBeGreaterThan(0);
    expect(result.metadata.channel).toBeDefined();
    expect(result.metadata.thumbnail).toBeDefined();
    expect(typeof result.metadata.duration).toBe("number");
    expect(result.transcript.length).toBeGreaterThan(100);
    expect(["manual", "auto"]).toContain(result.source);
  });

  it("throws on invalid video ID", async () => {
    await expect(fetchTranscript("XXXXXXXXXXX")).rejects.toThrow();
  });
});
