import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

let _db: ReturnType<typeof getDb> | undefined;

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop, receiver) {
    if (!_db) {
      _db = getDb();
    }
    return Reflect.get(_db, prop, receiver);
  },
});
