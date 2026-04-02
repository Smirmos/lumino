# Escalation Handling & Human Handoff

**Date:** 2026-04-02
**Status:** Approved
**Scope:** When a conversation escalates, the bot sends a handoff message, stops responding, and emails the business owner with context. Bot stays silent until a new conversation starts.

## Context

Currently, when a conversation is escalated (by keyword or Claude's `[ESCALATE]` marker), the bot continues responding normally. The escalation is only a database flag visible in the dashboard. There is no notification to the business owner and no behavioral change in the bot.

## Design Decisions

| Question | Decision |
|----------|----------|
| Bot behavior on escalation | Send handoff message, then go silent |
| Handoff message | "I'm connecting you with a team member who can help you further." |
| Owner notification channel | Email only (via Resend) |
| Owner email source | Dashboard login email from `users` table |
| Email content | Customer ID, channel, trigger reason, last 3-5 messages, dashboard link |
| Bot resume behavior | Stays silent until new conversation (2h inactivity gap) |

## 1. Bot Behavior on Escalation

In `chatbot.service.ts`, after escalation is detected:

1. Replace Claude's response with the handoff message: "I'm connecting you with a team member who can help you further."
2. Mark conversation status as `escalated` (existing logic)
3. Send the handoff message to the customer (via WhatsApp/Instagram as normal)
4. Trigger escalation email notification (fire-and-forget)

For all subsequent messages in the same conversation:
- Before building the Claude prompt, check the conversation's status
- If `status === 'escalated'`, return early — do NOT call Claude, do NOT send any reply
- The customer sees no response; the owner handles it outside the system
- Bot only resumes when a new conversation is created (after the existing 2h inactivity gap that starts a new conversation record)

## 2. Email Notification

New `EscalationNotifierService` that sends an email via Resend when a conversation is escalated.

**Trigger:** Called from `chatbot.service.ts` after escalation is detected, fire-and-forget (wrapped in try/catch, failure logged but does not block the response).

**Email lookup:** Query the `users` table to find the email for the client's `clientId`. If no user is found, log a warning and skip notification.

**Email contents:**
- **From:** `Lumino AI <noreply@luminoai.co.il>` (or Resend's default sender)
- **Subject:** `Escalation: Customer ****{last4} needs attention`
- **Body (HTML):**
  - Customer identifier (masked: `****{last4}`)
  - Channel: WhatsApp or Instagram
  - Trigger reason: which keyword matched, or "AI-initiated escalation"
  - Last 3-5 messages from the conversation (customer + bot, with role labels and timestamps)
  - Direct link: `https://dashboard.luminoai.co.il/dashboard/conversations/{conversationId}`
  - Brief text: "Please follow up with the customer directly."

**Error handling:** Email send failures are logged as warnings. The escalation itself (status change, handoff message) proceeds regardless of email success.

**Requires:** `RESEND_API_KEY` environment variable (already optional in env validation from the contact form feature).

## 3. Conversation Silencing Logic

In the message handling flow (`chatbot.service.ts`), add an early check before processing:

```
1. Receive incoming message
2. Find or create conversation
3. NEW: If conversation.status === 'escalated', return early (no response)
4. (existing) Check security, rate limits
5. (existing) Build prompt, call Claude
6. (existing) Check for escalation in response
7. (existing) Send reply
```

The check at step 3 is the "silencing" — the bot completely ignores messages to escalated conversations. No Claude call, no tokens used, no reply sent.

When the conversation's 2h inactivity window passes and the customer sends a new message, the existing logic creates a new conversation record with `status: 'active'`, and the bot resumes normally.

## 4. Escalation Trigger Tracking

The `isEscalationTrigger` boolean field on the `messages` table already exists but is never set. Start populating it: when the customer message triggers an escalation (keyword match or Claude's `[ESCALATE]`), set `isEscalationTrigger: true` on that message record.

This is useful for the email notification (to identify which message caused the escalation) and for analytics.

## 5. Files to Change

| File | Action | Change |
|------|--------|--------|
| `src/chatbot/chatbot.service.ts` | Modify | Add silencing check at start of message handling; replace Claude response with handoff message on escalation; trigger email notification |
| `src/common/escalation-notifier.service.ts` | Create | New service: query user email, fetch last messages, send email via Resend |
| `src/common/escalation-notifier.module.ts` | Create | New module exporting EscalationNotifierService |
| `src/app.module.ts` | Modify | Import EscalationNotifierModule |
| `src/common/usage.service.ts` | Modify | Set `isEscalationTrigger: true` on the triggering message |

## 6. What Stays the Same

- Escalation detection logic (keywords + `[ESCALATE]`) — unchanged
- Dashboard escalation inbox UI — unchanged
- Dashboard resolve flow — unchanged (marks `resolvedAt`, but bot stays silent until new conversation)
- AlertService / AlertSchedulerService — unchanged (infrastructure monitoring only)
- Schema — no migrations needed (`isEscalationTrigger` field already exists)
- Client config — no new fields
