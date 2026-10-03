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
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← к списку
        </Link>
        <h1 className="mt-2 mb-4 text-xl font-semibold">Новый лид</h1>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <NewLeadForm tags={tags} />
        </div>
      </main>
    </>
  );
}
