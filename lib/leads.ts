import { and, asc, desc, eq, exists, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  leadMessages,
  leadTags,
  leads,
  tags,
  type Lead,
  type LeadSource,
  type LeadStatus,
  type LeadMessage,
  type Tag,
} from "@/db/schema";

export type LeadWithTags = Lead & { tags: Tag[] };

export type LeadFilters = {
  tagNames: string[];
  sources: LeadSource[];
  statuses: LeadStatus[];
};

/** Разбирает ?tag=&source=&status= из searchParams в типизированные фильтры. */
export function parseFilters(params: Record<string, string | string[] | undefined>): LeadFilters {
  const list = (value: string | string[] | undefined): string[] => {
    if (value === undefined) return [];
    const raw = Array.isArray(value) ? value : [value];
    return raw.flatMap((v) => v.split(",")).map((v) => v.trim()).filter((v) => v.length > 0);
  };

  return {
    tagNames: list(params["tag"]),
    sources: list(params["source"]).filter((v): v is LeadSource =>
      (LEAD_SOURCES as readonly string[]).includes(v),
    ),
    statuses: list(params["status"]).filter((v): v is LeadStatus =>
      (LEAD_STATUSES as readonly string[]).includes(v),
    ),
  };
}

export async function listLeads(filters: LeadFilters): Promise<LeadWithTags[]> {
  const conditions = [];

  if (filters.sources.length > 0) conditions.push(inArray(leads.source, filters.sources));
  if (filters.statuses.length > 0) conditions.push(inArray(leads.status, filters.statuses));

  // Логика ИЛИ: лид подходит, если у него есть хотя бы один из выбранных тегов.
  if (filters.tagNames.length > 0) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(leadTags)
          .innerJoin(tags, eq(tags.id, leadTags.tagId))
          .where(and(eq(leadTags.leadId, leads.id), inArray(tags.name, filters.tagNames))),
      ),
    );
  }

  const rows = await db
    .select()
    .from(leads)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(leads.createdAt));

  return attachTags(rows);
}

/** Догружает теги одним запросом вместо N+1. */
async function attachTags(rows: Lead[]): Promise<LeadWithTags[]> {
  if (rows.length === 0) return [];

  const links = await db
    .select({ leadId: leadTags.leadId, tag: tags })
    .from(leadTags)
    .innerJoin(tags, eq(tags.id, leadTags.tagId))
    .where(inArray(leadTags.leadId, rows.map((r) => r.id)))
    .orderBy(asc(tags.name));

  const byLead = new Map<string, Tag[]>();
  for (const link of links) {
    const bucket = byLead.get(link.leadId);
    if (bucket) bucket.push(link.tag);
    else byLead.set(link.leadId, [link.tag]);
  }

  return rows.map((row) => ({ ...row, tags: byLead.get(row.id) ?? [] }));
}

export async function getLead(id: string): Promise<LeadWithTags | null> {
  const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  const lead = rows[0];
  if (!lead) return null;
  const [withTags] = await attachTags([lead]);
  return withTags ?? null;
}

export async function getLeadMessages(leadId: string): Promise<LeadMessage[]> {
  return db
    .select()
    .from(leadMessages)
    .where(eq(leadMessages.leadId, leadId))
    .orderBy(asc(leadMessages.createdAt));
}

export async function listTags(): Promise<Tag[]> {
  return db.select().from(tags).orderBy(asc(tags.name));
}

export async function tagUsageCounts(): Promise<Map<string, number>> {
  const rows = await db
    .select({ tagId: leadTags.tagId, count: sql<number>`count(*)::int` })
    .from(leadTags)
    .groupBy(leadTags.tagId);
  return new Map(rows.map((r) => [r.tagId, r.count]));
}

/**
 * Находит тег по имени (без учёта регистра) или создаёт его.
 * Используется и ботом (авто-тег категории), и вводом нового тега в карточке.
 */
export async function ensureTag(name: string, color?: string): Promise<Tag> {
  const normalized = name.trim();

  const existing = await db
    .select()
    .from(tags)
    .where(sql`lower(${tags.name}) = lower(${normalized})`)
    .limit(1);
  if (existing[0]) return existing[0];

  const inserted = await db
    .insert(tags)
    .values({ name: normalized, color: color ?? null })
    .onConflictDoNothing({ target: tags.name })
    .returning();
  if (inserted[0]) return inserted[0];

  // Гонка: тег успели создать параллельно.
  const again = await db
    .select()
    .from(tags)
    .where(sql`lower(${tags.name}) = lower(${normalized})`)
    .limit(1);
  const found = again[0];
  if (!found) throw new Error(`Не удалось создать тег «${normalized}»`);
  return found;
}
