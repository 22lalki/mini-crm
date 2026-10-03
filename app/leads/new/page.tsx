import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { listTags } from "@/lib/leads";
import { NewLeadForm } from "./new-lead-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Новый лид — Мини-CRM" };

export default async function NewLeadPage() {
  const tags = await listTags();

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/" className="btn-link">
          ← к списку
        </Link>

        <h1 className="mt-2 text-xl font-semibold tracking-tight">Новый лид</h1>
        <p className="mt-0.5 mb-4 text-sm text-slate-500">
          Источник проставится как «Вручную». Обязательно только имя.
        </p>

        <div className="card p-5">
          <NewLeadForm tags={tags} />
        </div>
      </main>
    </>
  );
}
