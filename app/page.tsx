import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { SourceBadge, StatusBadge, TagBadge } from "@/components/badges";
import { Filters } from "@/components/filters";
import { TopBar } from "@/components/top-bar";
import { listLeads, listTags, parseFilters, type LeadWithTags } from "@/lib/leads";
import { contactHref, formatDateTime, truncate } from "@/lib/format";

// Список всегда свежий: сюда прилетают лиды из вебхука, страница опрашивается каждые 10 с.
export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const [leads, tags] = await Promise.all([listLeads(filters), listTags()]);
  const filtersActive =
    filters.tagNames.length + filters.sources.length + filters.statuses.length > 0;

  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME ?? "";

  return (
    <>
      <TopBar>
        <AutoRefresh />
      </TopBar>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Лиды</h1>
            <p className="mt-0.5 text-sm text-slate-500">Новые сверху, список обновляется сам</p>
          </div>
          <Link href="/leads/new" className="btn-primary">
            Добавить лида
          </Link>
        </div>

        <div className="card p-4">
          <Filters tags={tags} />
          <p className="mt-3.5 border-t border-slate-100 pt-3 text-sm text-slate-500">
            Найдено: <span className="font-semibold text-slate-900">{leads.length}</span>
          </p>
        </div>

        {leads.length === 0 ? (
          <EmptyState filtersActive={filtersActive} botUsername={botUsername} />
        ) : (
          <>
            {/* Десктоп: таблица со всеми колонками. */}
            <div className="card mt-4 hidden overflow-hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[840px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                      {["Имя", "Контакт", "Запрос", "Источник", "Теги", "Статус", "Дата"].map(
                        (title) => (
                          <th key={title} className="section-title px-3 py-2.5">
                            {title}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70"
                      >
                        <td className="px-3 py-2.5 align-top">
                          <Link
                            href={`/leads/${lead.id}`}
                            className="font-medium text-slate-900 hover:underline"
                          >
                            {lead.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 align-top text-slate-600">
                          <Contact contact={lead.contact} />
                        </td>
                        <td className="max-w-xs px-3 py-2.5 align-top text-slate-600">
                          {truncate(lead.request) || "—"}
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <SourceBadge source={lead.source} />
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <TagList tags={lead.tags} />
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="px-3 py-2.5 align-top whitespace-nowrap text-slate-500">
                          {formatDateTime(lead.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Мобильные: те же данные карточками, чтобы не ездить по горизонтали. */}
            <ul className="mt-4 space-y-2.5 md:hidden">
              {leads.map((lead) => (
                <li key={lead.id} className="card p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                      {lead.name}
                    </Link>
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatDateTime(lead.createdAt)}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-600">
                    <Contact contact={lead.contact} />
                  </p>

                  {lead.request ? (
                    <p className="mt-1.5 text-sm text-slate-600">{truncate(lead.request, 120)}</p>
                  ) : null}

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <SourceBadge source={lead.source} />
                    <StatusBadge status={lead.status} />
                    {lead.tags.map((tag) => (
                      <TagBadge key={tag.id} tag={tag} />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}

function Contact({ contact }: { contact: string | null }) {
  const href = contactHref(contact);
  if (!contact) return <span className="text-slate-400">—</span>;
  return href ? (
    <a href={href} className="hover:underline">
      {contact}
    </a>
  ) : (
    <>{contact}</>
  );
}

function TagList({ tags }: { tags: LeadWithTags["tags"] }) {
  if (tags.length === 0) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <TagBadge key={tag.id} tag={tag} />
      ))}
    </div>
  );
}

function EmptyState({
  filtersActive,
  botUsername,
}: {
  filtersActive: boolean;
  botUsername: string;
}) {
  if (filtersActive) {
    return (
      <div className="card mt-4 border-dashed p-10 text-center">
        <p className="text-sm text-slate-600">Под фильтры ничего не подошло.</p>
        <Link
          href="/"
          className="mt-2 inline-block text-sm text-slate-900 underline underline-offset-2"
        >
          сбросить фильтры
        </Link>
      </div>
    );
  }

  return (
    <div className="card mt-4 border-dashed p-10 text-center">
      <p className="text-base font-medium text-slate-900">Лидов пока нет</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
        Напишите боту{" "}
        {botUsername ? (
          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-slate-900 underline underline-offset-2"
          >
            @{botUsername}
          </a>
        ) : (
          <span className="font-medium">(задайте NEXT_PUBLIC_BOT_USERNAME)</span>
        )}
        , пройдите короткий диалог и выберите категорию — лид появится здесь сам, с тегом и
        бейджем «Бот».
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {botUsername ? (
          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
          >
            Открыть бота
          </a>
        ) : null}
        <Link href="/leads/new" className="btn-ghost">
          Добавить вручную
        </Link>
      </div>
    </div>
  );
}
