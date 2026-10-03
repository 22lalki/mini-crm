/** Время рендерится только на сервере, поэтому фиксируем зону — иначе hydration mismatch. */
const dateTime = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(value: Date): string {
  return dateTime.format(value);
}

export function truncate(value: string | null, max = 80): string {
  if (!value) return "";
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

/** Делает контакт кликабельным, если это телефон, email, @username или tg-ссылка. */
export function contactHref(contact: string | null): string | null {
  if (!contact) return null;
  const value = contact.trim();
  if (value.startsWith("tg://")) return value;
  if (value.startsWith("@")) return `https://t.me/${value.slice(1)}`;
  if (value.includes("@")) return `mailto:${value}`;
  if (/^\+?[\d\s()-]{7,}$/.test(value)) return `tel:${value.replace(/[^\d+]/g, "")}`;
  return null;
}
