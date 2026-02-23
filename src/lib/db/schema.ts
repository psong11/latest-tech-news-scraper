import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  youtubeUrl: text("youtube_url").notNull(),
  youtubeId: text("youtube_id").notNull().unique(),
  title: text("title"),
  channelName: text("channel_name"),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transcripts = pgTable("transcripts", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id")
    .references(() => videos.id, { onDelete: "cascade" })
    .notNull(),
  language: text("language").default("en").notNull(),
  source: text("source").notNull(), // 'manual' | 'auto'
  rawText: text("raw_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const summaries = pgTable("summaries", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id")
    .references(() => videos.id, { onDelete: "cascade" })
    .notNull(),
  generatedTitle: text("generated_title"),
  keyTakeaways: jsonb("key_takeaways").$type<string[]>(),
  detailedSummary: text("detailed_summary"),
  notableQuotes: jsonb("notable_quotes").$type<string[]>(),
  announcements: jsonb("announcements").$type<string[]>(),
  modelUsed: text("model_used"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  status: text("status").notNull().default("pending"), // 'pending' | 'processing' | 'completed' | 'failed'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const videosRelations = relations(videos, ({ many }) => ({
  transcripts: many(transcripts),
  summaries: many(summaries),
}));

export const transcriptsRelations = relations(transcripts, ({ one }) => ({
  video: one(videos, {
    fields: [transcripts.videoId],
    references: [videos.id],
  }),
}));

export const summariesRelations = relations(summaries, ({ one }) => ({
  video: one(videos, {
    fields: [summaries.videoId],
    references: [videos.id],
  }),
}));
