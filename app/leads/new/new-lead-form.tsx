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
    <form action={formAction} className="space-y-5">
      <Field label="Имя" error={errors["name"]} required htmlFor="name">
        <input
          id="name"
          name="name"
          autoFocus
          placeholder="Как зовут клиента"
          aria-invalid={errors["name"] ? true : undefined}
          className={`input ${errors["name"] ? "input-error" : ""}`}
        />
      </Field>

      <Field label="Контакт" error={errors["contact"]} htmlFor="contact">
        <input
          id="contact"
          name="contact"
          placeholder="+7…, @username или email"
          className={`input ${errors["contact"] ? "input-error" : ""}`}
        />
      </Field>

      <Field label="Запрос" error={errors["request"]} htmlFor="request">
        <textarea
          id="request"
          name="request"
          rows={4}
          placeholder="Что нужно клиенту"
          className={`input resize-y ${errors["request"] ? "input-error" : ""}`}
        />
      </Field>

      <Field label="Теги" error={errors["tagIds"]}>
        {tags.length === 0 ? (
          <p className="text-sm text-slate-500">
            Тегов нет —{" "}
            <Link href="/tags" className="underline underline-offset-2">
              создайте первый
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <label
                key={tag.id}
                className="chip cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-slate-400 has-checked:border-slate-900 has-checked:bg-slate-900 has-checked:text-white"
              >
                <input type="checkbox" name="tagIds" value={tag.id} className="sr-only" />
                {tag.name}
              </label>
            ))}
          </div>
        )}
      </Field>

      <Field label="Статус" error={errors["status"]} htmlFor="status">
        <select id="status" name="status" defaultValue="new" className="input w-auto">
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </Field>

      {errors["_form"] ? (
        <p className="error-text" role="alert">
          {errors["_form"]}
        </p>
      ) : null}

      <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Сохраняем…" : "Создать лида"}
        </button>
        <Link href="/" className="btn-link">
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
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
