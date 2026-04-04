import { pgTable, uuid, text, boolean, timestamp, integer, bigint, jsonb, index } from 'drizzle-orm/pg-core';

export const clientConfigs = pgTable('client_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessName: text('business_name').notNull(),
  services: text('services').notNull(),
  pricing: text('pricing'),
  businessHours: text('business_hours').notNull(),
  businessHoursStructured: jsonb('business_hours_structured'),
  holidays: jsonb('holidays'),
  location: text('location'),
  website: text('website'),
  toneDescription: text('tone_description').notNull().default('Friendly and professional'),
  languages: text('languages').array().notNull().default(['auto']),
  escalationKeywords: text('escalation_keywords').array(),
  escalationSla: text('escalation_sla').default('24 hours'),
  fallbackMessage: text('fallback_message'),
  canBook: boolean('can_book').default(false),
  bookingUrl: text('booking_url'),
  instagramPageId: text('instagram_page_id'),
  whatsappPhoneId: text('whatsapp_phone_id'),
  isActive: boolean('is_active').default(true),
  subscriptionPlan: text('subscription_plan').default('standard'),
  dedicatedNumber: boolean('dedicated_number').default(false),
  dedicatedNumberFee: integer('dedicated_number_fee').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clientConfigs.id, { onDelete: 'cascade' }).notNull(),
  channel: text('channel').notNull(),
  customerIdentifier: text('customer_identifier').notNull(),
  startedAt: timestamp('started_at').defaultNow(),
  lastMessageAt: timestamp('last_message_at').defaultNow(),
  messageCount: integer('message_count').default(0),
  status: text('status').default('active'),
  escalatedAt: timestamp('escalated_at'),
  resolvedAt: timestamp('resolved_at'),
  languageDetected: text('language_detected'),
}, (t) => ({
  clientStatusIdx: index('conv_client_status_idx').on(t.clientId, t.status),
  clientLastMsgIdx: index('conv_client_lastmsg_idx').on(t.clientId, t.lastMessageAt),
}));

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  isEscalationTrigger: boolean('is_escalation_trigger').default(false),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
}, (t) => ({
  convIdx: index('msg_conv_idx').on(t.conversationId),
}));

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  clientId: uuid('client_id').references(() => clientConfigs.id, { onDelete: 'set null' }),
  isAdmin: boolean('is_admin').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
}, (t) => ({
  emailIdx: index('users_email_idx').on(t.email),
}));

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
}, (t) => ({
  tokenIdx: index('reset_token_idx').on(t.token),
}));

export const conversationSummaries = pgTable('conversation_summaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull().unique(),
  clientId: uuid('client_id').references(() => clientConfigs.id, { onDelete: 'cascade' }).notNull(),
  channel: text('channel').notNull(),
  customerIdentifier: text('customer_identifier').notNull(),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  messageCount: integer('message_count'),
  summary: text('summary'),
  botResolved: boolean('bot_resolved'),
  needsFollowUp: boolean('needs_follow_up'),
  customerSentiment: text('customer_sentiment'),
  topicTags: text('topic_tags').array(),
  status: text('status').default('needs_follow_up'),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  clientIdx: index('cs_client_idx').on(t.clientId),
  statusIdx: index('cs_status_idx').on(t.clientId, t.status),
}));

export const monthlyUsageRollup = pgTable('monthly_usage_rollup', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clientConfigs.id, { onDelete: 'cascade' }).notNull(),
  month: text('month').notNull(),
  totalConversations: integer('total_conversations').default(0),
  totalMessages: integer('total_messages').default(0),
  totalEscalations: integer('total_escalations').default(0),
  totalInputTokens: bigint('total_input_tokens', { mode: 'number' }).default(0),
  totalOutputTokens: bigint('total_output_tokens', { mode: 'number' }).default(0),
  channelInstagram: integer('channel_instagram').default(0),
  channelWhatsapp: integer('channel_whatsapp').default(0),
});
