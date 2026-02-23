import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { videos, transcripts, summaries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { extractYouTubeId, isValidYouTubeUrl, fetchTranscript } from "@/lib/youtube";
import { streamSummarization, parseStructuredSummary } from "@/lib/claude";

function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const urls: string[] = body.urls;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return new Response(JSON.stringify({ error: "No URLs provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (urls.length > 5) {
    return new Response(
      JSON.stringify({ error: "Maximum 5 URLs at a time" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEncode(event, data)));
      };

      for (const url of urls) {
        try {
          // Validate URL
          if (!isValidYouTubeUrl(url)) {
            send("error", { url, message: "Invalid YouTube URL" });
            continue;
          }

          const videoId = extractYouTubeId(url)!;

          // Check for existing summary
          const existingVideo = await db.query.videos.findFirst({
            where: eq(videos.youtubeId, videoId),
            with: { summaries: true },
          });

          if (existingVideo?.summaries?.length) {
            const completedSummary = existingVideo.summaries.find(
              (s) => s.status === "completed"
            );
            if (completedSummary) {
              send("existing_summary", {
                url,
                summaryId: completedSummary.id,
                title: completedSummary.generatedTitle,
              });
              continue;
            }
          }

          // Fetch transcript
          send("status", { url, step: "extracting_captions" });

          const result = await fetchTranscript(videoId);

          send("video_info", { url, metadata: result.metadata });

          // Save or update video record
          let videoRecordId: number;
          if (existingVideo) {
            videoRecordId = existingVideo.id;
          } else {
            const [inserted] = await db
              .insert(videos)
              .values({
                youtubeUrl: url,
                youtubeId: videoId,
                title: result.metadata.title,
                channelName: result.metadata.channel,
                thumbnailUrl: result.metadata.thumbnail,
                duration: result.metadata.duration,
                publishedAt: result.metadata.publishedAt,
              })
              .returning();
            videoRecordId = inserted.id;
          }

          // Save transcript
          await db.insert(transcripts).values({
            videoId: videoRecordId,
            language: "en",
            source: result.source,
            rawText: result.transcript,
          });

          // Create pending summary
          const [summaryRecord] = await db
            .insert(summaries)
            .values({
              videoId: videoRecordId,
              status: "processing",
              modelUsed: "claude-sonnet-4-20250514",
            })
            .returning();

          // Stream Claude summarization
          send("status", { url, step: "summarizing" });

          let fullText = "";

          try {
            for await (const chunk of streamSummarization(
              result.transcript,
              result.metadata.title,
              result.metadata.channel,
              request.signal
            )) {
              if (chunk.type === "text") {
                fullText += chunk.text;
                send("summary_chunk", { url, text: chunk.text });
              } else if (chunk.type === "usage") {
                // Parse and save the completed summary
                const parsed = parseStructuredSummary(fullText);

                await db
                  .update(summaries)
                  .set({
                    generatedTitle: parsed.generatedTitle,
                    keyTakeaways: parsed.keyTakeaways,
                    detailedSummary: parsed.detailedSummary,
                    notableQuotes: parsed.notableQuotes,
                    announcements: parsed.announcements,
                    promptTokens: chunk.promptTokens,
                    completionTokens: chunk.completionTokens,
                    status: "completed",
                    updatedAt: new Date(),
                  })
                  .where(eq(summaries.id, summaryRecord.id));

                send("summary_complete", {
                  url,
                  summaryId: summaryRecord.id,
                  summary: parsed,
                });
              }
            }
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Summarization failed";

            await db
              .update(summaries)
              .set({
                status: "failed",
                errorMessage: message,
                updatedAt: new Date(),
              })
              .where(eq(summaries.id, summaryRecord.id));

            send("error", { url, message });
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Unknown error";
          send("error", { url, message });
        }
      }

      send("done", {});
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
