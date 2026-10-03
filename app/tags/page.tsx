import Link from "next/link";
import { ConfirmButton } from "@/components/confirm-button";
import { TopBar } from "@/components/top-bar";
import { deleteTagAction } from "@/app/actions";
import { listTags, tagUsageCounts } from "@/lib/leads";
import { tagClasses } from "@/lib/constants";
import { CreateTagForm, RenameTagForm } from "./tag-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Теги — Мини-CRM" };

export default async function TagsPage() {
  const [tags, usage] = await Promise.all([listTags(), tagUsageCounts()]);

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-xl font-semibold tracking-tight">Теги</h1>
        <p className="mt-0.5 mb-4 text-sm text-slate-500">
          Бот сам вешает тег выбранной категории. Удаление тега снимает его с лидов, сами лиды
          остаются.
        </p>

        <section className="card p-5">
          <h2 className="section-title mb-3">Новый тег</h2>
          <CreateTagForm />
        </section>

        <section className="card mt-4 overflow-hidden">
          {tags.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">Тегов пока нет.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {tags.map((tag) => {
                const count = usage.get(tag.id) ?? 0;
                return (
                  <li
                    key={tag.id}
                    className="flex flex-wrap items-center gap-3 p-3.5 transition hover:bg-slate-50/70"
                  >
                    <span className={`chip w-28 justify-center ${tagClasses(tag.color)}`}>
                      {tag.name}
                    </span>

                    <RenameTagForm id={tag.id} name={tag.name} />

                    <Link
                      href={`/?tag=${encodeURIComponent(tag.name)}`}
                      className="text-xs text-slate-500 transition hover:text-slate-900 hover:underline"
                    >
                      лидов: {count}
                    </Link>

                    <form action={deleteTagAction} className="ml-auto">
                      <input type="hidden" name="id" value={tag.id} />
                      <ConfirmButton
                        message={`Удалить тег «${tag.name}»? Он снимется с ${count} лид(ов).`}
                        className="text-sm text-red-600 transition hover:text-red-700 hover:underline"
                      >
                        Удалить
                      </ConfirmButton>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
