import { db } from "@/lib/db";
import { summaries, videos } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { SummaryCard } from "@/components/summary-card";
import type { SummaryWithVideo } from "@/types";

interface SummaryListProps {
  limit?: number;
}

export async function SummaryList({ limit }: SummaryListProps) {
  const results = await db
    .select()
    .from(summaries)
    .innerJoin(videos, eq(summaries.videoId, videos.id))
    .orderBy(desc(summaries.createdAt))
    .limit(limit ?? 50);

  if (results.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No summaries yet. Paste a YouTube URL above to get started.
      </p>
    );
  }

  const summaryList: SummaryWithVideo[] = results.map((r) => ({
    ...r.summaries,
    video: r.videos,
  }));

  return (
    <div className="space-y-3">
      {summaryList.map((summary) => (
        <SummaryCard key={summary.id} summary={summary} />
      ))}
    </div>
  );
}
