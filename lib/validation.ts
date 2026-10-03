import { z } from "zod";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/db/schema";

export const leadInputSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя").max(200, "Слишком длинное имя"),
  contact: z.string().trim().max(300, "Слишком длинный контакт").optional().default(""),
  request: z.string().trim().max(5000, "Слишком длинный запрос").optional().default(""),
  status: z.enum(LEAD_STATUSES),
  source: z.enum(LEAD_SOURCES).optional(),
  tagIds: z.array(z.string().uuid("Некорректный тег")).optional().default([]),
});

export type LeadInput = z.infer<typeof leadInputSchema>;

export const tagNameSchema = z
  .string()
  .trim()
  .min(1, "Название тега не может быть пустым")
  .max(40, "Не длиннее 40 символов");

/** Ошибки по полям в виде { поле: сообщение } — удобно рендерить рядом с input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}
