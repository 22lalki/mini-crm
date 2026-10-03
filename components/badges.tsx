import type { LeadSource, LeadStatus, Tag } from "@/db/schema";
import { SOURCE_LABELS, STATUS_CLASSES, STATUS_LABELS, tagClasses } from "@/lib/constants";

export function TagBadge({ tag }: { tag: Tag }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs whitespace-nowrap ${tagClasses(tag.color)}`}
    >
      {tag.name}
    </span>
  );
}

const SOURCE_CLASSES: Record<LeadSource, string> = {
  telegram_bot: "bg-sky-50 text-sky-700 border-sky-200",
  telegram_account: "bg-indigo-50 text-indigo-700 border-indigo-200",
  manual: "bg-slate-50 text-slate-600 border-slate-200",
};

export function SourceBadge({ source }: { source: LeadSource }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs whitespace-nowrap ${SOURCE_CLASSES[source]}`}
    >
      {SOURCE_LABELS[source]}
    </span>
  );
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs whitespace-nowrap ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
