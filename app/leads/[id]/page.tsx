import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { SourceBadge, TagBadge } from "@/components/badges";
import { ConfirmButton } from "@/components/confirm-button";
import { TopBar } from "@/components/top-bar";
import { attachTagAction, deleteLeadAction, detachTagAction } from "@/app/actions";
import { getLead, getLeadMessages, listTags } from "@/lib/leads";
import { contactHref, formatDateTime } from "@/lib/format";
import { LeadForm } from "./lead-form";

export const dynamic = "force-dynamic";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const lead = await getLead(id);
  if (!lead) notFound();

  const [allTags, messages] = await Promise.all([listTags(), getLeadMessages(lead.id)]);

  const attachedIds = new Set(lead.tags.map((t) => t.id));
  const available = allTags.filter((t) => !attachedIds.has(t.id));
  const href = contactHref(lead.contact);

  return (
    <>
      <TopBar>
        <AutoRefresh />
      </TopBar>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← к списку
        </Link>

        <div className="mt-2 mb-4 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{lead.name}</h1>
          <SourceBadge source={lead.source} />
          <span className="text-sm text-slate-500">
            создан {formatDateTime(lead.createdAt)} · изменён {formatDateTime(lead.updatedAt)}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Данные
            </h2>
            <LeadForm lead={lead} />

            {href ? (
              <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">
                Быстрая связь:{" "}
                <a href={href} className="text-slate-900 underline">
                  {lead.contact}
                </a>
              </p>
            ) : null}

            <form action={deleteLeadAction} className="mt-4 border-t border-slate-100 pt-4">
              <input type="hidden" name="id" value={lead.id} />
              <ConfirmButton
                message="Удалить лида? Действие необратимо."
                className="text-sm text-red-600 hover:underline"
              >
                Удалить лида
              </ConfirmButton>
            </form>
          </section>

          <div className="space-y-4">
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
                Теги
              </h2>

              <div className="flex flex-wrap gap-1.5">
                {lead.tags.length === 0 ? (
                  <span className="text-sm text-slate-400">тегов нет</span>
                ) : (
                  lead.tags.map((tag) => (
                    <span key={tag.id} className="inline-flex items-center">
                      <TagBadge tag={tag} />
                      <form action={detachTagAction} className="-ml-1">
                        <input type="hidden" name="leadId" value={lead.id} />
                        <input type="hidden" name="tagId" value={tag.id} />
                        <button
                          type="submit"
                          title={`Снять тег «${tag.name}»`}
                          className="px-1 text-xs text-slate-400 hover:text-red-600"
                        >
                          ×
                        </button>
                      </form>
                    </span>
                  ))
                )}
              </div>

              {/* Ввод названия + Enter: существующий тег привяжется, нового создаст. */}
              <form action={attachTagAction} className="mt-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <input
                  name="tagName"
                  list="all-tags"
                  autoComplete="off"
                  placeholder="тег и Enter…"
                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
                />
                <datalist id="all-tags">
                  {allTags.map((tag) => (
                    <option key={tag.id} value={tag.name} />
                  ))}
                </datalist>
              </form>

              {available.length > 0 ? (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs text-slate-400">добавить существующий:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {available.map((tag) => (
                      <form key={tag.id} action={attachTagAction}>
                        <input type="hidden" name="leadId" value={lead.id} />
                        <input type="hidden" name="tagId" value={tag.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-600 hover:border-slate-400"
                        >
                          + {tag.name}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
                Telegram
              </h2>
              <dl className="space-y-1 text-sm">
                <Row label="username">
                  {lead.tgUsername ? (
                    <a
                      href={`https://t.me/${lead.tgUsername}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      @{lead.tgUsername}
                    </a>
                  ) : (
                    "—"
                  )}
                </Row>
                <Row label="user id">{lead.tgUserId ?? "—"}</Row>
              </dl>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
                История сообщений
              </h2>
              {messages.length === 0 ? (
                <p className="text-sm text-slate-400">сообщений нет</p>
              ) : (
                <ul className="space-y-2">
                  {messages.map((message) => (
                    <li key={message.id} className="rounded-md bg-slate-50 px-3 py-2 text-sm">
                      <p className="whitespace-pre-wrap">{message.text}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDateTime(message.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-slate-400">{label}</dt>
      <dd className="text-slate-700">{children}</dd>
    </div>
  );
}
