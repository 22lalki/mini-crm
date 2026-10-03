import {
  pgTable,
  uuid,
  text,
  bigint,
  timestamp,
  jsonb,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

/** Источник лида. */
export const LEAD_SOURCES = ["telegram_bot", "telegram_account", "manual"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/** Статус лида. */
export const LEAD_STATUSES = ["new", "in_progress", "done"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Шаг диалога бота. */
export const BOT_STEPS = ["ask_name", "ask_contact", "ask_request", "ask_category", "done"] as const;
export type BotStep = (typeof BOT_STEPS)[number];

/** Черновик заявки, который бот собирает по шагам. */
export type BotDraft = {
  name?: string;
  contact?: string;
  request?: string;
};

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    contact: text("contact"),
    request: text("request"),
    source: text("source").$type<LeadSource>().notNull(),
    status: text("status").$type<LeadStatus>().notNull().default("new"),
    tgUserId: bigint("tg_user_id", { mode: "number" }),
    tgUsername: text("tg_username"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("leads_created_at_idx").on(t.createdAt), index("leads_tg_user_id_idx").on(t.tgUserId)],
);

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  color: text("color"),
});

export const leadTags = pgTable(
  "lead_tags",
  {
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.leadId, t.tagId] })],
);

export const botSessions = pgTable("bot_sessions", {
  tgUserId: bigint("tg_user_id", { mode: "number" }).primaryKey(),
  step: text("step").$type<BotStep>().notNull(),
  draft: jsonb("draft").$type<BotDraft>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leadMessages = pgTable(
  "lead_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    text: text("text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lead_messages_lead_id_idx").on(t.leadId)],
);

export type Lead = typeof leads.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type LeadMessage = typeof leadMessages.$inferSelect;
