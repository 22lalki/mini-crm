"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Новые лиды должны появляться без ручного обновления.
 * Для MVP достаточно polling раз в 10 секунд через router.refresh() — вебсокеты не нужны.
 */
export function AutoRefresh({ intervalMs = 10_000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs, paused]);

  return (
    <button
      type="button"
      onClick={() => setPaused((p) => !p)}
      title={
        paused
          ? "Включить автообновление списка"
          : "Список сам обновляется раз в 10 секунд — нажмите, чтобы выключить"
      }
      className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-900"
    >
      <span className="relative flex h-2 w-2">
        {paused ? null : (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-70" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${paused ? "bg-slate-300" : "bg-green-500"}`}
        />
      </span>
      <span className="hidden sm:inline">{paused ? "обновление выкл." : "обновляется"}</span>
    </button>
  );
}
