"use client";

import { useActionState } from "react";
import { createTagAction, renameTagAction, type FormState } from "@/app/actions";
import { TAG_COLORS } from "@/lib/constants";

const initial: FormState = { ok: false };

export function CreateTagForm() {
  const [state, formAction, pending] = useActionState(createTagAction, initial);

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-2">
      <div>
        <input
          name="name"
          placeholder="название"
          autoComplete="off"
          aria-label="Название тега"
          aria-invalid={state.errors?.["name"] ? true : undefined}
          className={`input w-48 ${state.errors?.["name"] ? "input-error" : ""}`}
        />
        {state.errors?.["name"] ? (
          <p className="error-text" role="alert">
            {state.errors["name"]}
          </p>
        ) : null}
      </div>

      <select name="color" defaultValue="slate" aria-label="Цвет тега" className="input w-auto">
        {TAG_COLORS.map((color) => (
          <option key={color} value={color}>
            {color}
          </option>
        ))}
      </select>

      <button type="submit" disabled={pending} className="btn-primary">
        Создать
      </button>

      {state.ok && state.message ? (
        <span className="self-center text-sm font-medium text-green-600">{state.message}</span>
      ) : null}
    </form>
  );
}

export function RenameTagForm({ id, name }: { id: string; name: string }) {
  const [state, formAction, pending] = useActionState(renameTagAction, initial);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input
        name="name"
        defaultValue={name}
        aria-label={`Переименовать тег ${name}`}
        className={`input w-40 py-1.5 ${state.errors?.["name"] ? "input-error" : ""}`}
      />
      <button type="submit" disabled={pending} className="btn-link disabled:opacity-55">
        Переименовать
      </button>
      {state.errors?.["name"] ? (
        <span className="text-xs text-red-600">{state.errors["name"]}</span>
      ) : null}
    </form>
  );
}
