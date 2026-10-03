"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { leadTags, leads, tags } from "@/db/schema";
import { ensureTag } from "@/lib/leads";
import { fieldErrors, leadInputSchema, tagNameSchema } from "@/lib/validation";

export type FormState = {
  ok: boolean;
  errors?: Record<string, string>;
  message?: string;
};

function str(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

/** Пункт 3: ручное добавление лида. */
export async function createLeadAction(_prev: FormState, data: FormData): Promise<FormState> {
  const parsed = leadInputSchema.safeParse({
    name: str(data, "name"),
    contact: str(data, "contact"),
    request: str(data, "request"),
    status: str(data, "status") || "new",
    tagIds: data.getAll("tagIds").filter((v): v is string => typeof v === "string"),
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const input = parsed.data;
  let newId: string;

  try {
    const inserted = await db
      .insert(leads)
      .values({
        name: input.name,
        contact: input.contact || null,
        request: input.request || null,
        source: "manual",
        status: input.status,
      })
      .returning({ id: leads.id });

    const lead = inserted[0];
    if (!lead) return { ok: false, errors: { _form: "Не удалось создать лида" } };
    newId = lead.id;

    if (input.tagIds.length > 0) {
      await db
        .insert(leadTags)
        .values(input.tagIds.map((tagId) => ({ leadId: newId, tagId })))
        .onConflictDoNothing();
    }
  } catch (error) {
    console.error("[createLeadAction]", error);
    return { ok: false, errors: { _form: "Ошибка сохранения. Попробуйте ещё раз." } };
  }

  revalidatePath("/");
  redirect(`/leads/${newId}`);
}

/** Карточка лида: сохранение полей. */
export async function updateLeadAction(_prev: FormState, data: FormData): Promise<FormState> {
  const id = str(data, "id");
  if (!id) return { ok: false, errors: { _form: "Лид не найден" } };

  const parsed = leadInputSchema.safeParse({
    name: str(data, "name"),
    contact: str(data, "contact"),
    request: str(data, "request"),
    status: str(data, "status") || "new",
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const input = parsed.data;

  try {
    await db
      .update(leads)
      .set({
        name: input.name,
        contact: input.contact || null,
        request: input.request || null,
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id));
  } catch (error) {
    console.error("[updateLeadAction]", error);
    return { ok: false, errors: { _form: "Ошибка сохранения" } };
  }

  revalidatePath("/");
  revalidatePath(`/leads/${id}`);
  return { ok: true, message: "Сохранено" };
}

export async function deleteLeadAction(data: FormData): Promise<void> {
  const id = str(data, "id");
  if (!id) return;
  await db.delete(leads).where(eq(leads.id, id));
  revalidatePath("/");
  redirect("/");
}

/**
 * Пункт 4: привязать тег к лиду.
 * Либо tagId (существующий), либо tagName (создать на лету из поля ввода).
 */
export async function attachTagAction(data: FormData): Promise<void> {
  const leadId = str(data, "leadId");
  if (!leadId) return;

  const tagId = str(data, "tagId");
  const tagName = str(data, "tagName");

  let resolvedTagId = tagId;
  if (!resolvedTagId) {
    const parsed = tagNameSchema.safeParse(tagName);
    if (!parsed.success) return;
    resolvedTagId = (await ensureTag(parsed.data)).id;
  }

  await db.insert(leadTags).values({ leadId, tagId: resolvedTagId }).onConflictDoNothing();
  await db.update(leads).set({ updatedAt: new Date() }).where(eq(leads.id, leadId));

  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);
}

export async function detachTagAction(data: FormData): Promise<void> {
  const leadId = str(data, "leadId");
  const tagId = str(data, "tagId");
  if (!leadId || !tagId) return;

  await db.delete(leadTags).where(and(eq(leadTags.leadId, leadId), eq(leadTags.tagId, tagId)));
  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);
}

/** Управление тегами. */
export async function createTagAction(_prev: FormState, data: FormData): Promise<FormState> {
  const parsed = tagNameSchema.safeParse(str(data, "name"));
  if (!parsed.success) return { ok: false, errors: { name: parsed.error.issues[0]?.message ?? "Ошибка" } };

  const color = str(data, "color") || undefined;
  const existing = await db
    .select({ id: tags.id })
    .from(tags)
    .where(sql`lower(${tags.name}) = lower(${parsed.data})`)
    .limit(1);
  if (existing[0]) return { ok: false, errors: { name: "Такой тег уже есть" } };

  await ensureTag(parsed.data, color);
  revalidatePath("/tags");
  revalidatePath("/");
  return { ok: true, message: "Тег создан" };
}

export async function renameTagAction(_prev: FormState, data: FormData): Promise<FormState> {
  const id = str(data, "id");
  const parsed = tagNameSchema.safeParse(str(data, "name"));
  if (!id) return { ok: false, errors: { _form: "Тег не найден" } };
  if (!parsed.success) return { ok: false, errors: { name: parsed.error.issues[0]?.message ?? "Ошибка" } };

  try {
    await db.update(tags).set({ name: parsed.data }).where(eq(tags.id, id));
  } catch {
    return { ok: false, errors: { name: "Тег с таким названием уже существует" } };
  }

  revalidatePath("/tags");
  revalidatePath("/");
  return { ok: true, message: "Переименован" };
}

export async function deleteTagAction(data: FormData): Promise<void> {
  const id = str(data, "id");
  if (!id) return;
  // lead_tags чистится каскадом.
  await db.delete(tags).where(eq(tags.id, id));
  revalidatePath("/tags");
  revalidatePath("/");
}
