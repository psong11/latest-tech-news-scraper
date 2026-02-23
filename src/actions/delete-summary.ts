"use server";

import { db } from "@/lib/db";
import { summaries, videos, transcripts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteSummary(summaryId: number) {
  const summary = await db.query.summaries.findFirst({
    where: eq(summaries.id, summaryId),
  });

  if (!summary) {
    throw new Error("Summary not found");
  }

  // Delete the summary
  await db.delete(summaries).where(eq(summaries.id, summaryId));

  // Check if the video has any remaining summaries
  const remainingSummaries = await db.query.summaries.findFirst({
    where: eq(summaries.videoId, summary.videoId),
  });

  // If no more summaries, clean up the video and transcript too
  if (!remainingSummaries) {
    await db.delete(transcripts).where(eq(transcripts.videoId, summary.videoId));
    await db.delete(videos).where(eq(videos.id, summary.videoId));
  }

  revalidatePath("/summaries");
  revalidatePath("/");
  redirect("/summaries");
}
