import { pgTable, uuid, text, boolean, timestamp, integer, bigint, index } from 'drizzle-orm/pg-core';

export const clientConfigs = pgTable('client_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessName: text('business_name').notNull(),
  services: text('services').notNull(),
  pricing: text('pricing'),
  businessHours: text('business_hours').notNull(),
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
