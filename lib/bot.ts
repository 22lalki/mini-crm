import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  botSessions,
  leadMessages,
  leadTags,
  leads,
  type BotDraft,
  type BotStep,
} from "@/db/schema";
import { BOT_CATEGORIES, TELEGRAM_ACCOUNT_TAG } from "@/lib/constants";
import { ensureTag } from "@/lib/leads";
import {
  answerCallbackQuery,
  displayName,
  fallbackContact,
  sendMessage,
  type ReplyMarkup,
  type TgCallbackQuery,
  type TgMessage,
  type TgUpdate,
} from "@/lib/telegram";

const TEXT = {
  greeting: "Здравствуйте! Это бот заявок агентства. Как вас зовут?",
  askContact: "Как с вами связаться? Нажмите кнопку ниже или напишите телефон, @username или email.",
  askRequest: "Опишите коротко задачу.",
  askCategory: "Что нужно?",
  done: "Спасибо, заявка принята, мы свяжемся с вами.",
  cancelled: "Диалог сброшен. Напишите /start, чтобы начать заново.",
  noSession: "Напишите /start, чтобы оставить заявку.",
  softRepeat: "Пока принимаю только текст. ",
} as const;

const contactKeyboard: ReplyMarkup = {
  keyboard: [[{ text: "Отправить номер телефона", request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

const categoryKeyboard: ReplyMarkup = {
  inline_keyboard: [
    BOT_CATEGORIES.slice(0, 2).map((c) => ({ text: c.label, callback_data: `cat:${c.key}` })),
    BOT_CATEGORIES.slice(2).map((c) => ({ text: c.label, callback_data: `cat:${c.key}` })),
  ],
};

/** Вопрос текущего шага — чтобы мягко повторить его на непонятное сообщение. */
function questionFor(step: BotStep): { text: string; markup?: ReplyMarkup } {
  switch (step) {
    case "ask_name":
      return { text: "Как вас зовут?" };
    case "ask_contact":
      return { text: TEXT.askContact, markup: contactKeyboard };
    case "ask_request":
      return { text: TEXT.askRequest };
    case "ask_category":
      return { text: TEXT.askCategory, markup: categoryKeyboard };
    case "done":
      return { text: TEXT.noSession };
  }
}

async function getSession(tgUserId: number) {
  const rows = await db
    .select()
    .from(botSessions)
    .where(eq(botSessions.tgUserId, tgUserId))
    .limit(1);
  return rows[0] ?? null;
}

async function saveSession(tgUserId: number, step: BotStep, draft: BotDraft): Promise<void> {
  await db
    .insert(botSessions)
    .values({ tgUserId, step, draft })
    .onConflictDoUpdate({
      target: botSessions.tgUserId,
      set: { step, draft, updatedAt: new Date() },
    });
}

async function clearSession(tgUserId: number): Promise<void> {
  await db.delete(botSessions).where(eq(botSessions.tgUserId, tgUserId));
}

function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

/** Точка входа вебхука. Ошибки внутри не должны мешать быстро ответить 200. */
export async function handleUpdate(update: TgUpdate): Promise<void> {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }
  if (update.business_message) {
    await handleBusinessMessage(update.business_message);
    return;
  }
  if (update.message) {
    await handleMessage(update.message);
  }
}

async function handleMessage(message: TgMessage): Promise<void> {
  const from = message.from;
  if (!from || from.is_bot) return;

  const chatId = message.chat.id;
  const text = (message.text ?? "").trim();

  // Команды работают на любом шаге.
  if (text === "/start" || text.startsWith("/start ")) {
    // Повторный /start начинает новую заявку; созданные ранее лиды не трогаем.
    await saveSession(from.id, "ask_name", {});
    await sendMessage(chatId, TEXT.greeting, { remove_keyboard: true });
    return;
  }
  if (text === "/cancel") {
    await clearSession(from.id);
    await sendMessage(chatId, TEXT.cancelled, { remove_keyboard: true });
    return;
  }

  const session = await getSession(from.id);
  if (!session || session.step === "done") {
    await sendMessage(chatId, TEXT.noSession);
    return;
  }

  const draft: BotDraft = { ...session.draft };

  switch (session.step) {
    case "ask_name": {
      // Стикер, фото, голосовое — текста нет: мягко повторяем вопрос.
      if (!text) return repeat(chatId, session.step);
      draft.name = text.slice(0, 200);
      await saveSession(from.id, "ask_contact", draft);
      await sendMessage(chatId, TEXT.askContact, contactKeyboard);
      return;
    }

    case "ask_contact": {
      const phone = message.contact?.phone_number;
      const contact = phone ? normalizePhone(phone) : text;
      if (!contact) return repeat(chatId, session.step);
      draft.contact = contact.slice(0, 300);
      await saveSession(from.id, "ask_request", draft);
      await sendMessage(chatId, TEXT.askRequest, { remove_keyboard: true });
      return;
    }

    case "ask_request": {
      if (!text) return repeat(chatId, session.step);
      draft.request = text.slice(0, 5000);
      await saveSession(from.id, "ask_category", draft);
      await sendMessage(chatId, TEXT.askCategory, categoryKeyboard);
      return;
    }

    case "ask_category": {
      // Ждём нажатия inline-кнопки — показываем кнопки снова.
      await sendMessage(chatId, `Выберите вариант кнопкой. ${TEXT.askCategory}`, categoryKeyboard);
      return;
    }
  }
}

async function repeat(chatId: number, step: BotStep): Promise<void> {
  const question = questionFor(step);
  await sendMessage(chatId, `${TEXT.softRepeat}${question.text}`, question.markup);
}

/** Шаг 5: нажатие кнопки категории создаёт лид с авто-тегом. */
async function handleCallbackQuery(query: TgCallbackQuery): Promise<void> {
  const from = query.from;
  const chatId = query.message?.chat.id ?? from.id;
  const data = query.data ?? "";

  if (!data.startsWith("cat:")) {
    await answerCallbackQuery(query.id);
    return;
  }

  const category = BOT_CATEGORIES.find((c) => c.key === data.slice(4));
  if (!category) {
    await answerCallbackQuery(query.id);
    return;
  }

  const session = await getSession(from.id);
  // Защита от повторного нажатия: лид создаётся только из шага ask_category.
  if (!session || session.step !== "ask_category") {
    await answerCallbackQuery(query.id, "Заявка уже отправлена. /start — новая заявка");
    return;
  }

  const draft = session.draft;
  const contact = draft.contact?.trim() ? draft.contact.trim() : fallbackContact(from, from.id);

  const inserted = await db
    .insert(leads)
    .values({
      name: draft.name?.trim() || displayName(from),
      contact,
      request: draft.request ?? null,
      source: "telegram_bot",
      status: "new",
      tgUserId: from.id,
      tgUsername: from.username ?? null,
    })
    .returning({ id: leads.id });

  const lead = inserted[0];
  if (!lead) throw new Error("Лид не создан");

  const tag = await ensureTag(category.tag);
  await db.insert(leadTags).values({ leadId: lead.id, tagId: tag.id }).onConflictDoNothing();

  if (draft.request) {
    await db.insert(leadMessages).values({ leadId: lead.id, text: draft.request });
  }

  await saveSession(from.id, "done", {});
  await answerCallbackQuery(query.id, "Принято");
  await sendMessage(chatId, TEXT.done, { remove_keyboard: true });
}

/**
 * Пункт 2, вариант А: Telegram Business.
 * Бот подключён к личному аккаунту и получает business_message о сообщениях в личке.
 */
async function handleBusinessMessage(message: TgMessage): Promise<void> {
  const from = message.from;
  if (!from || from.is_bot) return;

  // business_message приходит и на исходящие сообщения владельца аккаунта.
  // У входящего в личном чате автор совпадает с чатом, у исходящего — нет.
  if (from.id !== message.chat.id) return;

  const text = (message.text ?? message.caption ?? "").trim();
  if (!text) return;

  const open = await db
    .select({ id: leads.id })
    .from(leads)
    .where(
      and(
        eq(leads.source, "telegram_account"),
        eq(leads.tgUserId, from.id),
        ne(leads.status, "done"),
      ),
    )
    .orderBy(desc(leads.createdAt))
    .limit(1);

  let leadId = open[0]?.id;

  if (!leadId) {
    const inserted = await db
      .insert(leads)
      .values({
        name: displayName(from),
        contact: fallbackContact(from, from.id),
        request: text.slice(0, 5000),
        source: "telegram_account",
        status: "new",
        tgUserId: from.id,
        tgUsername: from.username ?? null,
      })
      .returning({ id: leads.id });

    const created = inserted[0];
    if (!created) throw new Error("Лид не создан");
    leadId = created.id;

    const tag = await ensureTag(TELEGRAM_ACCOUNT_TAG, "amber");
    await db.insert(leadTags).values({ leadId, tagId: tag.id }).onConflictDoNothing();
  } else {
    // Второе и последующие сообщения дописываются в историю того же лида.
    await db.update(leads).set({ updatedAt: new Date() }).where(eq(leads.id, leadId));
  }

  await db.insert(leadMessages).values({ leadId, text });
}
