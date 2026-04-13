# Lumino AI — Business & Product Overview

> Last updated: 2026-04-10

## Company

**Name:** Lumino AI
**Domain:** luminoai.co.il
**Positioning:** AI Customer Platform for small-to-medium businesses in Israel
**Co-founders:**
- Arkadiy Smirnov — Tech (development, infrastructure, AI)
- Arina Shapiro — Marketing (sales, client relations, content)

**Legal entity:** Esek Prati (עוסק מורשה), Arina Khruplova (ארינה חרופלוב), ע.מ 342715349
**Phone:** 0512309102
**Email:** hruarina@gmail.com
**Bank:** Hapoalim (12) / Branch 673 / Account 469840
**Invoicing:** via GreenInvoice

## What We Sell

An AI-powered AI Manager that handles customer inquiries on WhatsApp (and soon Instagram) for businesses. The AI Manager is trained on each client's specific business data — services, pricing, hours, FAQ, policies — and responds in Hebrew, Russian, or English automatically.

Clients get a dashboard to monitor conversations, handle escalations, manage bookings, configure the AI Manager, and view analytics.

## Target Market

- Small businesses in Israel: salons, clinics, pet shops, restaurants, repair services
- Businesses that get many repetitive WhatsApp inquiries
- Russian and Hebrew-speaking business owners (our competitive advantage in localization)
- All Israel

## Pricing Plans

| Feature | Standard (300₪/mo) | PRO (500₪/mo) | PRO+ (650₪/mo) |
|---|---|---|---|
| WhatsApp AI Manager | Yes | Yes | Yes |
| Dedicated WhatsApp Number | US number | Israeli number | Israeli number |
| Business Knowledge Base | Yes | Yes | Yes |
| AI Manager Settings (hours, tone, language) | Yes | Yes | Yes |
| Multi-language (HE/RU/EN) | Yes | Yes | Yes |
| Dashboard Access | No (upgrade prompt) | Yes | Yes |
| Conversations View | No | Yes | Yes |
| Analytics | No | Yes | Yes |
| Escalations Inbox | No | Yes | Yes |
| Booking System | No | Yes | Yes |
| Promotions (coming soon) | No | Yes | Yes |
| Conversation Summaries (after every conversation) | No | No | Yes |
| Sentiment analysis | No | No | Yes |
| Custom AI personality tuning | No | No | Yes |
| Priority support | No | No | Yes |
| Dedicated account manager | No | No | Yes |
| Promotional campaigns (coming soon) | No | No | Yes |

**No setup fees. No minimum commitment. Cancel anytime.**
Number management included in price (US: 50₪, Israeli: 100₪).

### Payment & Billing
- Automatic monthly subscription via **GreenInvoice**
- Kabala (receipt) sent automatically each billing cycle
- Upgrade or downgrade between plans at any time

## What's Built & Working

### Product
- **WhatsApp AI Manager** — Claude Haiku, multi-language auto-detect (he/ru/en), uses client's business data as system prompt
- **Client Dashboard** — full i18n (en/he/ru with RTL), conversations, escalations, analytics, settings, summaries, bookings
- **Admin Panel** — client CRUD, usage monitoring, WhatsApp number registration, plan management
- **Marketing Landing Page** — luminoai.co.il, dark theme, pricing, features, contact form, WhatsApp bot demo
- **Email System** — welcome emails (plan-specific), password reset, escalation alerts, contact form, booking notifications

### Booking System (NEW — PRO/PRO+)
- **Bot-integrated booking** — AI collects customer name, email, service, preferred time and creates appointment
- **Available slots** — generated from business hours minus existing bookings, with timezone-aware filtering (past slots excluded)
- **Dashboard calendar** — month view with event chips (time + customer name), click date to see details
- **Dashboard list view** — all appointments with status filters (pending/confirmed/declined/cancelled)
- **Add/Edit/Delete events** — manual event management from dashboard calendar
- **Pending requests banner** — yellow banner at top of bookings page showing all pending bookings with Accept/Decline
- **Owner notifications** — email with Accept/Decline magic links + WhatsApp message to manager phone (with customer phone, email, service, date/time)
- **Customer notifications** — WhatsApp confirmation/decline sent to customer when owner takes action
- **Booking settings** — slot duration, max concurrent, buffer minutes, lead time, horizon days, timezone
- **i18n** — all booking features translated in en/he/ru
- **Timezone handling** — bot datetimes interpreted in client's timezone (not server UTC)
- **Past-date validation** — booking service rejects appointments in the past
- **Today's date in prompt** — AI system prompt includes current date to prevent wrong-year bookings

### Infrastructure
- **3 Railway services:** NestJS backend, Next.js dashboard, Vite landing page
- **Region:** eu-west (Amsterdam) — migrated from asia-southeast1 for Israel latency
- **Database:** PostgreSQL on Railway (9 tables including appointments)
- **Cache:** Redis on Railway
- **Email:** SendGrid (domain verified, trial until June 2026)
- **DNS:** Wix (luminoai.co.il)
- **AI:** Anthropic Claude Haiku via API
- **WhatsApp:** Meta Cloud API (app published, live mode)
- **Phone numbers:** Twilio

### Key Technical Features
- Auto DB migrations on startup (Drizzle)
- Phone-to-client mapping via DB with Redis cache (no manual setup)
- Rate limiting, injection detection, blocklist security
- Usage tracking per client (messages, tokens, estimated cost)
- Conversation summarization (cron every 5min, 2h inactivity trigger)
- "Register WA Number" button in admin panel (register + webhook in one click)
- Loading skeletons for all dashboard routes
- Mobile-responsive dashboard (bottom tab bar, stacked layouts)

## Accounts & Services

### Meta / WhatsApp Business API
- **App:** "Lumino AI Chatbot" (ID: 1684642939651184) — Published, live mode
- **Business ID:** 1018928057262380
- **System User:** "Lumino Bot" (ID: 61575479224165) — permanent token, no expiry, all WABAs assigned
- **Webhook:** lumino-production-9339.up.railway.app/webhooks/whatsapp
- **Payment:** MasterCard ••3472 on Arina LTD WABA

### Active Phone Numbers
| Number | Phone Number ID | WABA ID | Client | Status |
|---|---|---|---|---|
| +1 681-292-9057 | 1061294510402958 | 2418608881975422 | Arina Lld / Bella Paws | Registered |
| +972 53-964-8577 | 1063067453557524 | 1434327685132922 | Lumino AI showcase | Registered |

### Twilio
- Account: Upgraded (not trial), username Arkadiy
- Numbers above are Twilio numbers ($1.15/mo each)
- TwiML Bin "Record Verification Call" for Meta voice verification

### Railway (project: just-expression, eu-west)
- **lumino** (backend): deploys from Smirmos/lumino
- **lumino-dashboard**: deploys from Smirmos/lumino-dashboard
- **lumino-glow-agency** (landing): deploys from Smirmos/lumino-glow-agency
- Auto-deploy on push to main
- Hobby plan ($5/mo)

### Other Services
- **SendGrid:** domain luminoai.co.il verified, trial (expires June 2, 2026), 100/day limit
- **Anthropic:** Claude Haiku API for AI Manager responses
- **GitHub:** repos under Smirmos org (push requires `gh auth switch --user Smirmos`)

## Client Accounts

| Email | Business | Plan | WA Connected | Client ID |
|---|---|---|---|---|
| admin@lumino.ai | Lumino AI (admin) | PRO+ | No | efe0de34-... |
| hello@luminoai.co.il | Lumino AI (showcase) | PRO+ | Yes (+972 53) | showcase |
| hruarina@yandex.ru | Arina Lld / Bella Paws | PRO+ | Yes (+1 681) | c2da7165-... |

## Client Onboarding Process

1. Buy a Twilio number + set TwiML Bin "Record Verification Call" as voice handler
2. Add number to Meta App → API Setup → Add phone number
3. Verify via voice call (not SMS — doesn't work with Twilio)
4. Admin Panel → "Register WA Number" → paste Phone Number ID (+ WABA ID if auto-detect fails)
5. Admin Panel → "+ New Client" → fill business details + Phone Number ID
6. Client receives welcome email with login credentials
7. AI Manager starts responding to WhatsApp messages automatically

## Booking Flow

1. Customer asks bot to book → bot collects name, email, service, time
2. Bot outputs `[BOOK:Name|email|Service|YYYY-MM-DDTHH:MM]` tag
3. Backend creates pending appointment (timezone-aware, past-date validated)
4. Owner gets email notification with Accept/Decline magic links
5. Owner gets WhatsApp notification with booking details (if 24h window open)
6. Pending request appears in dashboard with Accept/Decline buttons
7. Owner accepts/declines from dashboard or email link
8. Customer gets WhatsApp confirmation/decline message from the bot

## What's Next (Priority Order)

### Immediate
1. **Meta Business Verification** — needed for WhatsApp message templates (owner notifications outside 24h window)
2. **Meta display name approval** — numbers show phone number instead of business name
3. **Create WhatsApp message templates** — for reliable owner notifications without 24h window requirement

### Short-term
4. **Promotions feature** — billing model, spending controls, enable for PRO/PRO+
5. **Instagram DM support** — backend code exists, needs Meta Instagram API setup
6. **Weekly digest email** (PRO+ feature)
7. **Monthly email report** for Standard plan clients

### Medium-term
8. **Mobile app** (React Native) — deferred until client base grows
9. **Client self-service phone number** — let clients bring their own WhatsApp number
10. **AI improvements** — better conversation context, sentiment analysis, auto-tagging
11. **Multi-location support** — one client managing multiple business locations

## Known Issues & Limitations

- **Meta Business Verification** not complete — templates get auto-rejected, can't send proactive WhatsApp outside 24h window
- **Meta display name approval** can take days — number works but shows as phone number, not business name
- **Promotions blocked** — no approved templates yet
- **Owner WhatsApp notifications** — only work if owner messaged bot within 24h (needs template for 24/7)
- **SendGrid trial** — expires June 2, 2026; 100 emails/day limit; emails may go to spam
- **WABA auto-detection** in Register WA Number sometimes fails — admin can provide WABA ID manually
- **Internal networking** on Railway doesn't work between services — using public URLs as workaround
- **One META_ACCESS_TOKEN** for all clients — works because System User has all WABAs assigned

## QA Status

- 100/100 automated tests passed (landing, dashboard, backend, integration, security)
- **Bella Paws E2E test** (2026-04-06): 10/10 test messages passed
- **Booking E2E test** (2026-04-10): full flow verified — bot booking → calendar display → accept → customer WhatsApp confirmation
