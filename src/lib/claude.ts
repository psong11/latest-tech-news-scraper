import Anthropic from "@anthropic-ai/sdk";
import type { SummaryData } from "@/types";

const MODEL = "claude-sonnet-4-20250514";

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey });
}

const SYSTEM_PROMPT = `You are an expert AI news analyst. Your job is to produce clear, well-structured summaries of YouTube videos about AI and technology news.

You must respond with valid JSON only — no markdown code fences, no extra text. Use this exact structure:

{
  "generatedTitle": "A concise, descriptive title for the summary",
  "keyTakeaways": ["3-5 bullet points capturing the most important points"],
  "detailedSummary": "A comprehensive markdown summary (3-6 paragraphs) covering all major topics discussed. Use **bold** for emphasis on key terms, names, and versions. Use ## headings to separate major topics if the video covers multiple subjects.",
  "notableQuotes": ["Direct or closely paraphrased quotes from the speaker(s) that are particularly insightful or noteworthy. Include attribution if multiple speakers."],
  "announcements": ["Specific product launches, version releases, partnerships, research papers, or other concrete announcements mentioned in the video. Include dates, version numbers, and company names where available. Return an empty array if none."]
}

Guidelines:
- Be specific: include exact names, version numbers, dates, and companies mentioned
- Do not speculate or add information not present in the transcript
- The detailed summary should be readable and well-organized, not just a list
- Keep the tone professional but approachable
- If the transcript is messy (auto-generated), do your best to infer the correct terms`;

function buildUserPrompt(
  transcript: string,
  videoTitle: string,
  channelName: string
): string {
  return `Summarize the following YouTube video transcript.

Video Title: ${videoTitle}
Channel: ${channelName}

Transcript:
${transcript}`;
}

export async function* streamSummarization(
  transcript: string,
  videoTitle: string,
  channelName: string,
  signal?: AbortSignal
): AsyncGenerator<
  { type: "text"; text: string } | { type: "usage"; promptTokens: number; completionTokens: number },
  void,
  unknown
> {
  const client = getClient();

  const stream = await client.messages.stream(
    {
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(transcript, videoTitle, channelName),
        },
      ],
    },
    { signal }
  );

  for await (const event of stream) {
    if (event.type === "content_block_delta") {
      const delta = event.delta;
      if ("text" in delta) {
        yield { type: "text", text: delta.text };
      }
    }
  }

  const finalMessage = await stream.finalMessage();
  yield {
    type: "usage",
    promptTokens: finalMessage.usage.input_tokens,
    completionTokens: finalMessage.usage.output_tokens,
  };
}

export function parseStructuredSummary(rawText: string): SummaryData {
  // Try direct JSON parse first
  try {
    const parsed = JSON.parse(rawText);
    return validateSummary(parsed);
  } catch {
    // Try extracting JSON from potential markdown code fences
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return validateSummary(parsed);
      } catch {
        // Fall through to fallback
      }
    }

    // Try finding JSON object in the text
    const braceMatch = rawText.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try {
        const parsed = JSON.parse(braceMatch[0]);
        return validateSummary(parsed);
      } catch {
        // Fall through to fallback
      }
    }

    // Fallback: treat raw text as the summary
    return {
      generatedTitle: "Video Summary",
      keyTakeaways: ["See detailed summary below"],
      detailedSummary: rawText,
      notableQuotes: [],
      announcements: [],
    };
  }
}

function validateSummary(data: Record<string, unknown>): SummaryData {
  return {
    generatedTitle:
      typeof data.generatedTitle === "string"
        ? data.generatedTitle
        : "Video Summary",
    keyTakeaways: Array.isArray(data.keyTakeaways)
      ? data.keyTakeaways.map(String)
      : ["See detailed summary below"],
    detailedSummary:
      typeof data.detailedSummary === "string"
        ? data.detailedSummary
        : "No summary available",
    notableQuotes: Array.isArray(data.notableQuotes)
      ? data.notableQuotes.map(String)
      : [],
    announcements: Array.isArray(data.announcements)
      ? data.announcements.map(String)
      : [],
  };
}
