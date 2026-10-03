/** Минимальный клиент Bot API через fetch — библиотека для этого не нужна. */

/** Базовый URL Bot API. Переопределяется только в смоук-тесте (scripts/smoke). */
const API = process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org";

export type InlineKeyboardButton = { text: string; callback_data: string };
export type KeyboardButton = { text: string; request_contact?: boolean };

export type ReplyMarkup =
  | { inline_keyboard: InlineKeyboardButton[][] }
  | {
      keyboard: KeyboardButton[][];
      resize_keyboard?: boolean;
      one_time_keyboard?: boolean;
    }
  | { remove_keyboard: true };

export type TgUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type TgContact = { phone_number: string; first_name?: string; last_name?: string };

export type TgMessage = {
  message_id: number;
  from?: TgUser;
  chat: { id: number; type: string };
  text?: string;
  caption?: string;
  contact?: TgContact;
  business_connection_id?: string;
};

export type TgCallbackQuery = {
  id: string;
  from: TgUser;
  data?: string;
  message?: TgMessage;
};

export type TgUpdate = {
  update_id: number;
  message?: TgMessage;
  business_message?: TgMessage;
  callback_query?: TgCallbackQuery;
};

function token(): string {
  const value = process.env.TELEGRAM_BOT_TOKEN;
  if (!value) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  return value;
}

async function call(method: string, body: Record<string, unknown>): Promise<void> {
  // Сбой отправки не должен прерывать обработку апдейта: лид уже важнее ответа в чат.
  try {
    const response = await fetch(`${API}/bot${token()}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error(`[telegram] ${method} -> ${response.status} ${await response.text()}`);
    }
  } catch (error) {
    console.error(`[telegram] ${method} failed`, error);
  }
}

export async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: ReplyMarkup,
  businessConnectionId?: string,
): Promise<void> {
  await call("sendMessage", {
    chat_id: chatId,
    text,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    ...(businessConnectionId ? { business_connection_id: businessConnectionId } : {}),
  });
}

export async function answerCallbackQuery(id: string, text?: string): Promise<void> {
  await call("answerCallbackQuery", { callback_query_id: id, ...(text ? { text } : {}) });
}

export function displayName(user: TgUser | undefined): string {
  if (!user) return "Без имени";
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return full || (user.username ? `@${user.username}` : `tg:${user.id}`);
}

/** Контакт по умолчанию, если телефон не дали: @username или прямая ссылка. */
export function fallbackContact(user: TgUser | undefined, id: number): string {
  if (user?.username) return `@${user.username}`;
  return `tg://user?id=${id}`;
}
