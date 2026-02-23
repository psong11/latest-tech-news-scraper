import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Lightbulb,
  Quote,
  Megaphone,
  Clock,
  Calendar,
  ExternalLink,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SummaryWithVideo } from "@/types";
import { DeleteSummaryButton } from "@/components/delete-summary-button";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function SummaryDetail({ summary }: { summary: SummaryWithVideo }) {
  return (
    <article className="space-y-6">
      {/* Video Header */}
      <div className="flex flex-col gap-4 sm:flex-row">
        {summary.video.thumbnailUrl && (
          <div className="relative h-40 w-full flex-shrink-0 overflow-hidden rounded-lg bg-muted sm:w-64">
            <Image
              src={summary.video.thumbnailUrl}
              alt={summary.video.title ?? "Video thumbnail"}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 256px"
            />
          </div>
        )}
        <div className="flex-1 space-y-2">
          <h1 className="text-2xl font-bold">
            {summary.generatedTitle || summary.video.title || "Untitled"}
          </h1>
          <p className="text-muted-foreground">
            {summary.video.channelName}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Summarized {formatDate(summary.createdAt)}
            </span>
            {summary.video.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDuration(summary.video.duration)}
              </span>
            )}
            <Badge variant="secondary">{summary.modelUsed}</Badge>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <a
              href={summary.video.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Watch on YouTube
              <ExternalLink className="h-3 w-3" />
            </a>
            <DeleteSummaryButton summaryId={summary.id} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Key Takeaways */}
      {summary.keyTakeaways && summary.keyTakeaways.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Key Takeaways
          </h2>
          <ul className="space-y-2 pl-6">
            {summary.keyTakeaways.map((takeaway, i) => (
              <li key={i} className="text-sm leading-relaxed">
                {takeaway}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Separator />

      {/* Detailed Summary */}
      {summary.detailedSummary && (
        <section>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {summary.detailedSummary}
            </ReactMarkdown>
          </div>
        </section>
      )}

      {/* Notable Quotes */}
      {summary.notableQuotes && summary.notableQuotes.length > 0 && (
        <>
          <Separator />
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Quote className="h-5 w-5 text-blue-500" />
              Notable Quotes
            </h2>
            <div className="space-y-3">
              {summary.notableQuotes.map((quote, i) => (
                <blockquote
                  key={i}
                  className="border-l-2 border-muted-foreground/30 pl-4 text-sm italic text-muted-foreground"
                >
                  {quote}
                </blockquote>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Announcements */}
      {summary.announcements && summary.announcements.length > 0 && (
        <>
          <Separator />
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Megaphone className="h-5 w-5 text-green-500" />
              Announcements
            </h2>
            <ul className="space-y-2 pl-6">
              {summary.announcements.map((ann, i) => (
                <li key={i} className="text-sm leading-relaxed">
                  {ann}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {/* Token Usage */}
      {(summary.promptTokens || summary.completionTokens) && (
        <>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Tokens used: {summary.promptTokens?.toLocaleString()} input /{" "}
            {summary.completionTokens?.toLocaleString()} output
          </p>
        </>
      )}
    </article>
  );
}
