"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie, createSessionToken, setSessionCookie } from "@/lib/session";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, data: FormData): Promise<LoginState> {
  const password = data.get("password");
  const next = data.get("next");

  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!adminPassword || !sessionSecret) {
    return { error: "Сервер не настроен: нет ADMIN_PASSWORD или SESSION_SECRET" };
  }

  if (typeof password !== "string" || password.length === 0) {
    return { error: "Введите пароль" };
  }

  if (password !== adminPassword) {
    return { error: "Неверный пароль" };
  }

  await setSessionCookie(await createSessionToken(sessionSecret));

  const target = typeof next === "string" && next.startsWith("/") ? next : "/";
  redirect(target);
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
