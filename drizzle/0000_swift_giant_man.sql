CREATE TABLE "summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_id" integer NOT NULL,
	"generated_title" text,
	"key_takeaways" jsonb,
	"detailed_summary" text,
	"notable_quotes" jsonb,
	"announcements" jsonb,
	"model_used" text,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcripts" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_id" integer NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"source" text NOT NULL,
	"raw_text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"youtube_url" text NOT NULL,
	"youtube_id" text NOT NULL,
	"title" text,
	"channel_name" text,
	"thumbnail_url" text,
	"duration" integer,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "videos_youtube_id_unique" UNIQUE("youtube_id")
);
--> statement-breakpoint
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;