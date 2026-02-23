import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h2 className="text-2xl font-bold">Summary not found</h2>
      <p className="mt-2 text-muted-foreground">
        The summary you&apos;re looking for doesn&apos;t exist or has been deleted.
      </p>
      <Button asChild className="mt-4" variant="outline">
        <Link href="/summaries">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to summaries
        </Link>
      </Button>
    </div>
  );
}
