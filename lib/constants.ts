import type { LeadSource, LeadStatus } from "@/db/schema";

/** Фиксированная палитра для тегов. */
export const TAG_COLORS = ["slate", "blue", "green", "amber", "red", "violet"] as const;
export type TagColor = (typeof TAG_COLORS)[number];

/** Сид: теги по умолчанию. */
export const DEFAULT_TAGS: { name: string; color: TagColor }[] = [
  { name: "сайт", color: "blue" },
  { name: "реклама", color: "violet" },
  { name: "smm", color: "green" },
  { name: "горячий", color: "red" },
  { name: "другое", color: "slate" },
];

export const SOURCE_LABELS: Record<LeadSource, string> = {
  telegram_bot: "Бот",
  telegram_account: "Telegram",
  manual: "Вручную",
};

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Новый",
  in_progress: "В работе",
  done: "Завершён",
};

/** Классы бейджа для цвета тега. Tailwind нужен статический список. */
export const TAG_COLOR_CLASSES: Record<TagColor, string> = {
  slate: "bg-slate-100 text-slate-700 border-slate-300",
  blue: "bg-blue-100 text-blue-700 border-blue-300",
  green: "bg-green-100 text-green-700 border-green-300",
  amber: "bg-amber-100 text-amber-800 border-amber-300",
  red: "bg-red-100 text-red-700 border-red-300",
  violet: "bg-violet-100 text-violet-700 border-violet-300",
};

export function tagClasses(color: string | null): string {
  const known = TAG_COLORS.find((c) => c === color);
  return TAG_COLOR_CLASSES[known ?? "slate"];
}

export const STATUS_CLASSES: Record<LeadStatus, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-800 border-amber-200",
  done: "bg-green-50 text-green-700 border-green-200",
};

/** Категории из inline-кнопок бота -> имя тега. */
export const BOT_CATEGORIES: { key: string; label: string; tag: string }[] = [
  { key: "site", label: "Сайт", tag: "сайт" },
  { key: "ads", label: "Реклама", tag: "реклама" },
  { key: "smm", label: "SMM", tag: "smm" },
  { key: "other", label: "Другое", tag: "другое" },
];

/** Тег, который ставится лидам из личных сообщений (пункт 2). */
export const TELEGRAM_ACCOUNT_TAG = "telegram";
