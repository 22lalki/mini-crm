"use client";

import { useActionState } from "react";
import { LEAD_STATUSES, type Lead } from "@/db/schema";
import { STATUS_LABELS } from "@/lib/constants";
import { updateLeadAction, type FormState } from "@/app/actions";

const initial: FormState = { ok: false };

export function LeadForm({ lead }: { lead: Lead }) {
  const [state, formAction, pending] = useActionState(updateLeadAction, initial);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={lead.id} />

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
          Имя <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          defaultValue={lead.name}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        {errors["name"] ? <p className="mt-1 text-sm text-red-600">{errors["name"]}</p> : null}
      </div>

      <div>
        <label htmlFor="contact" className="mb-1 block text-sm font-medium text-slate-700">
          Контакт
        </label>
        <input
          id="contact"
          name="contact"
          defaultValue={lead.contact ?? ""}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        {errors["contact"] ? <p className="mt-1 text-sm text-red-600">{errors["contact"]}</p> : null}
      </div>

      <div>
        <label htmlFor="request" className="mb-1 block text-sm font-medium text-slate-700">
          Запрос
        </label>
        <textarea
          id="request"
          name="request"
          rows={5}
          defaultValue={lead.request ?? ""}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        {errors["request"] ? <p className="mt-1 text-sm text-red-600">{errors["request"]}</p> : null}
      </div>

      <div>
        <label htmlFor="status" className="mb-1 block text-sm font-medium text-slate-700">
          Статус
        </label>
        <select
          id="status"
          name="status"
          defaultValue={lead.status}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        >
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {errors["_form"] ? <p className="text-sm text-red-600">{errors["_form"]}</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Сохраняем…" : "Сохранить"}
        </button>
        {state.ok && state.message ? (
          <span className="text-sm text-green-600">{state.message}</span>
        ) : null}
      </div>
    </form>
  );
}
