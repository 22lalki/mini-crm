import "./env";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { tags } from "../db/schema";
import { DEFAULT_TAGS } from "../lib/constants";
import { databaseUrlForDdl } from "./env";

async function main(): Promise<void> {
  const connectionString = databaseUrlForDdl();
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  const db = drizzle(pool);

  await db.insert(tags).values(DEFAULT_TAGS).onConflictDoNothing({ target: tags.name });

  const all = await db.select({ name: tags.name }).from(tags);
  console.log(`Теги в базе: ${all.map((t) => t.name).join(", ")}`);
  await pool.end();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
