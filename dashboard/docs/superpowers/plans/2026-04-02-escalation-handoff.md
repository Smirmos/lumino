# Escalation Handling & Human Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a conversation is escalated, the bot sends a handoff message, stops responding to that conversation, and emails the business owner with context.

**Architecture:** Add a conversation status check at the start of message handling to silence the bot for escalated conversations. On escalation, replace Claude's reply with a handoff message and fire-and-forget an email notification to the client's dashboard user via Resend. New `EscalationNotifierService` handles email composition and sending.

**Tech Stack:** NestJS, Drizzle ORM, Resend (already installed), PostgreSQL

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/common/escalation-notifier.service.ts` | Create | Query owner email, fetch recent messages, send escalation email via Resend |
| `src/common/escalation-notifier.module.ts` | Create | Module exporting EscalationNotifierService |
| `src/chatbot/chatbot.service.ts` | Modify | Add silencing check + handoff message + trigger notification |
| `src/common/usage.service.ts` | Modify | Add `getConversationStatus()` method, set `isEscalationTrigger` on messages |
| `src/app.module.ts` | Modify | Import EscalationNotifierModule |

---

### Task 1: Add `getConversationStatus` to UsageService

**Files:**
- Modify: `src/common/usage.service.ts`

- [ ] **Step 1: Add the getConversationStatus method**

Add this method to the `UsageService` class in `src/common/usage.service.ts`, after the existing `upsertConversation` method (after line 56):

```typescript
  async getConversationStatus(
    clientId: string,
    channel: string,
    customerIdentifier: string,
  ): Promise<string | null> {
    try {
      const rows = await this.db
        .select({ status: conversations.status })
        .from(conversations)
        .where(
          and(
            eq(conversations.clientId, clientId),
            eq(conversations.channel, channel),
            eq(conversations.customerIdentifier, customerIdentifier),
            eq(conversations.status, 'escalated'),
          ),
        )
        .limit(1);
      return rows.length > 0 ? rows[0].status : null;
    } catch (err: any) {
      this.logger.error('Failed to get conversation status', err.message);
      return null;
    }
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/common/usage.service.ts
git commit -m "feat: add getConversationStatus method to UsageService"
```

---

### Task 2: Set `isEscalationTrigger` on triggering messages

**Files:**
- Modify: `src/common/usage.service.ts`

- [ ] **Step 1: Add a `markMessageAsEscalationTrigger` method**

Add this method to `UsageService` after the `markEscalated` method:

```typescript
  async markMessageAsEscalationTrigger(
    clientId: string,
    channel: string,
    customerIdentifier: string,
  ): Promise<void> {
    try {
      // Find the conversation
      const convRows = await this.db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.clientId, clientId),
            eq(conversations.channel, channel),
            eq(conversations.customerIdentifier, customerIdentifier),
          ),
        )
        .limit(1);

      if (convRows.length === 0) return;

      // Find the last user message in this conversation and mark it
      const msgRows = await this.db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, convRows[0].id),
            eq(messages.role, 'user'),
          ),
        )
        .orderBy(sql`${messages.createdAt} DESC`)
        .limit(1);

      if (msgRows.length > 0) {
        await this.db
          .update(messages)
          .set({ isEscalationTrigger: true })
          .where(eq(messages.id, msgRows[0].id));
      }
    } catch (err: any) {
      this.logger.error('Failed to mark escalation trigger', err.message);
    }
  }
```

You'll also need to add `sql` to the import if it's not already there. Check the existing imports — it should already be imported: `import { eq, and, sql } from 'drizzle-orm';`. Also add `messages` to the schema import if not already there. The existing import line is:
```typescript
import { conversations, messages, monthlyUsageRollup } from '../db/schema';
```
This already includes `messages`, so no change needed.

- [ ] **Step 2: Commit**

```bash
git add src/common/usage.service.ts
git commit -m "feat: add markMessageAsEscalationTrigger to UsageService"
```

---

### Task 3: Create EscalationNotifierService

**Files:**
- Create: `src/common/escalation-notifier.service.ts`
- Create: `src/common/escalation-notifier.module.ts`

- [ ] **Step 1: Create the notifier service**

Create `src/common/escalation-notifier.service.ts`:

```typescript
import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { Db } from '../db';
import { users, conversations, messages } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

@Injectable()
export class EscalationNotifierService {
  private readonly logger = new Logger(EscalationNotifierService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly dashboardUrl: string;

  constructor(
    @Inject('DB') private readonly db: Db,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.fromEmail = this.config.get<string>(
      'ESCALATION_FROM_EMAIL',
      'Lumino AI <onboarding@resend.dev>',
    );
    this.dashboardUrl = this.config.get<string>(
      'DASHBOARD_URL',
      'https://dashboard.luminoai.co.il',
    );
  }

  async notifyEscalation(
    clientId: string,
    channel: string,
    customerIdentifier: string,
    triggerReason: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY not set — skipping escalation email');
      return;
    }

    try {
      // 1. Find owner email
      const userRows = await this.db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.clientId, clientId))
        .limit(1);

      if (userRows.length === 0) {
        this.logger.warn(`No user found for clientId ${clientId} — skipping escalation email`);
        return;
      }
      const ownerEmail = userRows[0].email;

      // 2. Find conversation
      const convRows = await this.db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.clientId, clientId),
            eq(conversations.channel, channel),
            eq(conversations.customerIdentifier, customerIdentifier),
          ),
        )
        .limit(1);

      if (convRows.length === 0) {
        this.logger.warn('Conversation not found for escalation email');
        return;
      }
      const conversationId = convRows[0].id;

      // 3. Fetch last 5 messages
      const recentMessages = await this.db
        .select({
          role: messages.role,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(5);

      // Reverse to chronological order
      recentMessages.reverse();

      // 4. Build email HTML
      const maskedId = `****${customerIdentifier.slice(-4)}`;
      const channelLabel = channel === 'whatsapp' ? 'WhatsApp' : 'Instagram';
      const dashboardLink = `${this.dashboardUrl}/dashboard/conversations/${conversationId}`;

      const messagesHtml = recentMessages
        .map((msg) => {
          const roleLabel = msg.role === 'user' ? 'Customer' : 'Bot';
          const time = msg.createdAt
            ? new Date(msg.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '';
          const bgColor = msg.role === 'user' ? '#f3f4f6' : '#f0eefb';
          return `<div style="background:${bgColor};padding:10px 14px;border-radius:8px;margin-bottom:6px;">
            <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">${roleLabel} · ${time}</div>
            <div style="font-size:14px;color:#111;">${msg.content}</div>
          </div>`;
        })
        .join('');

      const html = `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#5B4FCF;margin-bottom:4px;">Escalation Alert</h2>
          <p style="color:#6b7280;margin-top:0;">A customer needs your attention.</p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <tr><td style="padding:6px 0;color:#6b7280;width:120px;">Customer</td><td style="padding:6px 0;font-weight:600;">${maskedId}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Channel</td><td style="padding:6px 0;">${channelLabel}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Trigger</td><td style="padding:6px 0;">${triggerReason}</td></tr>
          </table>

          <h3 style="margin-bottom:8px;">Recent Messages</h3>
          ${messagesHtml}

          <div style="margin-top:20px;">
            <a href="${dashboardLink}" style="display:inline-block;padding:10px 24px;background:#5B4FCF;color:white;text-decoration:none;border-radius:8px;font-weight:600;">
              View in Dashboard
            </a>
          </div>

          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
            The bot has stopped responding to this customer. Please follow up directly.
          </p>
        </div>
      `;

      // 5. Send email
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: ownerEmail,
        subject: `Escalation: Customer ${maskedId} needs attention`,
        html,
      });

      if (error) {
        this.logger.error('Failed to send escalation email', error);
        return;
      }

      this.logger.log(`Escalation email sent to ${ownerEmail} for conversation ${conversationId}`);
    } catch (err: any) {
      this.logger.error('Escalation notification error', err.message);
    }
  }
}
```

- [ ] **Step 2: Create the module**

Create `src/common/escalation-notifier.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { EscalationNotifierService } from './escalation-notifier.service';

@Module({
  providers: [EscalationNotifierService],
  exports: [EscalationNotifierService],
})
export class EscalationNotifierModule {}
```

- [ ] **Step 3: Commit**

```bash
git add src/common/escalation-notifier.service.ts src/common/escalation-notifier.module.ts
git commit -m "feat: add EscalationNotifierService for email notifications"
```

---

### Task 4: Register EscalationNotifierModule in AppModule

**Files:**
- Modify: `src/app.module.ts`

- [ ] **Step 1: Add import and register the module**

In `src/app.module.ts`, add the import at the top (after the ContactModule import):

```typescript
import { EscalationNotifierModule } from './common/escalation-notifier.module';
```

Then add `EscalationNotifierModule` to the `imports` array, after `ContactModule`:

```typescript
    ContactModule,
    EscalationNotifierModule,
```

- [ ] **Step 2: Commit**

```bash
git add src/app.module.ts
git commit -m "feat: register EscalationNotifierModule in AppModule"
```

---

### Task 5: Wire Escalation Logic into ChatbotService

**Files:**
- Modify: `src/chatbot/chatbot.service.ts`

This is the main integration task. Three changes:

1. Add silencing check (early return for escalated conversations)
2. Replace Claude reply with handoff message on escalation
3. Fire notification + mark trigger message

- [ ] **Step 1: Add EscalationNotifierService to constructor**

In `src/chatbot/chatbot.service.ts`, add the import at the top:

```typescript
import { EscalationNotifierService } from '../common/escalation-notifier.service';
```

Add it to the constructor parameters (after `whatsappService`):

```typescript
    private readonly escalationNotifier: EscalationNotifierService,
```

- [ ] **Step 2: Add silencing check at the start of handleMessage**

After Step 6 (fetch client config, line 115 — `return { reply: '', escalated: false, status: 'blocked'...}`), add the escalation silencing check:

```typescript
    // Step 6b: Check if conversation is escalated — if so, silently ignore
    const convStatus = await this.usageService.getConversationStatus(
      input.clientId,
      input.channel,
      input.userId,
    );
    if (convStatus === 'escalated') {
      this.logger.log({
        event: 'escalated_conversation_silenced',
        clientId: input.clientId,
        channel: input.channel,
        userId: hashedUserId,
      });
      return { reply: '', escalated: true, status: 'blocked', inputTokens: 0, outputTokens: 0 };
    }
```

This goes right after the `if (!client.isActive)` check and before the Sentry context setup.

- [ ] **Step 3: Replace Claude reply with handoff message on escalation**

Find the escalation detection block (around line 186-194):

```typescript
      // Step 15: Detect escalation
      const shouldEscalate =
        result.text.includes('[ESCALATE]') ||
        this.securityService.checkEscalationKeywords(input.text, client.escalationKeywords);
      const cleanReply = result.text.replace('[ESCALATE]', '').trim();

      if (shouldEscalate) {
        void this.usageService.markEscalated(input.clientId, input.channel, input.userId);
      }
```

Replace with:

```typescript
      // Step 15: Detect escalation
      const shouldEscalate =
        result.text.includes('[ESCALATE]') ||
        this.securityService.checkEscalationKeywords(input.text, client.escalationKeywords);

      let cleanReply: string;
      if (shouldEscalate) {
        // Replace Claude's reply with handoff message
        cleanReply = "I'm connecting you with a team member who can help you further.";

        void this.usageService.markEscalated(input.clientId, input.channel, input.userId);
        void this.usageService.markMessageAsEscalationTrigger(input.clientId, input.channel, input.userId);

        // Determine trigger reason for email
        const triggerReason = result.text.includes('[ESCALATE]')
          ? 'AI-initiated escalation'
          : 'Keyword match in customer message';
        void this.escalationNotifier.notifyEscalation(
          input.clientId,
          input.channel,
          input.userId,
          triggerReason,
        );
      } else {
        cleanReply = result.text.replace('[ESCALATE]', '').trim();
      }
```

Note: the `let cleanReply` replaces the existing `const cleanReply` declaration.

- [ ] **Step 4: Commit**

```bash
git add src/chatbot/chatbot.service.ts
git commit -m "feat: add escalation silencing, handoff message, and email notification"
```

---

### Task 6: Update ChatbotModule to Provide EscalationNotifierService

**Files:**
- Modify: `src/chatbot/chatbot.module.ts`

- [ ] **Step 1: Check and update the chatbot module**

Read `src/chatbot/chatbot.module.ts` first. The `EscalationNotifierService` is now injected into `ChatbotService`, so the `ChatbotModule` needs access to it. Since `EscalationNotifierModule` is registered globally via `AppModule`, and it exports `EscalationNotifierService`, NestJS should resolve it automatically.

However, if `ChatbotModule` imports are isolated, you may need to add the import. Add to `src/chatbot/chatbot.module.ts`:

```typescript
import { EscalationNotifierModule } from '../common/escalation-notifier.module';
```

And add `EscalationNotifierModule` to the `imports` array of `ChatbotModule`.

- [ ] **Step 2: Verify the app builds**

Run: `cd /Users/arkadiy.smirnov/Documents/studying/lumino && npm run build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/chatbot/chatbot.module.ts
git commit -m "feat: import EscalationNotifierModule in ChatbotModule"
```

---

### Task 7: Build Verification and Manual Test

- [ ] **Step 1: Run the full build**

Run: `cd /Users/arkadiy.smirnov/Documents/studying/lumino && npm run build 2>&1 | tail -20`
Expected: Build succeeds with no errors

- [ ] **Step 2: Run existing tests**

Run: `cd /Users/arkadiy.smirnov/Documents/studying/lumino && npm test 2>&1 | tail -20`
Expected: All existing tests pass (or at least no new failures)

- [ ] **Step 3: Fix any build or test errors**

If there are errors, fix them in the relevant files.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build/test errors from escalation handoff changes"
```
