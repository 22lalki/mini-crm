import "./env";
import { requireEnv } from "./env";

/**
 * Регистрирует webhook бота:
 *   npm run set-webhook              — выставить (url из PUBLIC_BASE_URL или из аргумента)
 *   npm run set-webhook -- https://app.vercel.app
 *   npm run delete-webhook           — снять
 */
async function main(): Promise<void> {
  const token = requireEnv("TELEGRAM_BOT_TOKEN");
  const args = process.argv.slice(2);

  if (args.includes("--delete")) {
    const res = await call(token, "deleteWebhook", { drop_pending_updates: false });
    console.log("deleteWebhook:", res);
    return;
  }

  const base = (args.find((a) => a.startsWith("http")) ?? requireEnv("PUBLIC_BASE_URL")).replace(/\/$/, "");
  const secret = requireEnv("TELEGRAM_WEBHOOK_SECRET");
  const url = `${base}/api/telegram/webhook`;

  const res = await call(token, "setWebhook", {
    url,
    secret_token: secret,
    // business_message нужен для пункта 2 (Telegram Business).
    allowed_updates: ["message", "callback_query", "business_message", "business_connection"],
    drop_pending_updates: true,
  });
  console.log("setWebhook:", res);
  console.log("webhook url:", url);

  const info = await call(token, "getWebhookInfo", {});
  console.log("getWebhookInfo:", JSON.stringify(info, null, 2));
}

async function call(token: string, method: string, body: unknown): Promise<unknown> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
