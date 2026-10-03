import { NextResponse } from "next/server";
import { handleUpdate } from "@/lib/bot";
import type { TgUpdate } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] TELEGRAM_WEBHOOK_SECRET не задан");
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  if (request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Telegram ретраит при не-200, поэтому ошибки обработки только логируем.
  try {
    const update = (await request.json()) as TgUpdate;
    await handleUpdate(update);
  } catch (error) {
    console.error("[webhook]", error);
  }

  return NextResponse.json({ ok: true });
}

// GET удобен, чтобы руками убедиться, что роут задеплоился.
export function GET(): NextResponse {
  return NextResponse.json({
    ok: true,
    hint: "POST only, нужен заголовок X-Telegram-Bot-Api-Secret-Token",
  });
}
