import { Suspense } from "react";
import { SummaryList } from "@/components/summary-list";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function SummariesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Summary History</h1>
        <p className="mt-2 text-muted-foreground">
          Browse all past video summaries.
        </p>
      </div>

      <Suspense fallback={<SummaryListSkeleton />}>
        <SummaryList />
      </Suspense>
    </div>
  );
}

function SummaryListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4 rounded-lg border p-4">
          <Skeleton className="h-24 w-40 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
