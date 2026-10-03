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
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Мини-CRM</h1>
        <p className="mt-1 text-sm text-slate-500">Вход по общему паролю.</p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
