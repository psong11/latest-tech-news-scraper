import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

describe("Database connection", () => {
  it("can connect to Supabase and execute a query", async () => {
    const result = await db.execute(sql`SELECT 1 as ping`);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it("videos table exists", async () => {
    const result = await db.execute(
      sql`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'videos')`
    );
    expect(result[0].exists).toBe(true);
  });

  it("transcripts table exists", async () => {
    const result = await db.execute(
      sql`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transcripts')`
    );
    expect(result[0].exists).toBe(true);
  });

  it("summaries table exists", async () => {
    const result = await db.execute(
      sql`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'summaries')`
    );
    expect(result[0].exists).toBe(true);
  });
});
