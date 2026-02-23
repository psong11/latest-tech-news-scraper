import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SummaryWithVideo } from "@/types";
import { Clock, Calendar } from "lucide-react";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function SummaryCard({ summary }: { summary: SummaryWithVideo }) {
  return (
    <Link href={`/summaries/${summary.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <div className="flex gap-4 p-4">
          {/* Thumbnail */}
          <div className="relative h-24 w-40 flex-shrink-0 overflow-hidden rounded-md bg-muted">
            {summary.video.thumbnailUrl ? (
              <Image
                src={summary.video.thumbnailUrl}
                alt={summary.video.title ?? "Video thumbnail"}
                fill
                className="object-cover"
                sizes="160px"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No thumbnail
              </div>
            )}
            {summary.video.duration && (
              <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white">
                {formatDuration(summary.video.duration)}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <CardHeader className="p-0 pb-1">
              <h3 className="line-clamp-2 text-sm font-semibold leading-tight">
                {summary.generatedTitle || summary.video.title || "Untitled"}
              </h3>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-xs text-muted-foreground">
                {summary.video.channelName}
              </p>
              {summary.keyTakeaways && summary.keyTakeaways.length > 0 && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {summary.keyTakeaways[0]}
                </p>
              )}
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(summary.createdAt)}
                </span>
                {summary.video.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(summary.video.duration)}
                  </span>
                )}
                <Badge
                  variant={
                    summary.status === "completed" ? "default" : "secondary"
                  }
                  className="text-[10px]"
                >
                  {summary.status}
                </Badge>
              </div>
            </CardContent>
          </div>
        </div>
      </Card>
    </Link>
  );
}
