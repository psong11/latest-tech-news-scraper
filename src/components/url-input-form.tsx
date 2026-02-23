"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, AlertCircle } from "lucide-react";

interface UrlInputFormProps {
  onSubmit: (urls: string[]) => void;
  isLoading: boolean;
}

export function UrlInputForm({ onSubmit, isLoading }: UrlInputFormProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const youtubeUrlPattern =
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}/;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isLoading) {
      setError("A summarization is already in progress. Please wait for it to finish.");
      return;
    }

    const urls = input
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      setError("Please enter at least one YouTube URL");
      return;
    }

    if (urls.length > 5) {
      setError("Maximum 5 URLs at a time");
      return;
    }

    const invalid = urls.filter((u) => !youtubeUrlPattern.test(u));
    if (invalid.length > 0) {
      setError(`Invalid YouTube URL(s): ${invalid.join(", ")}`);
      return;
    }

    onSubmit(urls);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        placeholder="Paste YouTube URL(s) here — one per line or comma-separated"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setError(null);
        }}
        rows={3}
        className="resize-none"
        disabled={isLoading}
      />
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {isLoading && (
        <p className="text-xs text-muted-foreground">
          A summarization is in progress. You can submit a new URL once it finishes.
        </p>
      )}
      <Button type="submit" disabled={isLoading || !input.trim()}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Summarizing...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Summarize
          </>
        )}
      </Button>
    </form>
  );
}
