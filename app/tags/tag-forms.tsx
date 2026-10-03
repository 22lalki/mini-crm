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
          className="w-48 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
        />
        {state.errors?.["name"] ? (
          <p className="mt-1 text-sm text-red-600">{state.errors["name"]}</p>
        ) : null}
      </div>

      <select
        name="color"
        defaultValue="slate"
        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
      >
        {TAG_COLORS.map((color) => (
          <option key={color} value={color}>
            {color}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        Создать
      </button>

      {state.ok && state.message ? (
        <span className="self-center text-sm text-green-600">{state.message}</span>
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
        className="w-40 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-500"
      />
      <button
        type="submit"
        disabled={pending}
        className="text-sm text-slate-600 hover:text-slate-900 disabled:opacity-60"
      >
        Переименовать
      </button>
      {state.errors?.["name"] ? (
        <span className="text-xs text-red-600">{state.errors["name"]}</span>
      ) : null}
    </form>
  );
}
