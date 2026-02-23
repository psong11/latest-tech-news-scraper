import { describe, it, expect } from "vitest";
import { extractYouTubeId, isValidYouTubeUrl } from "@/lib/youtube";

describe("extractYouTubeId", () => {
  it("extracts ID from standard watch URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts ID from watch URL with extra params", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120")).toBe("dQw4w9WgXcQ");
  });

  it("extracts ID from short URL", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts ID from embed URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts ID from /v/ URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/v/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts ID from shorts URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for invalid URL", () => {
    expect(extractYouTubeId("https://google.com")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractYouTubeId("")).toBeNull();
  });

  it("returns null for non-YouTube URL with 11 char path", () => {
    expect(extractYouTubeId("https://example.com/dQw4w9WgXcQ")).toBeNull();
  });

  it("handles URL without protocol prefix", () => {
    expect(extractYouTubeId("youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
});

describe("isValidYouTubeUrl", () => {
  it("returns true for valid YouTube URL", () => {
    expect(isValidYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
  });

  it("returns false for non-YouTube URL", () => {
    expect(isValidYouTubeUrl("https://google.com")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidYouTubeUrl("")).toBe(false);
  });
});
