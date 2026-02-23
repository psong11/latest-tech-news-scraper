import { Innertube } from "youtubei.js";
import type { TranscriptResult } from "@/types";

let innertube: Innertube | null = null;

async function getInnertube(): Promise<Innertube> {
  if (!innertube) {
    innertube = await Innertube.create({
      lang: "en",
      location: "US",
      generate_session_locally: true,
    });
  }
  return innertube;
}

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}

interface Json3Event {
  segs?: { utf8: string }[];
}

/**
 * Extract plain text from YouTube json3 caption format.
 */
function parseJson3ToText(json3: string): string {
  const data = JSON.parse(json3);
  const events: Json3Event[] = data.events ?? [];

  const textParts: string[] = [];
  for (const event of events) {
    if (event.segs) {
      const segText = event.segs
        .map((s) => s.utf8)
        .join("")
        .replace(/\n/g, " ");
      if (segText.trim()) {
        textParts.push(segText.trim());
      }
    }
  }

  return textParts.join(" ");
}

export async function fetchTranscript(
  videoId: string
): Promise<TranscriptResult> {
  const yt = await getInnertube();
  const info = await yt.getInfo(videoId);

  const title = info.basic_info.title ?? "Unknown Title";
  const channel = info.basic_info.channel?.name ?? "Unknown Channel";
  const duration = info.basic_info.duration ?? 0;

  const thumbnailList = info.basic_info.thumbnail ?? [];
  const thumbnail =
    thumbnailList.length > 0
      ? thumbnailList[thumbnailList.length - 1].url
      : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const publishedText = info.primary_info?.published?.text;
  let publishedAt: Date | null = null;
  if (publishedText) {
    const parsed = new Date(publishedText);
    if (!isNaN(parsed.getTime())) {
      publishedAt = parsed;
    }
  }

  // Get caption tracks from player response
  const captionTracks = info.captions?.caption_tracks;

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("No captions available for this video");
  }

  // Prefer English manual captions, then English auto, then any
  const englishManual = captionTracks.find(
    (t) => t.language_code === "en" && t.kind !== "asr"
  );
  const englishAuto = captionTracks.find(
    (t) => t.language_code === "en" && t.kind === "asr"
  );
  const anyManual = captionTracks.find((t) => t.kind !== "asr");
  const selectedTrack =
    englishManual || englishAuto || anyManual || captionTracks[0];
  const source: "manual" | "auto" =
    selectedTrack.kind === "asr" ? "auto" : "manual";

  // Fetch captions using the session's HTTP client (has proper auth context)
  const captionUrl = new URL(selectedTrack.base_url);
  captionUrl.searchParams.set("fmt", "json3");

  const response = await yt.session.http.fetch(captionUrl);
  const json3Text = await response.text();

  if (!json3Text || json3Text.length === 0) {
    throw new Error("Failed to fetch captions: empty response");
  }

  const transcriptText = parseJson3ToText(json3Text);

  if (transcriptText.trim().length < 50) {
    throw new Error("Transcript too short to summarize");
  }

  return {
    metadata: {
      title,
      channel,
      thumbnail,
      duration,
      publishedAt,
    },
    transcript: transcriptText,
    source,
  };
}
