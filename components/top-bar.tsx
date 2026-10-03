import Link from "next/link";
import { logoutAction } from "@/app/login/actions";

export function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="font-semibold">
          Мини-CRM
        </Link>
        <nav className="flex items-center gap-3 text-sm text-slate-600">
          <Link href="/" className="hover:text-slate-900">
            Лиды
          </Link>
          <Link href="/tags" className="hover:text-slate-900">
            Теги
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {children}
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-slate-500 hover:text-slate-900">
              Выйти
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
