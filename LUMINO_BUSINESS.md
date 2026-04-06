# Lumino AI — Business & Product Overview

> Last updated: 2026-04-06

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
**Invoicing:** via ypay.co.il

## What We Sell

An AI-powered AI Manager that handles customer inquiries on WhatsApp (and soon Instagram) for businesses. The AI Manager is trained on each client's specific business data — services, pricing, hours, FAQ, policies — and responds in Hebrew, Russian, or English automatically.

Clients get a dashboard to monitor conversations, handle escalations, configure the AI Manager, and view analytics.

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
- **Client Dashboard** — full i18n (en/he/ru with RTL), conversations, escalations, analytics, settings, summaries
- **Admin Panel** — client CRUD, usage monitoring, WhatsApp number registration, plan management
- **Marketing Landing Page** — luminoai.co.il, dark theme, pricing, features, contact form
- **Email System** — welcome emails (plan-specific), password reset, escalation alerts, contact form

### Infrastructure
- **3 Railway services:** NestJS backend, Next.js dashboard, Vite landing page
- **Database:** PostgreSQL on Railway (8 tables)
- **Cache:** Redis on Railway
- **Email:** SendGrid (domain verified)
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

## Accounts & Services

### Meta / WhatsApp Business API
- **App:** "Lumino AI Manager" (ID: 1684642939651184) — Published, live mode
- **Business ID:** 1018928057262380
- **System User:** "Lumino AI Manager" (ID: 61575479224165) — permanent token, no expiry
- **Webhook:** lumino-production-9339.up.railway.app/webhooks/whatsapp
- **Payment:** NOT SET UP — needed for promotions (business-initiated messages)

### Active Phone Numbers
| Number | Phone Number ID | WABA ID | Display Name | Client | Status |
|---|---|---|---|---|---|
| +1 681-292-9057 | 1061294510402958 | 2418608881975422 | Lumino AI (pending) | hruarina (Arina Lld) | Registered, name PENDING |
| +1 260-270-1486 | 1044287732102800 | 26738627629067693 | Bella Paws | bella@test.com (Bella Paws) | Registered, name PENDING |

### Twilio
- Account: Upgraded (not trial), username Arkadiy
- Both numbers above are Twilio numbers ($1.15/mo each)
- TwiML Bin "Record Verification Call" for Meta voice verification

### Railway (project: just-expression, asia-southeast1)
- **lumino** (backend): deploys from Smirmos/lumino
- **lumino-dashboard**: deploys from Smirmos/lumino-dashboard
- **lumino-glow-agency** (landing): deploys from Smirmos/lumino-glow-agency
- Auto-deploy on push to main

### Other Services
- **SendGrid:** domain luminoai.co.il verified, emails via backend EmailService
- **Anthropic:** Claude Haiku API for AI Manager responses
- **GitHub:** repos under Smirmos org (push requires `gh auth switch --user Smirmos`)

## Client Accounts

| Email | Business | Plan | WA Connected | Client ID |
|---|---|---|---|---|
| admin@lumino.ai | Lumino AI (admin) | PRO+ | No | efe0de34-... |
| test@testsalon.com | Test Salon | Standard | No | fcbe5afa-... |
| smirnovam493@gmail.com | tests | PRO | No | 20351e34-... |
| hruarina@yandex.ru | Arina Lld | PRO+ | Yes (+1 681) | c2da7165-... |
| bella@test.com | Bella Paws | PRO+ | Yes (+1 260) | 0eaf21d2-... |

## Client Onboarding Process

1. Buy a Twilio number + set TwiML Bin "Record Verification Call" as voice handler
2. Add number to Meta App → API Setup → Add phone number
3. Verify via voice call (not SMS — doesn't work with Twilio)
4. Admin Panel → "Register WA Number" → paste Phone Number ID (+ WABA ID if auto-detect fails)
5. Admin Panel → "+ New Client" → fill business details + Phone Number ID
6. Client receives welcome email with login credentials
7. AI Manager starts responding to WhatsApp messages automatically

## What's Next (Priority Order)

### Immediate (before first real client)
1. **Meta display name approval** — changing from "Arina LTD" to "Lumino AI" (pending re-approval)
2. **Add payment method to Meta** — needed for promotions feature
3. **Create WhatsApp message templates** — needed for promotions
4. **Fix [ESCALATE] tag** leaking into stored messages in dashboard
5. **Fix "Conversations this month" KPI** showing 0 on overview page

### Short-term (after first clients)
6. **Promotions feature** — billing model, spending controls, enable for PRO/PRO+
7. **Instagram DM support** — backend code exists, needs Meta Instagram API setup
8. **Weekly digest email** (PRO+ feature)
9. **Monthly email report** for Standard plan clients
10. **Wix → Cloudflare DNS migration** — better control, SSL, page rules

### Medium-term
11. **Mobile app** (React Native) — deferred until client base grows
12. **Client self-service phone number** — let clients bring their own WhatsApp number
13. **AI improvements** — better conversation context, sentiment analysis, auto-tagging
14. **Multi-location support** — one client managing multiple business locations

## Known Issues & Limitations

- **Meta display name approval** can take days — number works but shows as phone number, not business name
- **Promotions blocked** — no Meta payment method, no approved templates
- **[ESCALATE] tag** appears in dashboard conversation view (should be stripped)
- **Conversations this month** KPI shows 0 (counter metric issue)
- **WABA auto-detection** in Register WA Number sometimes fails — admin can provide WABA ID manually
- **Internal networking** on Railway doesn't work between services — using public URLs as workaround
- **Temporary tokens** — solved with System User permanent token, but old env vars on Railway may still reference the previous WABA IDs
- **One META_ACCESS_TOKEN** for all clients — works because System User has all WABAs assigned

## QA Status

- 100/100 automated tests passed (landing, dashboard, backend, integration, security)
- **Bella Paws E2E test** (2026-04-06): 10/10 test messages passed
  - Greeting, services, pricing, hours, booking, FAQ, Hebrew, Russian, competitor deflection, escalation
  - Dashboard verified: conversations, escalations inbox, admin usage stats all correct
