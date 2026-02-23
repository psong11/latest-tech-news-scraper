import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { summaries, videos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SummaryDetail } from "@/components/summary-detail";
import type { SummaryWithVideo } from "@/types";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SummaryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const summaryId = parseInt(id, 10);

  if (isNaN(summaryId)) {
    notFound();
  }

  const result = await db
    .select()
    .from(summaries)
    .innerJoin(videos, eq(summaries.videoId, videos.id))
    .where(eq(summaries.id, summaryId))
    .limit(1);

  if (result.length === 0) {
    notFound();
  }

  const summary: SummaryWithVideo = {
    ...result[0].summaries,
    video: result[0].videos,
  };

  return (
    <div className="space-y-4">
      <Link
        href="/summaries"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to summaries
      </Link>

      <SummaryDetail summary={summary} />
    </div>
  );
}
