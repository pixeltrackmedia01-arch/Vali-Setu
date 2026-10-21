# Vali Setu · વાલી સેતુ

**Every School Message. Every Parent. Every Language.**

Vali Setu is a working prototype of a school-to-parent communication platform for Gujarati, Hindi and English-speaking families. A teacher writes a notice once; the system simplifies it, translates it, checks that dates, times, amounts and required documents survived translation, prepares audio, and sends it only after a second person approves it. Parents read or listen in their own language and press “I understand” or ask a question. Schools, cluster/block officers and the district see delivery and acknowledgment figures with their methodology.

> **Prototype.** The deployment context is “Collector Office, Devbhumi Dwarka (prototype context)”. This is not an official or endorsed government service. All schools, people and phone numbers in the seed data are fictional. In demo mode no SMS, WhatsApp message or phone call is ever sent.

---

## 1. Project overview

| | |
|---|---|
| Problem | Circulars are written in formal English or Gujarati and reach parents late, in the wrong language, or not at all. Mistranslated dates and missing instructions cause missed meetings and deadlines. |
| Approach | One guided workflow per notice: create → simplify → translate → validate critical details → audio → approve and dispatch. Validation is deterministic and blocks approval when a critical detail is wrong. |
| Users | Teacher, head teacher, school administrator, CRC/BRC officer, district official, parent or guardian. |
| Languages | Gujarati (`gu`), Hindi (`hi`), English (`en`) for both interface and notices. |

## 2. Main features

- **Notice workspace** (`/notices/[id]`) with a six-step progress indicator; every step can be revisited without losing work.
  - Create: title, category, classes, whole class or selected families, languages, channels, priority, schedule, original text, optional image/PDF upload (type sniffed from file bytes, size-limited, stored outside `public/`).
  - Simplify: AI or rule-based plain-language rewrite, editable, clearly labelled as simulated when no AI service is configured.
  - Translate: per-language tabs, side-by-side compare, edit, reset to generated version, reject with reason. Every revision is kept.
  - Validate: dates, times, amounts, percentages, phone numbers, classes, student identifiers, required documents, actions, locations and events are extracted from each version (Gujarati and Devanagari digits and month names included) and compared with the original. Mismatches and omissions are critical and block approval until fixed, or overridden by an approver with a written reason (audited).
  - Audio: per-language audio, a player, and an honest “simulated” label when no speech service exists. Audio goes stale when the text changes.
  - Review and send: readiness checklist, submit, approve, reject with reason, schedule, idempotent dispatch, dispatch summary. A teacher cannot approve a notice they wrote; any edit after submission returns the notice to draft.
- **Notice record** (`/notices/[id]/record`): versions, translation revisions, validation findings, approver, delivery attempts with provider references, parent responses, follow-ups and audit timeline.
- **Basic-phone preview** (`/notices/[id]/basic-phone`): SMS rendering with character and part counts, and a step-by-step simulated IVR call.
- **Parent questions inbox** for teachers and administrators, with replies and follow-up tasks.
- **School dashboard**: metrics, filterable delivery table (class, section, language, channel, category, status, date), follow-up creation, CSV export, families, classes, reports and settings.
- **CRC/BRC and district dashboards**: aggregate metrics and charts (acknowledgment by school, delivery by language and channel, weekly volume, engagement trend, coverage, unresolved questions), a school comparison with a stated follow-up rule, methodology, and CSV export. No names or phone numbers are shown to regional roles.
- **Parent portal** (mobile-first): message list, message in any approved language, large listen button, key details, “I understand”, question form with call-back request, school helpline, and preferences (language, channel, voice, urgent-only, contact correction request).
- Full interface in English, Gujarati and Hindi; language switcher everywhere.

## 3. Technology stack

- Next.js 15 (App Router) and React 19, TypeScript in strict mode
- Tailwind CSS 3, Lucide icons, Noto Sans / Noto Sans Gujarati / Noto Sans Devanagari (self-hosted via `@fontsource`)
- Prisma 6 with SQLite for the demo (schema is portable to PostgreSQL)
- Zod for every request body and form
- Recharts for charts
- Anthropic SDK (optional) for simplification and translation
- eSpeak NG (optional, offline) for demo audio
- Vitest, React Testing Library, Playwright

## 4. Prerequisites

- Node.js 20 or newer (developed on Node 22) and npm
- No database server for the demo (SQLite file)
- Optional: `espeak-ng` and `ffmpeg` to regenerate demo audio or use `SPEECH_PROVIDER=espeak`
- Optional: Chromium for end-to-end tests (`npx playwright install chromium` if not already present)

## 5. Installation

```bash
git clone https://github.com/pixeltrackmedia01-arch/Vali-Setu.git
cd Vali-Setu
npm install
cp .env.example .env
```

## 6. Environment variables

All configuration lives in `.env` (see `.env.example`, which contains placeholders only). Variables are validated at start-up by `lib/env.ts`; provider keys are read only on the server.

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | SQLite file (relative to `prisma/`) or a PostgreSQL URL |
| `APP_MODE` | `demo` | `demo` uses simulated providers; `live` allows real adapters |
| `SESSION_TTL_HOURS` | `8` | Session lifetime |
| `ENABLE_DEMO_ROLE_SWITCHER` | `true` | Quick role switcher on the login page; off when `NODE_ENV=production` unless `PUBLIC_DEMO=true` |
| `PUBLIC_DEMO` | `false` | Hosted public demo only: shows the demo password and switcher in a production build (needs `APP_MODE=demo`) |
| `SEED_DEMO_PASSWORD` | `ValiSetu@2026` | Password for every seeded demo account |
| `AI_PROVIDER` | `demo` | `demo` or `anthropic` |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `AI_TIMEOUT_MS` | | Anthropic configuration |
| `TRANSLATION_PROVIDER` | `demo` | `demo` or `ai` (uses the AI provider) |
| `SPEECH_PROVIDER`, `ESPEAK_BINARY` | `demo` | `demo` or `espeak` |
| `OCR_PROVIDER` | `none` | No OCR adapter ships with the prototype |
| `MESSAGING_PROVIDER` | `demo` | `demo`, `whatsapp`, `sms` or `voice` |
| `LIVE_DISPATCH_ENABLED` | `false` | Second switch required before any real send |
| `WHATSAPP_*`, `SMS_*`, `VOICE_*` | | Gateway credentials (see sections 18–19) |
| `WEBHOOK_SECRET` | | HMAC secret for delivery-status callbacks |
| `UPLOAD_MAX_BYTES`, `STORAGE_DIR`, `DATA_RETENTION_DAYS` | 5 MB, `storage`, 365 | Files and retention. The bundled `storage/demo-audio/` recordings are always read from the app itself |

## 7. Database setup

The demo uses SQLite; nothing to install. The database file is created at `prisma/dev.db` and is git-ignored.

For PostgreSQL there is a generated copy of the schema with the `postgresql` provider in `prisma/postgres/` (regenerate it with `node scripts/postgres-schema.mjs` after changing `prisma/schema.prisma`, and add a migration there with `prisma migrate diff`). Status fields are strings validated in code, so no enum changes are needed.

With `DATABASE_URL` pointing at PostgreSQL (for example `postgresql://user:password@host:5432/db?schema=valisetu`), `npm run build:postgres` generates the client, applies the PostgreSQL migrations, seeds the demo data only if the database has no users, and builds the app. This is the build used for the hosted demo.

## 8. Database migrations

```bash
npm run db:migrate   # development: create/apply migrations
npm run db:deploy    # CI/production: apply committed migrations only
```

Migrations live in `prisma/migrations/`.

## 9. Seed data

```bash
npm run db:seed
```

The seed resets every table and creates, all fictional:

- 8 demo schools in four blocks of Devbhumi Dwarka (main school: *Setu Demo Primary School, Navagam*, code `DEMO-KH-001`)
- about 240 families with Gujarati, Hindi and English preferences, mixed channels and consent states, and `+91 90000 xxxxx` placeholder numbers
- 28 notices created through the real service layer, including these scenarios:
  - **A** Parent-teacher meeting dispatched to class 5 in three languages, with read, audio and acknowledgment events
  - **B** “PTM reminder for 5-B”: the Gujarati version says 26 October instead of 25. It is pending approval and **cannot be approved** until fixed
  - **C** “PTM reminder for 5-A”: the Hindi version omits the report-card instruction and is flagged *Missing*
  - **D** Basic-phone SMS and IVR preview for the PTM notice
  - **E** A Hindi-speaking parent’s open question with a call-back request
  - **F** Regional figures across all eight schools for the CRC/BRC and district dashboards

## 10. Starting the development server

```bash
npm run db:deploy && npm run db:seed   # first run only
npm run dev
```

Open http://localhost:3000. Every page shows a “Demo mode” banner while `APP_MODE=demo`.

## 11. Demo login accounts

All accounts use the password in `SEED_DEMO_PASSWORD` (default `ValiSetu@2026`). On the login page in demo mode you can also click an account to fill it in.

| Role | Email | Notes |
|---|---|---|
| Teacher | `teacher@valisetu.example` | Classes 5-A and 5-B; cannot approve |
| Teacher (approver) | `teacher2@valisetu.example` | Classes 6-A and 9-A; may approve others’ notices |
| Head teacher | `headteacher@valisetu.example` | Approves; sees the whole school |
| School administrator | `admin@valisetu.example` | Families, settings, exports; cannot approve |
| CRC officer | `crc@valisetu.example` | Cluster Khambhalia-1 |
| BRC officer | `brc@valisetu.example` | Block Khambhalia |
| District official | `district@valisetu.example` | All demo schools |
| Parent (Gujarati) | `parent@valisetu.example` | Meena Parmar, child in 5-A |
| Parent (Hindi) | `parent.hi@valisetu.example` | Sunita Yadav, child in 5-A |
| Other head teachers | `head.<school code>@valisetu.example` | e.g. `head.demo-kl-001@valisetu.example` |

These are demo credentials for a local database only. Never reuse them anywhere.

**A five-minute tour:** sign in as the head teacher and open *Pending approval* → “PTM reminder for 5-B” → *Validate* to see the blocked date; then sign in as the Gujarati parent to read, listen to and acknowledge the PTM notice in Gujarati; then sign in as the district official.

## 12. Running tests

```bash
npm run typecheck
npm run lint
npm test            # unit + integration (Vitest); creates and seeds prisma/test.db
npm run test:e2e    # Playwright; starts a dev server on port 3100 with prisma/e2e.db
```

- Unit: validation engine (Scenarios B and C, digit scripts, AM/PM and month changes), workflow eligibility, permissions, CSV safety, React components.
- Integration: notice persistence and versioning, translations, approval and second-person rule, rejection, idempotent dispatch, audio staleness, parent acknowledgment and questions, school isolation, CRC restrictions, district aggregates, audited exports.
- End-to-end: teacher creates and validates a notice and catches a wrong Gujarati date; head teacher approves and dispatches; parent reads in Gujarati and Hindi, acknowledges and asks a question; teacher sees the question; CRC sees aggregates without contact details; role-based redirects.

## 13. Production build

```bash
npm run build
npm start
```

## 14. Demo versus live mode

| | Demo (`APP_MODE=demo`) | Live (`APP_MODE=live`) |
|---|---|---|
| Simplify/translate | Curated sample texts or a rule-based rewrite; labelled “Simulated” | Configured AI provider; labelled with the provider |
| Audio | Pre-generated eSpeak NG recordings for the sample notices; otherwise a labelled simulated player | Configured speech provider |
| Messaging | Deterministic simulated outcomes, about 5% failures; nothing leaves the server; “DEMO MODE · NO REAL MESSAGES SENT” on dispatch | Real gateway, only when `LIVE_DISPATCH_ENABLED=true` **and** the approver ticks the live-send confirmation |
| Data | Fictional seed | Real data: follow the checklist in section 22 first |

When a live provider fails, the action fails with a readable message and saved work is kept; staff can always type text themselves.

## 15. AI provider configuration

Set `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY` and optionally `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`). The adapter (`services/ai/anthropic.ts`) requests structured output validated with Zod, treats notice text as data rather than instructions, and times out after `AI_TIMEOUT_MS`. AI output is always a draft: deterministic validation still runs, and a person must approve. Notice text is sent to the provider, so review the provider’s data-handling terms before enabling it with real notices.

## 16. Translation provider configuration

`TRANSLATION_PROVIDER=demo` returns curated translations only for the sample notices and otherwise says honestly that no translation is available (staff can type one). `TRANSLATION_PROVIDER=ai` uses the AI provider above. To add a dedicated translation API, implement `TranslationProvider` in `services/ai/types.ts` and register it in `services/providers.ts`. Choose a service with verified Gujarati and Hindi quality; machine translation of dates and numbers must always pass validation before approval.

## 17. Gujarati and Hindi speech configuration

- `SPEECH_PROVIDER=demo`: plays the committed sample recordings in `storage/demo-audio/` (made with eSpeak NG, synthetic quality, labelled as such); other texts get a simulated player.
- `SPEECH_PROVIDER=espeak`: generates audio locally with `espeak-ng` (voices `gu`, `hi`, `en`) and `ffmpeg`. Free and offline, but robotic; suitable for testing, not for parents.
- For production, implement `SpeechProvider` (`services/speech/types.ts`) for a service with natural Gujarati and Hindi neural voices, and have a native speaker review samples. `npm run audio:demo` regenerates the demo recordings.

Audio is never public: it is served through `/api/audio/[id]` only to staff of that school or to parents who received the notice.

## 18. WhatsApp integration requirements

- A WhatsApp Business Platform account and phone number ID (`WHATSAPP_API_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`).
- Pre-approved message templates for each notice type and language; free-form text is only allowed inside the customer-service window.
- Recorded opt-in for each parent (the `consentStatus` field; families without consent are skipped and listed for follow-up).
- Delivery and read callbacks configured to `POST /api/webhooks/delivery`, signed with `WEBHOOK_SECRET` (`x-vs-signature: sha256=<hex HMAC of body>`).
- The adapter skeleton is `services/messaging/http.ts`. **It has not been tested against any live provider.**

## 19. SMS and voice integration requirements

- **SMS:** a DLT-registered principal entity, sender ID and content templates (TRAI rules), set via `SMS_API_URL`, `SMS_API_KEY`, `SMS_SENDER_ID`, `SMS_DLT_ENTITY_ID`. Gujarati and Hindi need Unicode SMS (70 characters per part, 67 when split); the basic-phone preview shows the part count.
- **Voice/IVR:** a provider that can play stored audio, capture keypad input (1 = repeat, 2 = understood, 3 = call back) and post call outcomes to the webhook (`VOICE_API_URL`, `VOICE_API_KEY`). Respect calling-hour and caller-ID rules.
- Both use the same adapter skeleton and webhook as WhatsApp, and are **untested against live gateways**.

## 20. Security considerations

- Server-side authorisation on every page and API route (`lib/permissions`); record-level scoping by school, cluster, block and district. Records outside a user’s scope return 404, not 403.
- Teachers only address their assigned classes; a teacher cannot approve their own notice; overrides need approval rights and a reason.
- Sessions are random tokens stored as SHA-256 hashes, in `httpOnly`, `SameSite=Lax` cookies (`Secure` in production) with expiry.
- Passwords hashed with bcrypt; login is rate-limited and uses a constant-time path for unknown accounts.
- CSRF protection: every mutating API call needs the `x-vs-csrf` header and a same-origin `Origin`.
- Zod validation of all input; uploads checked by magic bytes and size and stored outside the web root.
- Security headers (CSP, frame denial, `nosniff`, referrer policy) in `next.config.ts`.
- Audit log for approvals, rejections, overrides, edits after submission, dispatches, exports and contact corrections. Logs never contain full message text or phone numbers.
- Phone numbers are masked in tables; regional roles see aggregates only; contact export is limited to school leadership and is audited. CSV cells are protected against formula injection.
- API keys are read only on the server (`lib/env.ts`) and never sent to the browser.

## 21. Known limitations

- Demo translations exist only for the four sample notices; other notices need typed translations or a configured provider.
- Validation finds the details it is designed to find. “Matched” means the same value was found, not that the sentence means the same; native-speaker review remains necessary. Explanations under findings are in English.
- No OCR: text is not extracted from uploaded circulars.
- Scheduled notices record their send time, but there is no background scheduler; an authorised user must press *Dispatch* (or a cron job must call the dispatch service).
- Messaging, WhatsApp, SMS and voice adapters are skeletons that have not been tested with real providers.
- Demo audio is synthetic (eSpeak NG) and exists only for the sample texts.
- Analytics are computed on request, which is fine for demo volumes but would need pre-aggregation at district scale.
- SQLite is for the demo only.

## 22. Production deployment checklist

- [ ] Move to PostgreSQL; run `npm run db:deploy`; set up backups and point-in-time recovery.
- [ ] Do **not** run the seed; import real rosters through an approved process with consent records.
- [ ] Set `NODE_ENV=production`, `APP_MODE=live`, a long random `WEBHOOK_SECRET`, and remove `SEED_DEMO_PASSWORD`; confirm the demo role switcher is hidden.
- [ ] Replace demo accounts with institutional authentication (SSO) and least-privilege roles; review who has approval and export rights.
- [ ] Store secrets in a secrets manager, not in files.
- [ ] Use private object storage for uploads and audio; enforce retention (`DATA_RETENTION_DAYS`) with a scheduled job.
- [ ] Configure and test each provider in a staging environment; only then set `LIVE_DISPATCH_ENABLED=true`.
- [ ] Register WhatsApp templates and DLT SMS templates; verify opt-in for every recipient.
- [ ] Add a scheduler for scheduled dispatch and retries, and a distributed rate limiter if running more than one instance.
- [ ] Terminate TLS, set HSTS, and keep security headers enabled.
- [ ] Monitoring and alerting for failed dispatches, webhook errors and provider latency, without logging message content.
- [ ] Accessibility audit (WCAG 2.1 AA) with Gujarati and Hindi screen-reader users; native-speaker review of interface text and voices.
- [ ] Data-protection review under India’s DPDP Act, including a privacy notice for parents in all three languages.
- [ ] Obtain any required institutional approval before presenting the service as official.
