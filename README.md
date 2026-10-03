# Мини-CRM для заявок агентства

Заявка приходит в Telegram-бота → лид сразу появляется в CRM с автоматически
проставленным тегом категории → по этому тегу работает фильтр, который живёт в URL.

- **Прод:** https://mini-crm-zeta-ochre.vercel.app
- **Бот:** [@test_mini_crm_bot](https://t.me/test_mini_crm_bot)
- **Пароль для входа** — в сопроводительном документе рядом с этими ссылками.

> Первый запрос после простоя может занять пару секунд: Neon на free-плане
> усыпляет compute через 5 минут бездействия и будит его на первом обращении.

Разбор решения и план по пункту 2 — в [SOLUTION.md](SOLUTION.md).

## Стек

Next.js 15 (App Router) · TypeScript strict · Tailwind 4 · PostgreSQL + Drizzle ORM ·
Telegram Bot API через webhook (без библиотек, без long polling) · деплой на Vercel.

## Что сделано

| Пункт ТЗ | Статус | Где смотреть |
| --- | --- | --- |
| **1. Заявки из Telegram-бота** | готово | [lib/bot.ts](lib/bot.ts), [app/api/telegram/webhook/route.ts](app/api/telegram/webhook/route.ts) |
| **2. Личный Telegram (Telegram Business)** | код готов и покрыт тестом, не включён на живом аккаунте — нужен Premium | `handleBusinessMessage` в [lib/bot.ts](lib/bot.ts) |
| **3. Ручное добавление** | готово | [app/leads/new/](app/leads/new/) |
| **4. Теги** | готово | [app/leads/[id]/page.tsx](app/leads/%5Bid%5D/page.tsx), [app/tags/](app/tags/), [components/filters.tsx](components/filters.tsx) |
| Доступ по паролю | готово | [middleware.ts](middleware.ts), [lib/session.ts](lib/session.ts) |

Диалог бота: `/start` → имя → контакт (кнопка «Отправить номер телефона» или текст) →
задача → inline-кнопки **Сайт / Реклама / SMM / Другое**. Нажатие кнопки создаёт лид и
сразу вешает на него тег выбранной категории, так что путь «сообщение боту → лид с тегом»
проходит вообще без действий в CRM. Состояние диалога — в таблице `bot_sessions`,
потому что serverless-функция не хранит память между вызовами.

### За скобками — сознательно

Роли и мультипользовательность, воронки/канбан, уведомления, аналитика,
импорт-экспорт, редизайн. Так же осознанно не делались вебсокеты: список обновляется
polling-ом раз в 10 секунд через `router.refresh()` — для MVP этого достаточно.

## Переменные окружения

Скопируйте `.env.example` в `.env.local` и заполните:

| Переменная | Зачем |
| --- | --- |
| `DATABASE_URL` | Postgres (Neon / Railway / локальный). Для Neon — pooled connection string |
| `TELEGRAM_BOT_TOKEN` | токен от @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | произвольная длинная строка; её Telegram присылает в заголовке `X-Telegram-Bot-Api-Secret-Token` |
| `ADMIN_PASSWORD` | единственный пароль для входа в CRM |
| `SESSION_SECRET` | которой подписывается cookie сессии |
| `PUBLIC_BASE_URL` | нужен только скрипту `set-webhook` |
| `NEXT_PUBLIC_BOT_USERNAME` | имя бота без `@`, для ссылки в пустом состоянии |

## Запуск локально

```bash
npm install
cp .env.example .env.local   # и заполнить
npm run db:migrate           # применить миграции
npm run db:seed              # теги по умолчанию: сайт, реклама, smm, горячий, другое
npm run dev                  # http://localhost:3000
```

Миграции генерируются из схемы: `npm run db:generate` (файлы в `drizzle/`).

## Как выставить webhook

Бот работает только через webhook, поэтому локально нужен публичный URL
(`vercel dev`, ngrok, cloudflared) либо сразу прод-домен.

```bash
# url берётся из PUBLIC_BASE_URL
npm run set-webhook

# или явно
npm run set-webhook -- https://your-app.vercel.app

# снять webhook
npm run delete-webhook
```

Скрипт вызывает `setWebhook` с `secret_token` и `allowed_updates`
(`message`, `callback_query`, `business_message`, `business_connection`),
затем печатает `getWebhookInfo` — по нему видно, принял ли Telegram адрес.

## Деплой на Vercel

1. Залить репозиторий на GitHub и импортировать проект в Vercel.
2. Прописать в Project Settings → Environment Variables все переменные из таблицы выше.
3. Задеплоить, затем применить миграции и сид к продовой базе:
   `DATABASE_URL=... npm run db:migrate && DATABASE_URL=... npm run db:seed`.
4. `npm run set-webhook -- https://<прод>` — и бот на связи.

## Прогон чек-листа

Чек-лист приёмки из ТЗ автоматизирован и **не требует ни базы, ни бота, ни интернета**:
Postgres поднимается в процессе (PGlite через TCP-сокет), Bot API подменяется локальной
заглушкой, а приложение запускается настоящим `next dev`.

```bash
npm run smoke
```

48 проверок: защита вебхука и страниц, весь диалог бота (включая стикер посреди диалога
и повторный `/start`), авто-тег, фильтры в URL с логикой ИЛИ, `business_message`,
валидация формы, добавление и снятие тегов. Пункты, которые ходят через Server Actions
(submit формы в браузере), проверяются на слое данных — их всё равно стоит один раз
прощёлкать руками.

## Структура

```
app/
  page.tsx                  список лидов: фильтры, счётчик, автообновление
  actions.ts                Server Actions: лиды, теги
  leads/new/                ручное добавление (пункт 3)
  leads/[id]/               карточка лида: поля, статус, теги, история
  tags/                     управление тегами: создать, переименовать, удалить
  login/                    вход по паролю
  api/telegram/webhook/     единственная точка входа Telegram (пункты 1 и 2)
db/                         схема Drizzle и клиент
drizzle/                    сгенерированные SQL-миграции
lib/
  bot.ts                    конечный автомат диалога бота
  telegram.ts               минимальный клиент Bot API на fetch
  leads.ts                  запросы к лидам и тегам, фильтры
  session.ts                подпись и проверка cookie (работает и в edge, и в node)
middleware.ts               защита всех страниц кроме /login и /api/telegram/*
scripts/                    migrate, seed, set-webhook, smoke
```
