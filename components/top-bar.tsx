import Link from "next/link";
import { logoutAction } from "@/app/login/actions";

export function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-[10px] font-semibold text-white">
            CRM
          </span>
          Мини-CRM
        </Link>

        <nav className="flex items-center gap-4 text-sm text-slate-600">
          <Link href="/" className="transition hover:text-slate-900">
            Лиды
          </Link>
          <Link href="/tags" className="transition hover:text-slate-900">
            Теги
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          {children}
          <form action={logoutAction}>
            <button type="submit" className="btn-link">
              Выйти
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
