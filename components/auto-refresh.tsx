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
      title="Список сам обновляется раз в 10 секунд"
      className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${paused ? "bg-slate-300" : "animate-pulse bg-green-500"}`}
      />
      {paused ? "автообновление выключено" : "обновляется каждые 10 с"}
    </button>
  );
}
