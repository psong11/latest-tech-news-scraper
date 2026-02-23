"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { UrlInputForm } from "@/components/url-input-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Lightbulb,
  Quote,
  Megaphone,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SummaryData, VideoMetadata } from "@/types";
import Link from "next/link";

type Step = "connecting" | "extracting_captions" | "summarizing" | "complete" | "error" | "existing";

const STEP_INFO: Record<Step, { label: string; number: number; total: number }> = {
  connecting:          { label: "Connecting to YouTube...",      number: 1, total: 3 },
  extracting_captions: { label: "Extracting captions...",        number: 1, total: 3 },
  summarizing:         { label: "Summarizing with Claude...",    number: 2, total: 3 },
  complete:            { label: "Done",                          number: 3, total: 3 },
  error:               { label: "Error",                         number: 0, total: 3 },
  existing:            { label: "Already summarized",            number: 0, total: 3 },
};

interface StreamState {
  step: Step;
  videoInfo: VideoMetadata | null;
  chunks: string;
  summary: SummaryData | null;
  summaryId: number | null;
  existingSummaryId: number | null;
  existingTitle: string | null;
  error: string | null;
  startedAt: number;
}

export function SummaryStream({ onComplete }: { onComplete?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [streams, setStreams] = useState<Record<string, StreamState>>({});
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(
    async (urls: string[]) => {
      // Prevent concurrent runs
      if (isLoading) return;

      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      // Initialize stream state for each URL
      const initial: Record<string, StreamState> = {};
      const now = Date.now();
      for (const url of urls) {
        initial[url] = {
          step: "connecting",
          videoInfo: null,
          chunks: "",
          summary: null,
          summaryId: null,
          existingSummaryId: null,
          existingTitle: null,
          error: null,
          startedAt: now,
        };
      }
      setStreams(initial);

      try {
        const response = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.json();
          setStreams((prev) => {
            const updated = { ...prev };
            for (const url of urls) {
              updated[url] = { ...updated[url], error: err.error, step: "error" };
            }
            return updated;
          });
          setIsLoading(false);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7);
            } else if (line.startsWith("data: ") && eventType) {
              try {
                const data = JSON.parse(line.slice(6));
                const url = data.url as string;

                setStreams((prev) => {
                  const updated = { ...prev };
                  const current = updated[url] || initial[urls[0]];

                  switch (eventType) {
                    case "status":
                      updated[url] = {
                        ...current,
                        step: data.step as Step,
                      };
                      break;
                    case "video_info":
                      updated[url] = {
                        ...current,
                        videoInfo: data.metadata,
                      };
                      break;
                    case "summary_chunk":
                      updated[url] = {
                        ...current,
                        chunks: current.chunks + data.text,
                      };
                      break;
                    case "summary_complete":
                      updated[url] = {
                        ...current,
                        summary: data.summary,
                        summaryId: data.summaryId,
                        step: "complete",
                      };
                      break;
                    case "existing_summary":
                      updated[url] = {
                        ...current,
                        existingSummaryId: data.summaryId,
                        existingTitle: data.title,
                        step: "existing",
                      };
                      break;
                    case "error":
                      updated[url] = {
                        ...current,
                        error: data.message,
                        step: "error",
                      };
                      break;
                  }
                  return updated;
                });
              } catch {
                // Skip malformed JSON
              }
              eventType = "";
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User cancelled — not an error
        } else {
          const message =
            err instanceof Error ? err.message : "Connection failed";
          setStreams((prev) => {
            const updated = { ...prev };
            for (const url of urls) {
              updated[url] = { ...updated[url], error: message, step: "error" };
            }
            return updated;
          });
        }
      }

      abortRef.current = null;
      setIsLoading(false);
      onComplete?.();
    },
    [isLoading, onComplete]
  );

  return (
    <div className="space-y-6">
      <UrlInputForm onSubmit={handleSubmit} isLoading={isLoading} />

      {Object.entries(streams).map(([url, state]) => (
        <Card key={url}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {state.videoInfo ? (
                  <CardTitle className="text-lg">
                    {state.videoInfo.title}
                  </CardTitle>
                ) : state.existingTitle ? (
                  <CardTitle className="text-lg">
                    {state.existingTitle}
                  </CardTitle>
                ) : (
                  <CardTitle className="truncate text-lg text-muted-foreground">
                    {url}
                  </CardTitle>
                )}
                {state.videoInfo && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {state.videoInfo.channel}
                  </p>
                )}
              </div>
              <ProgressBadge step={state.step} startedAt={state.startedAt} />
            </div>
          </CardHeader>
          <CardContent>
            {/* Progress bar for active steps */}
            {state.step !== "complete" && state.step !== "error" && state.step !== "existing" && (
              <ProgressBar step={state.step} />
            )}

            {state.error && (
              <Alert variant="destructive" className="mt-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            {state.existingSummaryId && (
              <Alert className="mt-3">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  This video was already summarized.{" "}
                  <Link
                    href={`/summaries/${state.existingSummaryId}`}
                    className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
                  >
                    View summary
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            {!state.summary && !state.error && !state.existingSummaryId && (
              <>
                {state.chunks ? (
                  <div className="mt-3 prose prose-sm max-w-none dark:prose-invert">
                    <p className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                      {state.chunks}
                    </p>
                  </div>
                ) : (
                  isLoading && state.step !== "complete" && (
                    <div className="mt-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  )
                )}
              </>
            )}

            {state.summary && (
              <SummaryDisplay
                summary={state.summary}
                summaryId={state.summaryId}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProgressBadge({ step, startedAt }: { step: Step; startedAt: number }) {
  const info = STEP_INFO[step];

  if (step === "error") return <Badge variant="destructive">Error</Badge>;
  if (step === "complete") return <Badge variant="default">Done</Badge>;
  if (step === "existing") return <Badge variant="secondary">Exists</Badge>;

  return (
    <Badge variant="outline" className="flex items-center gap-1.5 whitespace-nowrap">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>Step {info.number}/{info.total}</span>
      <span className="text-muted-foreground">·</span>
      <ElapsedTime startedAt={startedAt} />
    </Badge>
  );
}

function ElapsedTime({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <span className="tabular-nums text-muted-foreground">
      {minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}
    </span>
  );
}

function ProgressBar({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "extracting_captions", label: "Extract captions" },
    { key: "summarizing", label: "Summarize" },
    { key: "complete", label: "Save" },
  ];

  const info = STEP_INFO[step];
  const currentIndex = info.number - 1; // 0-based

  return (
    <div className="space-y-2">
      {/* Step labels */}
      <div className="flex items-center gap-2 text-xs">
        {steps.map((s, i) => {
          const isActive = i === currentIndex;
          const isDone = i < currentIndex;
          return (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-px w-6 ${isDone ? "bg-primary" : "bg-border"}`}
                />
              )}
              <div className="flex items-center gap-1.5">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium ${
                    isDone
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "border-2 border-primary text-primary"
                        : "border border-border text-muted-foreground"
                  }`}
                >
                  {isDone ? "✓" : i + 1}
                </div>
                <span
                  className={
                    isActive
                      ? "font-medium text-foreground"
                      : isDone
                        ? "text-muted-foreground"
                        : "text-muted-foreground/60"
                  }
                >
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {/* Active step description */}
      <p className="text-xs text-muted-foreground">{STEP_INFO[step].label}</p>
    </div>
  );
}

function SummaryDisplay({
  summary,
  summaryId,
}: {
  summary: SummaryData;
  summaryId: number | null;
}) {
  return (
    <div className="space-y-4">
      {/* Key Takeaways */}
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          Key Takeaways
        </h3>
        <ul className="space-y-1 pl-6">
          {summary.keyTakeaways.map((takeaway, i) => (
            <li key={i} className="text-sm">
              {takeaway}
            </li>
          ))}
        </ul>
      </div>

      <Separator />

      {/* Detailed Summary */}
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {summary.detailedSummary}
        </ReactMarkdown>
      </div>

      {/* Notable Quotes */}
      {summary.notableQuotes.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Quote className="h-4 w-4 text-blue-500" />
              Notable Quotes
            </h3>
            <div className="space-y-2">
              {summary.notableQuotes.map((quote, i) => (
                <blockquote
                  key={i}
                  className="border-l-2 border-muted-foreground/30 pl-3 text-sm italic text-muted-foreground"
                >
                  {quote}
                </blockquote>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Announcements */}
      {summary.announcements.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Megaphone className="h-4 w-4 text-green-500" />
              Announcements
            </h3>
            <ul className="space-y-1 pl-6">
              {summary.announcements.map((ann, i) => (
                <li key={i} className="text-sm">
                  {ann}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {summaryId && (
        <>
          <Separator />
          <Link
            href={`/summaries/${summaryId}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            View full summary
            <ExternalLink className="h-3 w-3" />
          </Link>
        </>
      )}
    </div>
  );
}
