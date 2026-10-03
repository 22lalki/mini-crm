import type { LeadSource, LeadStatus, Tag } from "@/db/schema";
import { SOURCE_LABELS, STATUS_CLASSES, STATUS_LABELS, tagClasses } from "@/lib/constants";

export function TagBadge({ tag }: { tag: Tag }) {
  return <span className={`chip ${tagClasses(tag.color)}`}>{tag.name}</span>;
}

const SOURCE_CLASSES: Record<LeadSource, string> = {
  telegram_bot: "border-sky-200 bg-sky-50 text-sky-700",
  telegram_account: "border-indigo-200 bg-indigo-50 text-indigo-700",
  manual: "border-slate-200 bg-slate-50 text-slate-600",
};

export function SourceBadge({ source }: { source: LeadSource }) {
  return <span className={`chip ${SOURCE_CLASSES[source]}`}>{SOURCE_LABELS[source]}</span>;
}

const STATUS_DOTS: Record<LeadStatus, string> = {
  new: "bg-blue-500",
  in_progress: "bg-amber-500",
  done: "bg-green-500",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`chip ${STATUS_CLASSES[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}
