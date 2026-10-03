"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initial: LoginState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="password" className="label">
          Пароль
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          aria-invalid={state.error ? true : undefined}
          className={`input ${state.error ? "input-error" : ""}`}
        />
        {state.error ? (
          <p className="error-text" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Проверяем…" : "Войти"}
      </button>
    </form>
  );
}
