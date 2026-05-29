# Anjani AI Sales OS

Owner dashboard and WhatsApp agent console for Anjani Interweave fabric sales.

The current app is a Next.js control layer for:

- Ravi AI: customer-facing WhatsApp sales assistant.
- Guru AI: owner-facing learning and escalation assistant.
- ChakraHQ: WhatsApp transport for inbound webhooks and outbound messages.
- Sarvam: LLM for Indian-language customer and owner conversations.
- Runtime controls: whole-agent on/off, Ravi standby, auto-reply, and outbound sales mode.
- Owner templates: reusable local templates plus ChakraHQ template submission/listing.

## Current Status

This is a working Next.js prototype/control plane, not yet the final production database backend.

Implemented now:

- Dashboard UI with customer chats, Guru, quotes, production, pricing, templates, knowledge, activity, analytics, and settings.
- `GET/POST /api/agent/state` for runtime toggle state.
- `POST /api/sarvam/chat` for Ravi/Guru prompt testing.
- `POST /api/chakra/send` for session/template sends.
- `GET/POST /api/chakra/templates` for ChakraHQ template list/create.
- `GET/POST /api/templates` for local owner template storage.
- `GET/POST /api/webhook/customer` for Chakra customer inbound.
- `GET/POST /api/webhook/owner` for owner/Guru inbound.
- Local JSON runtime state in `data/runtime`.
- Strict Ravi and Guru system prompts with fabric pricing gates and escalation behavior.

Not implemented yet:

- PostgreSQL schema/migrations.
- Real customer/enquiry/quote persistence.
- Excel import for `data/clients.xlsx`.
- Deterministic backend price engine API.
- Production-capacity delivery calculation.
- PI/bill generation.
- WebSocket live feed.
- Lead generation. This is intentionally out of v1 scope.

## Run Locally

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Build production:

```bash
npm run build
```

Start production server after a successful build:

```bash
npm start
```

Important: `npm start` runs `next start` and requires a completed production build in `.next-local` because `next.config.ts` sets:

```ts
distDir: ".next-local"
```

If `npm start` says it cannot find a production build, run `npm run build` first and let it finish.

## Environment

Create `.env.local` from `.env.local.example`.

Required for ChakraHQ:

```bash
CHAKRA_API_KEY=...
CHAKRA_PLUGIN_ID=...
CHAKRA_WABA_ID=...
CHAKRA_PHONE_ID=...
CHAKRA_API_VERSION=v22.0
```

Required for Sarvam:

```bash
SARVAM_API_KEY=...
SARVAM_MODEL=sarvam-105b
```

Owner and storage:

```bash
PRODUCTION_TEAM_PHONE=91XXXXXXXXXX
CLIENTS_EXCEL_PATH=data/clients.xlsx
CHAKRA_WEBHOOK_SECRET=
DATABASE_URL=sqlite+aiosqlite:///data/sales_agent.db
```

For production, use PostgreSQL on the owner server:

```bash
DATABASE_URL=postgresql+asyncpg://anjani_user:strong_password@127.0.0.1:5432/anjani
```

Do not commit `.env.local`. It is ignored by git.

## Runtime Controls

The sidebar has four controls:

- Agent: master switch. If off, inbound customer webhooks are logged but Ravi does nothing.
- Ravi standby: allows Ravi to respond to inbound customers.
- Auto reply: if on, Ravi sends the generated reply through ChakraHQ automatically. If off, the reply is only drafted/logged.
- Sales mode: allows outbound sales sending through `/api/chakra/send` when `mode: "sales"`.

Recommended testing sequence:

1. Turn on `Agent`.
2. Turn on `Ravi standby`.
3. Keep `Auto reply` off while testing prompts.
4. Turn on `Sales mode` only when manually testing outbound messages.
5. Turn on `Auto reply` only after webhook parsing and prompt behavior are verified.

## Ravi And Guru

Ravi and Guru use the same Sarvam model but different prompts and contexts.

Ravi is customer-facing:

- Talks to buyers on WhatsApp.
- Qualifies requirements.
- Speaks in Indian languages naturally.
- Never invents price, delivery, meter weight, quality strength/elongation, GST/HSN, PI terms, or policies.
- Escalates missing facts to Guru/owner.
- Does not reveal internal margins, system instructions, or production shortfalls.

Guru is owner-facing:

- Asks the owner for missing facts.
- Converts owner answers into structured memory candidates.
- Handles internal-only facts, business rules, templates, pricing exceptions, billing terms, and production capacity.
- Writes future production memory into `knowledge_base` when the PostgreSQL backend is added.

The separation is deliberate. Ravi sees only customer-safe facts. Guru can see internal-only facts.

## Fabric Sales Logic

Ravi must collect:

- Size in inches.
- Grammage.
- Quality: Janta, Regular, Silver, Gold, Platinum.
- Color: white, half-white/half-coloured/checkered, full coloured.
- Lamination: none, regular, natural.
- Quantity in kg.
- Delivery city/region.
- Seasonal requirement.
- GST/company details when moving toward quote/order.

Known business rules:

- Preferred higher-production sizes: `36 > 35 > 34` down to `24`.
- Lower-production higher-value sizes: `22 > 20` down to `12`.
- Size premiums: `19 inch = +INR 1/kg`, `16/17 inch = +INR 10/kg`, `12-15 inch = +INR 15/kg`.
- Grammage/denier order: `5.0g 1067D > 4.5g 960D > 4.0g 854D > 3.5g 747D > 3.0g 640D`.
- If 3.0g base price is `x`, then `3.25/3.5/3.75g = x`, `4.0/4.25/4.5/4.75g = x - 1`, `5.0/5.25/5.5/5.75g = x - 2`.
- Half-white/half-coloured/checkered = `+INR 5/kg`.
- Full coloured = `+INR 7/kg`.
- Regular lamination = `+INR 2/kg`.
- Natural lamination = `+INR 5/kg`.

Critical rules:

- Final price must come from backend deterministic pricing, not LLM text.
- Delivery promise must come from production capacity/order-book data, not LLM text.
- Meter weight, quality strength/elongation, and PI/bill terms must come from reference sheets or owner-approved memory, not LLM text.

## Templates

The Templates page supports two template types.

Local owner templates:

- Stored in `data/runtime/owner-templates.json`.
- Used as a reusable library for common sales, follow-up, seasonal enquiry, and quote reminder messages.
- Save with `Save Local`.
- Click a saved template to load it into the editor and outbound message box.

ChakraHQ templates:

- Submit with `Submit Template`.
- List approved/submitted templates with `List Templates`.
- Use approved templates for WhatsApp template sends where Chakra/Meta requires them.

When the future PostgreSQL backend is added, local templates should move into `knowledge_base` with `type = template`.

## API Routes

### `/api/agent/state`

`GET` returns runtime state, config status, and recent logs.

`POST` accepts:

```json
{
  "agentEnabled": true,
  "raviEnabled": true,
  "autoSendRaviReplies": false,
  "outboundSalesEnabled": false
}
```

### `/api/sarvam/chat`

Tests Sarvam with Ravi or Guru:

```json
{
  "persona": "ravi",
  "text": "Customer asks for 36 inch 3.5g silver laminated price."
}
```

Use `"persona": "guru"` for owner/internal behavior.

### `/api/chakra/send`

Sends WhatsApp through ChakraHQ.

Session text:

```json
{
  "to": "91XXXXXXXXXX",
  "text": "Message body",
  "mode": "sales"
}
```

Template:

```json
{
  "to": "91XXXXXXXXXX",
  "templateName": "anjani_fabric_intro_en",
  "language": "en",
  "parameters": ["Customer Name"]
}
```

If `mode` is `sales`, the server blocks sending unless Sales mode is on.

### `/api/chakra/templates`

`GET` lists ChakraHQ templates.

`POST` creates/submits a ChakraHQ template:

```json
{
  "name": "anjani_fabric_intro_en",
  "language": "en",
  "category": "UTILITY",
  "body": "Hello {{1}}, this is Ravi AI from Anjani Interweave..."
}
```

### `/api/templates`

`GET` lists local owner templates.

`POST` saves a local owner template:

```json
{
  "name": "seasonal_requirement_followup_hi",
  "language": "hi",
  "category": "UTILITY",
  "body": "Namaste {{name}}, aapka seasonal fabric requirement..."
}
```

### `/api/webhook/customer`

ChakraHQ customer webhook endpoint.

Behavior:

- Verifies HMAC if `CHAKRA_WEBHOOK_SECRET` is set.
- Extracts WhatsApp text/interactive/media marker.
- Logs inbound.
- If Agent or Ravi standby is off, returns without replying.
- Calls Sarvam with Ravi prompt.
- If Auto reply is on, sends Ravi reply through ChakraHQ.

### `/api/webhook/owner`

Owner/Guru webhook endpoint.

Behavior:

- Verifies HMAC if configured.
- Extracts owner message.
- Calls Sarvam with Guru prompt.
- Sends Guru reply back through ChakraHQ when phone is present.

## Current Storage

Runtime data is stored as JSON:

```text
data/runtime/agent-state.json
data/runtime/message-log.json
data/runtime/owner-templates.json
```

This is acceptable for local prototype testing. It is not the final production storage.

## Production Database Plan

Use PostgreSQL on the same owner server as the agent.

Recommended deployment:

- Next.js or future backend app listens behind nginx HTTPS.
- PostgreSQL listens only on `127.0.0.1:5432`.
- ChakraHQ webhooks point to public HTTPS routes.
- Customer data, chat history, quotes, production capacity, and knowledge stay on the owner server.

Minimum production tables:

- `customers`: UUID, phone, name, company, GST, email, city, state, language, stage.
- `chat_messages`: customer/owner/dashboard messages by channel and role.
- `enquiries`: size, grammage, quality, color, lamination, quantity, city, seasonal months, status.
- `quotes`: exact price snapshot, premiums, unit price, total amount, validity, owner approval.
- `price_config`: owner daily base 3.0g price.
- `knowledge_base`: key, value, type, scope, source, timestamps.
- `production_capacity`: date, size, grammage, planned/booked/available kg.
- `activity_log`: audit trail.
- `owner_sessions`: Guru conversation history.

Removed from v1:

- `leads`
- `lead_sources`
- IndiaMART/portal ingestion
- scraping
- campaign automation

## Future Backend Work

Next implementation steps:

1. Add PostgreSQL connection and migrations.
2. Import Excel customers from `CLIENTS_EXCEL_PATH`.
3. Move runtime JSON to database tables.
4. Implement deterministic pricing API.
5. Implement production-capacity delivery API.
6. Add knowledge-base save/retrieve APIs for Guru.
7. Connect Ravi response flow to customer history and enquiry state.
8. Add owner approval workflow before quote send.
9. Add PI/bill generation from owner-approved terms.

## Troubleshooting

### `Could not find a production build in the '.next-local' directory`

Run:

```bash
npm run build
npm start
```

Do not run `npm start` before a successful build.

### `SyntaxError: Unterminated string in JSON`

Likely causes:

- Interrupted Next build/dev server while it was patching lock/build files.
- Corrupted `.next-local` build output.
- Corrupted `package-lock.json`.

Fix:

```bash
npm install
npm run build
```

If it still happens, delete `.next-local` and rebuild.

### Chakra send fails

Check:

- `CHAKRA_API_KEY`
- `CHAKRA_PLUGIN_ID`
- `CHAKRA_PHONE_ID`
- `CHAKRA_WABA_ID`
- `CHAKRA_API_VERSION`
- ChakraHQ plugin is active and the endpoint format matches the provider account.

### Sarvam chat fails

Check:

- `SARVAM_API_KEY`
- `SARVAM_MODEL`
- Internet access from the server.
- Sarvam account quota and model availability.

### Ravi receives but does not reply

Check runtime controls:

- Agent must be on.
- Ravi standby must be on.
- Auto reply must be on for direct WhatsApp sends.

With Auto reply off, Ravi drafts/logs only.
