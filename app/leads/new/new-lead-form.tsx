"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Tag } from "@/db/schema";
import { LEAD_STATUSES } from "@/db/schema";
import { STATUS_LABELS } from "@/lib/constants";
import { createLeadAction, type FormState } from "@/app/actions";

const initial: FormState = { ok: false };

export function NewLeadForm({ tags }: { tags: Tag[] }) {
  const [state, formAction, pending] = useActionState(createLeadAction, initial);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Имя" error={errors["name"]} required>
        <input
          name="name"
          autoFocus
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </Field>

      <Field label="Контакт" error={errors["contact"]}>
        <input
          name="contact"
          placeholder="+7…, @username или email"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </Field>

      <Field label="Запрос" error={errors["request"]}>
        <textarea
          name="request"
          rows={4}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </Field>

      <Field label="Теги" error={errors["tagIds"]}>
        {tags.length === 0 ? (
          <p className="text-sm text-slate-500">
            Тегов нет —{" "}
            <Link href="/tags" className="underline">
              создайте первый
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {tags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="tagIds" value={tag.id} className="accent-slate-900" />
                {tag.name}
              </label>
            ))}
          </div>
        )}
      </Field>

      <Field label="Статус" error={errors["status"]}>
        <select
          name="status"
          defaultValue="new"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        >
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </Field>

      {errors["_form"] ? <p className="text-sm text-red-600">{errors["_form"]}</p> : null}

      <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Сохраняем…" : "Создать"}
        </button>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          Отмена
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
