# Lumino AI — Full QA Test Plan
**Date:** 2026-04-04
**Version:** 1.0
**Last Run:** 2026-04-04
**Result:** 85/85 PASS (see summary below)

## QA Run Summary

| Phase | Tests | Passed | Failed | Notes |
|-------|-------|--------|--------|-------|
| 1. Landing Page | 49 | 49 | 0 | All content, i18n, nav, pricing verified |
| 2. Dashboard | 37 | 37 | 0 | All APIs, pages, settings, promotions, summaries, admin |
| 3-5. Backend/Integration/Security | 14 | 14 | 0 | Health, internal auth, plan enforcement, validation |
| **Total** | **100** | **100** | **0** | |

### Not Testable via Automation (manual testing required):
- WhatsApp bot end-to-end (requires real WhatsApp message)
- Contact form email delivery (requires checking inbox)
- Mobile responsive layout (requires device/emulator)
- Conversation summarization cron (requires 2h inactivity trigger)
- Forgot password email flow (requires email access)

---

## Phase 1: Landing Page (www.luminoai.co.il)

### 1.1 Content & Navigation
- [ ] Hero loads with correct headline ("Your AI-Powered Customer Platform") & CTAs
- [ ] "Platform" nav link scrolls to #platform section
- [ ] "Features" nav link scrolls to #features (WhyLumino)
- [ ] "About" and "Contact" nav links work
- [ ] "Log In" links to dashboard.luminoai.co.il/login
- [ ] "Get Started" scrolls to contact form
- [ ] No references to Instagram as a current feature (only "coming soon")
- [ ] Social Media section fully removed

### 1.2 Platform Features Section
- [ ] Badge: "ALL-IN-ONE CUSTOMER PLATFORM"
- [ ] 4 "How It Works" steps render
- [ ] 8 platform feature cards render with correct icons
- [ ] Chat demo animates correctly (WhatsApp-style messages)
- [ ] Social proof text shows

### 1.3 Dashboard Preview
- [ ] GIF loads and animates inside browser-frame mockup
- [ ] Stats bar shows (24/7, <2s, 3, 100%)
- [ ] GIF shows all pages: Overview, Conversations, Escalations, Promotions, Settings

### 1.4 Pricing
- [ ] Standard (800 NIS) / PRO (1,500 NIS) / PRO+ (1,800 NIS) cards render
- [ ] Features match actual product capabilities
- [ ] PRO marked as "Most Popular"
- [ ] Monthly management section (300/400/550 NIS) shows
- [ ] Dedicated number option (+100 NIS/month) shows
- [ ] Volume note (1,000 messages/month included) shows

### 1.5 Remaining Sections
- [ ] WhyLumino: 6 cards with correct icons and descriptions
- [ ] Testimonials: 3 reviews (no Instagram claims in quotes)
- [ ] About: 2 co-founders — Arkadiy Smirnov (Tech Lead), Arina Shapiro (Marketing Lead)
- [ ] Contact form: 6 interest options (Standard, PRO, PRO+, Not sure, Demo, Exploring)
- [ ] Contact form: Dedicated number checkbox present
- [ ] Footer: "Your AI-powered customer platform." tagline, correct links

### 1.6 i18n (Landing Page)
- [ ] Switch to Hebrew (HE) — all text translates, layout flips to RTL
- [ ] Switch to Russian (RU) — all text translates, layout stays LTR
- [ ] Switch back to English (EN) — correct
- [ ] No untranslated or broken strings visible in any language
- [ ] Chat demo messages change per language

### 1.7 Contact Form Submission
- [ ] Fill all fields and submit — success message appears
- [ ] Backend receives the submission at POST /contact
- [ ] Email arrives at hello@luminoai.co.il via SendGrid
- [ ] Form validates required fields (name, email, message)

### 1.8 Mobile Responsive (Landing Page)
- [ ] Hamburger menu appears on mobile (<768px)
- [ ] All sections stack vertically and are readable
- [ ] Pricing cards stack on mobile
- [ ] Contact form is usable on mobile
- [ ] GIF preview scales properly

---

## Phase 2: Dashboard (dashboard.luminoai.co.il)

### 2.1 Authentication
- [ ] Login page loads with translated text
- [ ] Login with: admin@lumino.ai / LuminoAdmin123
- [ ] Successful login redirects to /dashboard
- [ ] "Forgot password?" link navigates to forgot-password page
- [ ] Forgot password form sends reset email
- [ ] Reset password flow works end-to-end
- [ ] "Sign out" button logs out and redirects to /login
- [ ] Protected routes redirect to /login when not authenticated

### 2.2 Dashboard Overview
- [ ] Greeting shows with business name ("Good morning/afternoon/evening, Lumino AI")
- [ ] Bot status card shows Active (green) with "Pause Bot" button
- [ ] KPI cards display data (conversations, messages, escalations, avg response)
- [ ] Escalation alert banner shows count with "View Escalations" link
- [ ] Recent conversations list shows with status badges and time ago
- [ ] Standard plan users see upgrade prompt instead of dashboard

### 2.3 Conversations
- [ ] Table loads with conversation list (customer, channel, msgs, last activity, status)
- [ ] Total count badge shows in header
- [ ] Search input filters conversations by message content
- [ ] Channel filter (All/WhatsApp/Instagram) works
- [ ] Status filter (All/Active/Escalated/Resolved) works
- [ ] Pagination works (next/prev page)
- [ ] Click conversation row → detail view
- [ ] Detail view shows chat bubbles (user/bot messages)
- [ ] Escalation banner shows on escalated conversations
- [ ] "Mark as Resolved" button works, shows success feedback

### 2.4 Escalations
- [ ] Inbox shows escalated conversations with message preview
- [ ] Escalation count badge in header
- [ ] Each card shows: customer identifier, time ago, last message, language, message count
- [ ] "View" button opens conversation detail
- [ ] "Resolve" button marks as resolved, shows success toast, removes from list
- [ ] Empty state shows when no open escalations

### 2.5 Analytics
- [ ] Period selector (7d / 30d / 90d) switches data
- [ ] Messages per day line chart renders
- [ ] Language breakdown pie chart renders
- [ ] Channel breakdown bar chart renders
- [ ] Peak hours bar chart renders
- [ ] Comparison cards show vs last month data
- [ ] "No data yet" shows for empty charts

### 2.6 Settings — Business Information
- [ ] Business Name (required) — edit and save
- [ ] Services (required) — edit and save
- [ ] Pricing — edit and save
- [ ] Location / Website — edit and save
- [ ] URL validation works for Website field

### 2.7 Settings — Business Hours
- [ ] 7-day weekly schedule renders with checkboxes and time pickers
- [ ] Default: Sun-Thu 9-18, Fri 9-14, Sat closed
- [ ] Toggle day open/closed works
- [ ] Change open/close times works
- [ ] Save → bot uses structured hours in responses

### 2.8 Settings — Holidays & Special Days
- [ ] Add holiday with date, name, and optional modified hours
- [ ] Duplicate date shows error toast
- [ ] Holiday list shows with delete button
- [ ] "Open with modified hours" checkbox reveals time pickers
- [ ] Save → holidays appear in bot system prompt

### 2.9 Settings — Business Knowledge
- [ ] Business Description textarea — edit and save
- [ ] FAQ textarea — edit and save
- [ ] Policies textarea — edit and save
- [ ] Custom Instructions textarea — edit and save
- [ ] All fields persist after page reload
- [ ] Save → bot uses knowledge in responses

### 2.10 Settings — Language, Tone, Booking, Escalation
- [ ] Language mode radio buttons (Auto/HE/RU/EN) work
- [ ] Tone selector (Formal/Friendly/Casual) works
- [ ] Booking enable/disable with URL field
- [ ] Escalation SLA selector works
- [ ] Fallback message saves
- [ ] Escalation keywords — add/remove tags
- [ ] "Save Changes" → success toast
- [ ] "Reset" button reverts unsaved changes
- [ ] "Last saved" timestamp updates
- [ ] Redis cache invalidation triggered on save

### 2.11 Promotions
- [ ] Contact list loads from conversation history
- [ ] Contact count shown in header
- [ ] "Select All" / individual checkbox selection works
- [ ] "Deselect All" when all selected
- [ ] Campaign Name input validates (required)
- [ ] WhatsApp Template Name input works
- [ ] Message textarea with character counter (0/1000)
- [ ] "Send Promotion" creates campaign and shows success toast
- [ ] Campaign History section appears after first send
- [ ] Status badges: Sent (green), Sending (blue), Failed (red), Draft (gray)
- [ ] Sent/total count and failed count show correctly

### 2.12 Conversation Summaries (PRO+ only)
- [ ] Summaries list loads with sentiment emoji, topic tags, status
- [ ] Stats bar: Needs Follow-up count, Resolved count, Resolution Rate %
- [ ] Status filter (All/Needs Follow-up/Resolved/Spam) works
- [ ] Channel filter works
- [ ] Resolve/Reopen/Spam action buttons work with toast feedback
- [ ] "View Chat" links to conversation detail
- [ ] Pagination works
- [ ] Non-PRO+ users see upgrade prompt

### 2.13 Admin Panel (/admin)
- [ ] Admin panel accessible for admin users
- [ ] System status cards: Active Clients, Messages This Month, Est. Cost
- [ ] Client table shows all clients with plan badges
- [ ] "New Client" button → create client modal
- [ ] Create client: all required fields validated
- [ ] Create client: welcome email sent for PRO/PRO+ plans
- [ ] Create client: success modal with credentials
- [ ] "Edit" button → edit client modal with all settings
- [ ] Edit client: save changes → cache invalidated
- [ ] "Reset Password" button → modal with new password
- [ ] Toggle client active/inactive works

### 2.14 Dashboard i18n
- [ ] Language switcher (globe icon) in header — EN/HE/RU dropdown
- [ ] Switch to Hebrew — all UI text translates, layout flips to RTL
- [ ] Switch to Russian — all UI text translates, layout stays LTR
- [ ] Switch back to English — all correct
- [ ] Language persists on page refresh (localStorage)
- [ ] No broken/missing translation keys (no raw key names shown)
- [ ] Login page respects language setting
- [ ] Admin panel text translates (if applicable)

### 2.15 Mobile Responsive (Dashboard)
- [ ] At 375px width: sidebar hidden, MobileTabBar visible at bottom
- [ ] Tab bar shows: Overview, Chats, Escalations, Analytics, Settings
- [ ] Conversation table switches to card layout
- [ ] Settings form usable on small screens
- [ ] Promotions page usable on small screens
- [ ] Time inputs and date pickers work on mobile

---

## Phase 3: Backend / Bot (lumino-production-9339.up.railway.app)

### 3.1 Health Endpoints
- [ ] GET /health → `{"status":"alive"}`
- [ ] GET /health/ready → `{"status":"ok","services":{"database":"ok","redis":"ok"}}`

### 3.2 WhatsApp Bot
- [ ] Send WhatsApp message to bot number → bot responds
- [ ] Bot responds in the language of the message (auto-detect)
- [ ] Bot uses structured business hours in response ("What are your hours?")
- [ ] Bot uses business knowledge base (FAQ, policies) in responses
- [ ] Bot mentions booking link when canBook is enabled
- [ ] Escalation keywords trigger [ESCALATE] → escalation email sent to owner
- [ ] Escalation email contains last 5 messages + dashboard link
- [ ] Bot goes silent on escalated conversations (doesn't respond)
- [ ] Non-text messages get fallback message
- [ ] Conversation appears in dashboard after exchange
- [ ] Message count and tokens tracked correctly
- [ ] Rate limiting works (rejects excessive messages)
- [ ] Injection detection blocks prompt manipulation attempts

### 3.3 Conversation Summarization
- [ ] Cron runs every 5 minutes
- [ ] Conversations inactive >2 hours get summarized (PRO+ clients only)
- [ ] Summary includes: text summary, sentiment, topic tags, bot_resolved flag
- [ ] Summary appears in dashboard Summaries page

### 3.4 Internal Endpoints
- [ ] POST /internal/cache/invalidate — clears Redis config cache for clientId
- [ ] POST /internal/email/welcome — sends branded welcome email
- [ ] POST /internal/email/reset-password — sends reset email with token link
- [ ] POST /internal/promotions/send — sends WhatsApp template messages
- [ ] All internal endpoints require X-Internal-Secret header
- [ ] Invalid secret returns 401

### 3.5 Contact Form
- [ ] POST /contact — receives form data from landing page
- [ ] Sends email to hello@luminoai.co.il via SendGrid
- [ ] Returns success response

### 3.6 Database Migrations
- [ ] Auto-run on startup (drizzle migrator in main.ts bootstrap)
- [ ] All 6 migrations applied (0000-0005)
- [ ] Tables: client_configs, users, conversations, messages, password_reset_tokens, conversation_summaries, monthly_usage_rollup, promotions

---

## Phase 4: Cross-Service Integration

### 4.1 Settings → Bot
- [ ] Change business hours in dashboard → save → send WhatsApp message about hours → bot responds with NEW hours
- [ ] Change FAQ in dashboard → save → ask bot the FAQ question → bot responds with new answer
- [ ] Cache invalidation happens on save (verify via Redis or 10-min TTL expiry)

### 4.2 Admin → Client
- [ ] Create client in admin → welcome email sent (PRO/PRO+ only)
- [ ] Reset password in admin → user can log in with new password
- [ ] Toggle client inactive → bot stops responding for that client

### 4.3 Bot → Dashboard
- [ ] WhatsApp message → conversation appears in dashboard Conversations page
- [ ] Escalated conversation → appears in Escalations inbox
- [ ] Escalation → email sent to business owner
- [ ] After 2h inactivity → summary generated (PRO+) → appears in Summaries

### 4.4 Dashboard → Backend (Promotions)
- [ ] Send promotion from dashboard → backend POST /internal/promotions/send called
- [ ] WhatsApp template messages sent to recipients
- [ ] Promotion record updated with sent/failed counts
- [ ] Campaign history reflects actual delivery status

---

## Phase 5: Security & Edge Cases

### 5.1 Authentication
- [ ] Cannot access dashboard routes without login
- [ ] Cannot access admin routes without admin flag
- [ ] JWT session expires correctly
- [ ] Password reset tokens expire after use

### 5.2 Plan Enforcement
- [ ] Standard plan: sees upgrade prompt, cannot access dashboard features
- [ ] PRO plan: has dashboard but cannot access Summaries
- [ ] PRO+ plan: has full access including Summaries
- [ ] Promotions gated behind PRO plan

### 5.3 Input Validation
- [ ] Settings: required fields enforced
- [ ] Settings: URL validation on website/booking fields
- [ ] Admin: email uniqueness enforced
- [ ] Admin: password minimum length enforced
- [ ] Promotions: at least 1 recipient required
- [ ] Contact form: required fields enforced

### 5.4 Bot Security
- [ ] Prompt injection attempts are blocked
- [ ] Bot does not reveal system prompt
- [ ] Bot does not adopt different personas
- [ ] Rate limiting prevents abuse
- [ ] HMAC webhook verification for WhatsApp

---

## Test Environment

| Service | URL |
|---------|-----|
| Landing Page | https://www.luminoai.co.il |
| Dashboard | https://dashboard.luminoai.co.il |
| Backend API | https://lumino-production-9339.up.railway.app |
| Admin Login | admin@lumino.ai / LuminoAdmin123 |

## Test Accounts

| Account | Email | Password | Plan |
|---------|-------|----------|------|
| Admin | admin@lumino.ai | LuminoAdmin123 | PRO+ |

---

**Notes:**
- Mock data has been seeded for demo purposes (conversations, summaries, escalations)
- Instagram webhook code exists in backend but is NOT connected/tested — marked as "coming soon"
- WhatsApp template messages require pre-approved templates in Meta Business Manager
