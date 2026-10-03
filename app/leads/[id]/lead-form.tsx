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
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={lead.id} />

      <div>
        <label htmlFor="name" className="label">
          Имя <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          defaultValue={lead.name}
          aria-invalid={errors["name"] ? true : undefined}
          className={`input ${errors["name"] ? "input-error" : ""}`}
        />
        {errors["name"] ? (
          <p className="error-text" role="alert">
            {errors["name"]}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="contact" className="label">
          Контакт
        </label>
        <input
          id="contact"
          name="contact"
          defaultValue={lead.contact ?? ""}
          className={`input ${errors["contact"] ? "input-error" : ""}`}
        />
        {errors["contact"] ? (
          <p className="error-text" role="alert">
            {errors["contact"]}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="request" className="label">
          Запрос
        </label>
        <textarea
          id="request"
          name="request"
          rows={5}
          defaultValue={lead.request ?? ""}
          className={`input resize-y ${errors["request"] ? "input-error" : ""}`}
        />
        {errors["request"] ? (
          <p className="error-text" role="alert">
            {errors["request"]}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="status" className="label">
          Статус
        </label>
        <select id="status" name="status" defaultValue={lead.status} className="input w-auto">
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {errors["_form"] ? (
        <p className="error-text" role="alert">
          {errors["_form"]}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Сохраняем…" : "Сохранить"}
        </button>
        {state.ok && state.message ? (
          <span className="text-sm font-medium text-green-600">{state.message}</span>
        ) : null}
      </div>
    </form>
  );
}
