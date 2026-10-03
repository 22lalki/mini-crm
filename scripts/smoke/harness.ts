/**
 * Инфраструктура смоук-теста: Postgres в процессе (PGlite через TCP-сокет)
 * и заглушка Bot API. Нужна, чтобы прогнать чек-лист приёмки без внешних сервисов.
 */
import { createServer, type Server } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

export type TgCall = { method: string; body: Record<string, unknown> };

export type Harness = {
  databaseUrl: string;
  telegramApiBase: string;
  calls: TgCall[];
  lastCall: (method?: string) => TgCall | undefined;
  clearCalls: () => void;
  stop: () => Promise<void>;
};

export async function startHarness(pgPort: number, tgPort: number): Promise<Harness> {
  const pglite = await PGlite.create();

  // Схема берётся из сгенерированных drizzle-kit миграций — проверяем именно их.
  const dir = join(process.cwd(), "drizzle");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed.length > 0) await pglite.exec(trimmed);
    }
  }

  const pgServer = new PGLiteSocketServer({
    db: pglite,
    host: "127.0.0.1",
    port: pgPort,
    maxConnections: 5,
  });
  await pgServer.start();

  const calls: TgCall[] = [];
  const tgServer: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const method = (req.url ?? "").split("/").pop() ?? "";
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as Record<string, unknown>;
      } catch {
        body = {};
      }
      calls.push({ method, body });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, result: true }));
    });
  });
  await new Promise<void>((resolve) => tgServer.listen(tgPort, "127.0.0.1", resolve));

  return {
    databaseUrl: `postgresql://postgres:postgres@127.0.0.1:${pgPort}/postgres`,
    telegramApiBase: `http://127.0.0.1:${tgPort}`,
    calls,
    lastCall: (method) =>
      [...calls].reverse().find((c) => (method ? c.method === method : true)),
    clearCalls: () => {
      calls.length = 0;
    },
    stop: async () => {
      await new Promise<void>((resolve) => tgServer.close(() => resolve()));
      await pgServer.stop();
      await pglite.close();
    },
  };
}

/** Тот же алгоритм, что в lib/session.ts — чтобы выписать себе валидную cookie. */
export async function makeSessionCookie(secret: string, expiresAt = Date.now() + 60_000) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const payload = String(expiresAt);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const base64url = Buffer.from(signature).toString("base64url");
  return `${payload}.${base64url}`;
}
