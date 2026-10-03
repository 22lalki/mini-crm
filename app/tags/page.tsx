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
        <h1 className="mb-4 text-xl font-semibold">Теги</h1>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Новый тег
          </h2>
          <CreateTagForm />
        </section>

        <section className="mt-4 rounded-lg border border-slate-200 bg-white">
          {tags.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Тегов пока нет.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {tags.map((tag) => {
                const count = usage.get(tag.id) ?? 0;
                return (
                  <li key={tag.id} className="flex flex-wrap items-center gap-3 p-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${tagClasses(tag.color)}`}
                    >
                      {tag.name}
                    </span>

                    <RenameTagForm id={tag.id} name={tag.name} />

                    <Link
                      href={`/?tag=${encodeURIComponent(tag.name)}`}
                      className="text-xs text-slate-500 hover:underline"
                    >
                      лидов: {count}
                    </Link>

                    <form action={deleteTagAction} className="ml-auto">
                      <input type="hidden" name="id" value={tag.id} />
                      <ConfirmButton
                        message={`Удалить тег «${tag.name}»? Он снимется с ${count} лид(ов).`}
                        className="text-sm text-red-600 hover:underline"
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

        <p className="mt-3 text-xs text-slate-500">
          Удаление тега снимает его с лидов (каскад по lead_tags), сами лиды остаются.
        </p>
      </main>
    </>
  );
}
