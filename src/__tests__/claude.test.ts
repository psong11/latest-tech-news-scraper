import { describe, it, expect } from "vitest";
import { parseStructuredSummary } from "@/lib/claude";

describe("parseStructuredSummary", () => {
  it("parses valid JSON correctly", () => {
    const input = JSON.stringify({
      generatedTitle: "Test Title",
      keyTakeaways: ["Point 1", "Point 2"],
      detailedSummary: "Some detailed summary text.",
      notableQuotes: ["A great quote"],
      announcements: ["New release v2.0"],
    });

    const result = parseStructuredSummary(input);

    expect(result.generatedTitle).toBe("Test Title");
    expect(result.keyTakeaways).toEqual(["Point 1", "Point 2"]);
    expect(result.detailedSummary).toBe("Some detailed summary text.");
    expect(result.notableQuotes).toEqual(["A great quote"]);
    expect(result.announcements).toEqual(["New release v2.0"]);
  });

  it("handles JSON wrapped in markdown code fences", () => {
    const input = '```json\n{"generatedTitle":"Fenced","keyTakeaways":["A"],"detailedSummary":"B","notableQuotes":[],"announcements":[]}\n```';

    const result = parseStructuredSummary(input);
    expect(result.generatedTitle).toBe("Fenced");
  });

  it("extracts JSON from surrounding text", () => {
    const input = 'Here is the summary: {"generatedTitle":"Extracted","keyTakeaways":["A"],"detailedSummary":"B","notableQuotes":[],"announcements":[]} Done.';

    const result = parseStructuredSummary(input);
    expect(result.generatedTitle).toBe("Extracted");
  });

  it("returns fallback for completely invalid input", () => {
    const input = "This is just plain text with no JSON at all.";

    const result = parseStructuredSummary(input);
    expect(result.generatedTitle).toBe("Video Summary");
    expect(result.detailedSummary).toBe(input);
    expect(result.keyTakeaways).toEqual(["See detailed summary below"]);
  });

  it("handles missing fields with defaults", () => {
    const input = JSON.stringify({
      generatedTitle: "Partial",
    });

    const result = parseStructuredSummary(input);
    expect(result.generatedTitle).toBe("Partial");
    expect(result.keyTakeaways).toEqual(["See detailed summary below"]);
    expect(result.detailedSummary).toBe("No summary available");
    expect(result.notableQuotes).toEqual([]);
    expect(result.announcements).toEqual([]);
  });

  it("handles wrong types for fields", () => {
    const input = JSON.stringify({
      generatedTitle: 123,
      keyTakeaways: "not an array",
      detailedSummary: null,
      notableQuotes: { not: "an array" },
      announcements: true,
    });

    const result = parseStructuredSummary(input);
    expect(result.generatedTitle).toBe("Video Summary");
    expect(result.keyTakeaways).toEqual(["See detailed summary below"]);
    expect(result.detailedSummary).toBe("No summary available");
    expect(result.notableQuotes).toEqual([]);
    expect(result.announcements).toEqual([]);
  });

  it("converts non-string array elements to strings", () => {
    const input = JSON.stringify({
      generatedTitle: "Mixed Types",
      keyTakeaways: [1, true, "valid"],
      detailedSummary: "Summary",
      notableQuotes: [null, "quote"],
      announcements: [42],
    });

    const result = parseStructuredSummary(input);
    expect(result.keyTakeaways).toEqual(["1", "true", "valid"]);
    expect(result.notableQuotes).toEqual(["null", "quote"]);
    expect(result.announcements).toEqual(["42"]);
  });
});
