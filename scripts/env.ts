import { config } from "dotenv";

// .env.local имеет приоритет над .env — как в Next.js.
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Переменная окружения ${name} не задана (см. .env.example)`);
  }
  return value;
}

/**
 * Для DDL (миграции, сид) берём прямое подключение, если оно задано:
 * у Neon пулер работает в transaction mode и для схемных операций не предназначен.
 */
export function databaseUrlForDdl(): string {
  return process.env["DATABASE_URL_DIRECT"] || requireEnv("DATABASE_URL");
}
