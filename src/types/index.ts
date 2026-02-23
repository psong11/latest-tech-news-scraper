export interface VideoMetadata {
  title: string;
  channel: string;
  thumbnail: string;
  duration: number;
  publishedAt: Date | null;
}

export interface TranscriptResult {
  metadata: VideoMetadata;
  transcript: string;
  source: "manual" | "auto";
}

export interface SummaryData {
  generatedTitle: string;
  keyTakeaways: string[];
  detailedSummary: string;
  notableQuotes: string[];
  announcements: string[];
}

export interface SSEEvent {
  type:
    | "status"
    | "summary_chunk"
    | "summary_complete"
    | "error"
    | "done"
    | "video_info";
  url?: string;
  data: string | SummaryData | VideoMetadata;
}

export interface SummaryWithVideo {
  id: number;
  videoId: number;
  generatedTitle: string | null;
  keyTakeaways: string[] | null;
  detailedSummary: string | null;
  notableQuotes: string[] | null;
  announcements: string[] | null;
  modelUsed: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  video: {
    id: number;
    youtubeUrl: string;
    youtubeId: string;
    title: string | null;
    channelName: string | null;
    thumbnailUrl: string | null;
    duration: number | null;
    publishedAt: Date | null;
  };
}
