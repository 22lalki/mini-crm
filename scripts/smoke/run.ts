/**
 * Прогон чек-листа приёмки из ТЗ без внешних сервисов:
 * база — PGlite в процессе, Bot API — локальная заглушка, приложение — настоящий next dev.
 *
 *   npm run smoke
 */
import { spawn, type ChildProcess } from "node:child_process";
import { makeSessionCookie, startHarness, type Harness } from "./harness";

const PG_PORT = 54329;
const TG_PORT = 54330;
const APP_PORT = 3399;
const BASE = `http://127.0.0.1:${APP_PORT}`;

const WEBHOOK_SECRET = "smoke-webhook-secret";
const SESSION_SECRET = "smoke-session-secret";
const ADMIN_PASSWORD = "smoke-password";

const USER = { id: 777001, first_name: "Иван", username: "ivan_test" };
const OTHER = { id: 777002, first_name: "Пётр" };

let failures = 0;
let checks = 0;

function check(name: string, condition: boolean, detail?: string): void {
  checks += 1;
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

async function main(): Promise<void> {
  const harness = await startHarness(PG_PORT, TG_PORT);
  console.log(`PGlite:   ${harness.databaseUrl}`);
  console.log(`Bot API:  ${harness.telegramApiBase}`);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: harness.databaseUrl,
    TELEGRAM_BOT_TOKEN: "000:smoke",
    TELEGRAM_API_BASE: harness.telegramApiBase,
    TELEGRAM_WEBHOOK_SECRET: WEBHOOK_SECRET,
    SESSION_SECRET,
    ADMIN_PASSWORD,
    NEXT_PUBLIC_BOT_USERNAME: "smoke_bot",
    NODE_ENV: "development",
  };

  await seedTags(harness);

  const app: ChildProcess = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["next", "dev", "-p", String(APP_PORT)],
    { env, stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" },
  );

  const appLog: string[] = [];
  app.stdout?.on("data", (d: Buffer) => appLog.push(d.toString()));
  app.stderr?.on("data", (d: Buffer) => appLog.push(d.toString()));

  try {
    await waitForApp();
    await runChecks(harness);
  } catch (error) {
    failures += 1;
    console.error("\nСмоук упал:", error);
    console.error(appLog.join("").slice(-4000));
  } finally {
    await killTree(app);
    await harness.stop();
  }

  console.log(`\nПроверок: ${checks}, провалено: ${failures}`);
  process.exit(failures === 0 ? 0 : 1);
}

/**
 * На Windows next dev запускается через shell, поэтому kill() убивает только обёртку.
 * Дерево процессов приходится гасить через taskkill, иначе порт останется занят.
 */
async function killTree(child: ChildProcess): Promise<void> {
  const pid = child.pid;
  if (pid === undefined) return;

  if (process.platform === "win32") {
    await new Promise<void>((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
      killer.on("exit", () => resolve());
      killer.on("error", () => resolve());
    });
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  }

  await new Promise((r) => setTimeout(r, 500));
}

async function seedTags(harness: Harness): Promise<void> {
  process.env["DATABASE_URL"] = harness.databaseUrl;
  const { DEFAULT_TAGS } = await import("../../lib/constants");
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: harness.databaseUrl, max: 1 });
  for (const tag of DEFAULT_TAGS) {
    await pool.query("insert into tags (name, color) values ($1, $2) on conflict do nothing", [
      tag.name,
      tag.color,
    ]);
  }
  await pool.end();
}

async function waitForApp(): Promise<void> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/telegram/webhook`, { redirect: "manual" });
      if (res.status === 200) return;
    } catch {
      // сервер ещё поднимается
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("next dev не поднялся за 120 с");
}

let updateId = 1;

async function sendUpdate(payload: Record<string, unknown>, secret = WEBHOOK_SECRET) {
  return fetch(`${BASE}/api/telegram/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": secret,
    },
    body: JSON.stringify({ update_id: updateId++, ...payload }),
  });
}

function textMessage(user: typeof USER, text: string) {
  return { message: { message_id: updateId, from: user, chat: { id: user.id, type: "private" }, text } };
}

async function runChecks(harness: Harness): Promise<void> {
  const cookie = `crm_session=${await makeSessionCookie(SESSION_SECRET)}`;

  // --- п.7: защита вебхука и страниц ---
  section("Чек-лист 7: доступ");
  const noSecret = await fetch(`${BASE}/api/telegram/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ update_id: 0 }),
  });
  check("webhook без секрета → 401", noSecret.status === 401, `получили ${noSecret.status}`);

  const badSecret = await sendUpdate(textMessage(USER, "/start"), "wrong");
  check("webhook с неверным секретом → 401", badSecret.status === 401, `получили ${badSecret.status}`);

  for (const path of ["/", "/tags", "/leads/new"]) {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    const location = res.headers.get("location") ?? "";
    check(
      `${path} без логина → редирект на /login`,
      (res.status === 307 || res.status === 302) && location.includes("/login"),
      `${res.status} ${location}`,
    );
  }

  const tampered = await fetch(`${BASE}/`, {
    redirect: "manual",
    headers: { cookie: `crm_session=${Date.now() + 60000}.deadbeef` },
  });
  check(
    "подделанная cookie → редирект на /login",
    tampered.status === 307 || tampered.status === 302,
    `получили ${tampered.status}`,
  );

  const withCookie = await fetch(`${BASE}/`, { redirect: "manual", headers: { cookie } });
  check("валидная cookie → 200", withCookie.status === 200, `получили ${withCookie.status}`);

  // --- п.1 и п.2: диалог бота ---
  section("Чек-лист 1-3: диалог бота");
  harness.clearCalls();

  await sendUpdate(textMessage(USER, "/start"));
  const greeting = harness.lastCall("sendMessage");
  check(
    "/start → приветствие и вопрос об имени",
    String(greeting?.body["text"] ?? "").includes("Как вас зовут"),
    JSON.stringify(greeting?.body["text"]),
  );

  // Стикер посреди диалога: сообщение без текста.
  harness.clearCalls();
  await sendUpdate({
    message: { message_id: 1, from: USER, chat: { id: USER.id, type: "private" }, sticker: { file_id: "x" } },
  });
  const afterSticker = harness.lastCall("sendMessage");
  check(
    "стикер → бот мягко повторяет вопрос (п.3)",
    String(afterSticker?.body["text"] ?? "").includes("Как вас зовут"),
    JSON.stringify(afterSticker?.body["text"]),
  );

  harness.clearCalls();
  await sendUpdate(textMessage(USER, "Иван Петров"));
  const askContact = harness.lastCall("sendMessage");
  const markup = askContact?.body["reply_markup"] as { keyboard?: { request_contact?: boolean }[][] };
  check(
    "имя → вопрос о контакте",
    String(askContact?.body["text"] ?? "").includes("связаться"),
    JSON.stringify(askContact?.body["text"]),
  );
  check(
    "есть reply-кнопка request_contact",
    markup?.keyboard?.[0]?.[0]?.request_contact === true,
    JSON.stringify(markup),
  );

  // п.2: телефон кнопкой.
  harness.clearCalls();
  await sendUpdate({
    message: {
      message_id: 2,
      from: USER,
      chat: { id: USER.id, type: "private" },
      contact: { phone_number: "79991234567", first_name: "Иван" },
    },
  });
  check(
    "контакт кнопкой → вопрос о задаче",
    String(harness.lastCall("sendMessage")?.body["text"] ?? "").includes("Опишите"),
  );

  harness.clearCalls();
  await sendUpdate(textMessage(USER, "Нужен лендинг под запуск"));
  const askCategory = harness.lastCall("sendMessage");
  const inline = askCategory?.body["reply_markup"] as {
    inline_keyboard?: { text: string; callback_data: string }[][];
  };
  check(
    "задача → вопрос с inline-кнопками категорий",
    (inline?.inline_keyboard ?? []).flat().some((b) => b.callback_data === "cat:site"),
    JSON.stringify(inline),
  );

  harness.clearCalls();
  await sendUpdate({
    callback_query: {
      id: "cb1",
      from: USER,
      data: "cat:site",
      message: { message_id: 3, chat: { id: USER.id, type: "private" } },
    },
  });
  check(
    "кнопка «Сайт» → подтверждение заявки",
    String(harness.lastCall("sendMessage")?.body["text"] ?? "").includes("заявка принята"),
  );

  // --- проверяем, что лид доехал в CRM ---
  section("Чек-лист 1: лид в CRM с тегом и бейджем");
  const listHtml = await (await fetch(`${BASE}/`, { headers: { cookie } })).text();
  check("лид виден в списке", listHtml.includes("Иван Петров"));
  check("телефон из кнопки попал в лид (п.2)", listHtml.includes("+79991234567"), "ожидали +79991234567");
  check("найдено: 1", /Найдено:.*?>1</s.test(listHtml), "счётчик не равен 1");

  // На карточке нет чипов фильтров, поэтому бейдж и тег там проверяются однозначно.
  const botLeadId = await findLeadIdByName(harness, "Иван Петров");
  const botCard = await (await fetch(`${BASE}/leads/${botLeadId}`, { headers: { cookie } })).text();
  check("в карточке бейдж источника «Бот»", /Бот<\/span>/.test(botCard));
  check("в карточке тег «сайт»", /сайт\s*<\/span>/.test(botCard), "тег не отрисован бейджем");
  check("username из Telegram сохранён", botCard.includes("ivan_test"));
  check("tg_user_id сохранён", botCard.includes(String(USER.id)));
  check("запрос сохранён", botCard.includes("Нужен лендинг под запуск"));

  // --- п.8: повторный /start создаёт новый лид ---
  section("Чек-лист 8: повторный /start");
  await sendUpdate(textMessage(USER, "/start"));
  await sendUpdate(textMessage(USER, "Иван Второй"));
  await sendUpdate(textMessage(USER, "почта mail@example.com"));
  await sendUpdate(textMessage(USER, "Нужна реклама"));
  await sendUpdate({
    callback_query: {
      id: "cb2",
      from: USER,
      data: "cat:ads",
      message: { message_id: 9, chat: { id: USER.id, type: "private" } },
    },
  });

  const afterSecond = await (await fetch(`${BASE}/`, { headers: { cookie } })).text();
  check("появился второй лид", afterSecond.includes("Иван Второй"));
  check("первый лид не изменился", afterSecond.includes("Иван Петров"));
  check("найдено: 2", /Найдено:.*?>2</s.test(afterSecond));

  // Повторное нажатие той же кнопки не должно создать третий лид.
  await sendUpdate({
    callback_query: {
      id: "cb2-again",
      from: USER,
      data: "cat:ads",
      message: { message_id: 9, chat: { id: USER.id, type: "private" } },
    },
  });
  const afterDouble = await (await fetch(`${BASE}/`, { headers: { cookie } })).text();
  check("повторное нажатие кнопки не плодит лидов", /Найдено:.*?>2</s.test(afterDouble));

  // --- п.6: фильтр по тегу в URL ---
  section("Чек-лист 6: фильтр по тегу в URL");
  const onlySite = await (
    await fetch(`${BASE}/?tag=${encodeURIComponent("сайт")}`, { headers: { cookie } })
  ).text();
  check("?tag=сайт показывает только лид с этим тегом", onlySite.includes("Иван Петров"));
  check("?tag=сайт скрывает остальных", !onlySite.includes("Иван Второй"));
  check("счётчик при фильтре: 1", /Найдено:.*?>1</s.test(onlySite));

  const bothTags = await (
    await fetch(`${BASE}/?tag=${encodeURIComponent("сайт")}&tag=${encodeURIComponent("реклама")}`, {
      headers: { cookie },
    })
  ).text();
  check(
    "два тега работают по ИЛИ",
    bothTags.includes("Иван Петров") && bothTags.includes("Иван Второй"),
  );

  const byStatus = await (await fetch(`${BASE}/?status=done`, { headers: { cookie } })).text();
  check("фильтр по статусу отсекает всё", /Найдено:.*?>0</s.test(byStatus));

  const bySource = await (await fetch(`${BASE}/?source=manual`, { headers: { cookie } })).text();
  check("фильтр по источнику отсекает ботовых", /Найдено:.*?>0</s.test(bySource));

  // --- п.9: личка через Telegram Business ---
  section("Чек-лист 9: business_message (пункт 2)");
  await sendUpdate({
    business_message: {
      message_id: 20,
      business_connection_id: "bc1",
      from: OTHER,
      chat: { id: OTHER.id, type: "private" },
      text: "Здравствуйте, сколько стоит сайт?",
    },
  });
  await sendUpdate({
    business_message: {
      message_id: 21,
      business_connection_id: "bc1",
      from: OTHER,
      chat: { id: OTHER.id, type: "private" },
      text: "И ещё вопрос про сроки",
    },
  });

  const tgOnly = await (
    await fetch(`${BASE}/?source=telegram_account`, { headers: { cookie } })
  ).text();
  check("лид из лички создан", tgOnly.includes("Пётр"));
  check("второе сообщение не создало второй лид", /Найдено:.*?>1</s.test(tgOnly));

  const leadId = await findLeadIdByName(harness, "Пётр");
  const cardHtml = await (await fetch(`${BASE}/leads/${leadId}`, { headers: { cookie } })).text();
  check("в карточке тег «telegram»", /telegram\s*<\/span>/.test(cardHtml));
  check("в карточке бейдж источника «Telegram»", /Telegram<\/span>/.test(cardHtml));
  check(
    "оба сообщения в истории карточки",
    cardHtml.includes("сколько стоит сайт") && cardHtml.includes("про сроки"),
  );

  // --- п.4: валидация ручного добавления ---
  section("Чек-лист 4: валидация формы");
  const { leadInputSchema } = await import("../../lib/validation");
  const { fieldErrors } = await import("../../lib/validation");
  const empty = leadInputSchema.safeParse({ name: "  ", status: "new" });
  check(
    "пустое имя → ошибка у поля name",
    !empty.success && fieldErrors(empty.error)["name"] === "Укажите имя",
    empty.success ? "валидация пропустила" : JSON.stringify(fieldErrors(empty.error)),
  );
  const ok = leadInputSchema.safeParse({
    name: "Тест",
    status: "new",
    tagIds: ["3f2b1c4e-0000-4000-8000-000000000000"],
  });
  check("корректные данные проходят", ok.success);

  const newPage = await fetch(`${BASE}/leads/new`, { headers: { cookie } });
  check("страница добавления открывается", newPage.status === 200);
  const tagsPage = await fetch(`${BASE}/tags`, { headers: { cookie } });
  check("страница управления тегами открывается", tagsPage.status === 200);

  // --- п.5: теги на карточке. Server Actions по HTTP не подёргать,
  // поэтому проверяем слой данных, который они оборачивают.
  section("Чек-лист 5: теги на лиде");
  const { ensureTag, listLeads, getLead } = await import("../../lib/leads");
  const { db } = await import("../../db");
  const { leadTags } = await import("../../db/schema");
  const { eq, and } = await import("drizzle-orm");

  const fresh = await ensureTag("из-карточки");
  check("новый тег создаётся по названию", fresh.name === "из-карточки");

  const sameTag = await ensureTag("ИЗ-КАРТОЧКИ");
  check("тот же тег в другом регистре не дублируется", sameTag.id === fresh.id);

  await db.insert(leadTags).values({ leadId: botLeadId, tagId: fresh.id }).onConflictDoNothing();
  const afterAttach = await getLead(botLeadId);
  check(
    "тег привязался к лиду",
    (afterAttach?.tags ?? []).some((t) => t.id === fresh.id),
  );
  check("у лида теперь два тега", (afterAttach?.tags ?? []).length === 2);

  const byNewTag = await listLeads({ tagNames: ["из-карточки"], sources: [], statuses: [] });
  check("фильтр находит лида по новому тегу", byNewTag.some((l) => l.id === botLeadId));

  await db
    .delete(leadTags)
    .where(and(eq(leadTags.leadId, botLeadId), eq(leadTags.tagId, fresh.id)));
  const afterDetach = await getLead(botLeadId);
  check(
    "снятие тега отражается на лиде",
    !(afterDetach?.tags ?? []).some((t) => t.id === fresh.id),
  );
  const goneFromFilter = await listLeads({ tagNames: ["из-карточки"], sources: [], statuses: [] });
  check("после снятия фильтр лида не находит", goneFromFilter.length === 0);
}

async function findLeadIdByName(harness: Harness, name: string): Promise<string> {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: harness.databaseUrl, max: 1 });
  const res = await pool.query<{ id: string }>("select id from leads where name like $1 limit 1", [
    `%${name}%`,
  ]);
  await pool.end();
  const id = res.rows[0]?.id;
  if (!id) throw new Error(`Лид «${name}» не найден`);
  return id;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
