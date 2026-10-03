import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { SourceBadge, StatusBadge, TagBadge } from "@/components/badges";
import { Filters } from "@/components/filters";
import { TopBar } from "@/components/top-bar";
import { listLeads, listTags, parseFilters } from "@/lib/leads";
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Лиды</h1>
          <Link
            href="/leads/new"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Добавить лида
          </Link>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <Filters tags={tags} />
          <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">
            Найдено: <span className="font-medium text-slate-900">{leads.length}</span>
          </p>
        </div>

        {leads.length === 0 ? (
          <EmptyState filtersActive={filtersActive} botUsername={botUsername} />
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-3 py-2 font-medium">Имя</th>
                  <th className="px-3 py-2 font-medium">Контакт</th>
                  <th className="px-3 py-2 font-medium">Запрос</th>
                  <th className="px-3 py-2 font-medium">Источник</th>
                  <th className="px-3 py-2 font-medium">Теги</th>
                  <th className="px-3 py-2 font-medium">Статус</th>
                  <th className="px-3 py-2 font-medium">Дата</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const href = contactHref(lead.contact);
                  return (
                    <tr key={lead.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-3 py-2 align-top">
                        <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                          {lead.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 align-top text-slate-600">
                        {href ? (
                          <a href={href} className="hover:underline">
                            {lead.contact}
                          </a>
                        ) : (
                          (lead.contact ?? "—")
                        )}
                      </td>
                      <td className="max-w-xs px-3 py-2 align-top text-slate-600">
                        {truncate(lead.request) || "—"}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <SourceBadge source={lead.source} />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-wrap gap-1">
                          {lead.tags.length === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            lead.tags.map((tag) => <TagBadge key={tag.id} tag={tag} />)
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-3 py-2 align-top whitespace-nowrap text-slate-500">
                        {formatDateTime(lead.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
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
      <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">Под фильтры ничего не подошло.</p>
        <Link href="/" className="mt-2 inline-block text-sm text-slate-900 underline">
          сбросить фильтры
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-sm text-slate-700">
        Лидов пока нет. Напишите боту{" "}
        {botUsername ? (
          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-slate-900 underline"
          >
            @{botUsername}
          </a>
        ) : (
          <span className="font-medium">(задайте NEXT_PUBLIC_BOT_USERNAME)</span>
        )}
        , чтобы проверить.
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Или{" "}
        <Link href="/leads/new" className="underline">
          добавьте лида вручную
        </Link>
        .
      </p>
    </div>
  );
}
