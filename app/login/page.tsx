import { LoginForm } from "./login-form";

export const metadata = { title: "Вход — Мини-CRM" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params["next"] === "string" ? params["next"] : "/";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="card p-7">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
              CRM
            </span>
            <div>
              <h1 className="leading-tight font-semibold">Мини-CRM</h1>
              <p className="text-xs text-slate-500">Заявки агентства</p>
            </div>
          </div>

          <p className="mt-5 text-sm text-slate-500">
            Вход по общему паролю — он в сопроводительном сообщении.
          </p>

          <LoginForm next={next} />
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Лиды приходят из Telegram-бота и добавляются вручную
        </p>
      </div>
    </main>
  );
}
