import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * Один пул на процесс. В serverless инстанс переиспользуется между вызовами,
 * а на globalThis пул кэшируется, чтобы hot reload в dev не плодил коннекты.
 *
 * Пул создаётся лениво по первому запросу: на этапе `next build` переменных
 * окружения может не быть, и падать на импорте модуля нельзя.
 */
const globalForDb = globalThis as unknown as { __pool?: Pool };

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("[db] DATABASE_URL не задан — запросы к базе будут падать");
  }

  const isLocal = connectionString?.includes("localhost") || connectionString?.includes("127.0.0.1");

  return new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    // Neon/Railway требуют TLS; локальный Postgres обычно без него.
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
}

function getPool(): Pool {
  const existing = globalForDb.__pool;
  if (existing) return existing;

  const pool = createPool();
  globalForDb.__pool = pool;
  return pool;
}

export const db = drizzle({ client: getPool(), schema });
