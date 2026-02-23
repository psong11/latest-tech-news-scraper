# AI News Video Summarizer

## What This Is
Personal web app to summarize YouTube videos about AI news. Paste a URL, get a structured digest (key takeaways, detailed summary, quotes, announcements). Summaries are saved to Supabase for future reference.

## Tech Stack
- **Next.js 15** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** + shadcn/ui
- **Supabase** (hosted PostgreSQL) + **Drizzle ORM**
- **youtubei.js** for YouTube metadata + caption fetching
- **@anthropic-ai/sdk** (Claude Sonnet 4) for summarization
- **SSE streaming** for real-time summary generation

## Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── api/summarize/      # POST SSE streaming endpoint
│   ├── summaries/          # History + detail pages
│   └── page.tsx            # Home: URL input + recent summaries
├── components/             # React components (ui/ = shadcn primitives)
├── lib/
│   ├── db/                 # Drizzle schema + client
│   ├── youtube.ts          # URL validation, transcript fetching
│   └── claude.ts           # Anthropic streaming + JSON parsing
├── actions/                # Server Actions (delete summary)
├── types/                  # Shared TypeScript types
└── __tests__/              # Vitest test suite
```

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm test` — Run all tests (Vitest)
- `npm run test:watch` — Watch mode tests
- `npx drizzle-kit generate` — Generate migration from schema changes
- `DATABASE_URL="..." npx drizzle-kit migrate` — Run migrations (env var needed explicitly for drizzle-kit CLI)

## Database
3 tables in Supabase: `videos`, `transcripts`, `summaries`. Schema defined in `src/lib/db/schema.ts`. Drizzle migrations live in `drizzle/`.

## Key Technical Decisions

### YouTube Transcript Fetching
- **youtubei.js** caption track URLs contain `ip=0.0.0.0` which returns empty when fetched with standard `fetch()`
- **Must use `yt.session.http.fetch()`** (the Innertube session's HTTP client) to download captions — it has the proper auth context
- Captions are fetched in `json3` format and parsed to plain text
- `generate_session_locally: true` is required when creating the Innertube instance

### Claude Summarization
- Model: `claude-sonnet-4-20250514`
- Output: structured JSON with `generatedTitle`, `keyTakeaways`, `detailedSummary`, `notableQuotes`, `announcements`
- `parseStructuredSummary()` has multiple fallback layers: direct JSON → code fence extraction → brace matching → raw text fallback

### Streaming
- API route uses SSE (Server-Sent Events) with events: `status`, `video_info`, `summary_chunk`, `summary_complete`, `existing_summary`, `error`, `done`
- Client prevents concurrent summarizations

## Environment Variables
```
ANTHROPIC_API_KEY=...
DATABASE_URL=postgresql://...
```
Both set in `.env.local` (gitignored). See `.env.example` for template.

## Future Work (Phase 8)
- MCP server exposing tools: `summarize_video(url)`, `get_recent_summaries()`, `search_summaries(query)`
- Share core logic (youtube.ts, claude.ts, db) with the web UI
- Connect to Claude Desktop for in-chat video summarization
