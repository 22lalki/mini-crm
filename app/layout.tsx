import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Мини-CRM",
  description: "Заявки агентства: Telegram-бот, теги, фильтры",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
