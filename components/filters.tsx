"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { Tag } from "@/db/schema";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/db/schema";
import { SOURCE_LABELS, STATUS_LABELS, tagClasses } from "@/lib/constants";

/** Фильтры живут в URL, чтобы ссылку можно было отправить: ?tag=сайт&status=new */
export function Filters({ tags }: { tags: Tag[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const values = useCallback(
    (key: string): string[] => searchParams.getAll(key).flatMap((v) => v.split(",")).filter(Boolean),
    [searchParams],
  );

  const toggle = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.getAll(key).flatMap((v) => v.split(",")).filter(Boolean);
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      params.delete(key);
      for (const v of next) params.append(key, v);

      const query = params.toString();
      startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
    },
    [pathname, router, searchParams],
  );

  const activeTags = values("tag");
  const activeSources = values("source");
  const activeStatuses = values("status");
  const hasAny = activeTags.length + activeSources.length + activeStatuses.length > 0;

  return (
    <div className={`space-y-3 ${pending ? "opacity-70" : ""}`}>
      <Row label="Теги">
        {tags.length === 0 ? (
          <span className="text-xs text-slate-400">тегов пока нет</span>
        ) : (
          tags.map((tag) => {
            const active = activeTags.includes(tag.name);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggle("tag", tag.name)}
                className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
                  active ? `${tagClasses(tag.color)} ring-2 ring-slate-900/20` : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                }`}
              >
                {tag.name}
              </button>
            );
          })
        )}
      </Row>

      <Row label="Источник">
        {LEAD_SOURCES.map((source) => (
          <Chip
            key={source}
            active={activeSources.includes(source)}
            onClick={() => toggle("source", source)}
          >
            {SOURCE_LABELS[source]}
          </Chip>
        ))}
      </Row>

      <Row label="Статус">
        {LEAD_STATUSES.map((status) => (
          <Chip
            key={status}
            active={activeStatuses.includes(status)}
            onClick={() => toggle("status", status)}
          >
            {STATUS_LABELS[status]}
          </Chip>
        ))}
        {hasAny ? (
          <button
            type="button"
            onClick={() => startTransition(() => router.push(pathname))}
            className="ml-2 text-xs text-slate-500 underline hover:text-slate-800"
          >
            сбросить всё
          </button>
        ) : null}
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-20 shrink-0 text-xs font-medium tracking-wide text-slate-400 uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
      }`}
    >
      {children}
    </button>
  );
}
