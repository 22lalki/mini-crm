import "./env";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { databaseUrlForDdl } from "./env";

async function main(): Promise<void> {
  const connectionString = databaseUrlForDdl();
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("Миграции применены.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
