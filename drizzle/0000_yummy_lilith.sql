CREATE TABLE "client_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" text NOT NULL,
	"services" text NOT NULL,
	"pricing" text,
	"business_hours" text NOT NULL,
	"location" text,
	"website" text,
	"tone_description" text DEFAULT 'Friendly and professional' NOT NULL,
	"languages" text[] DEFAULT '{"auto"}' NOT NULL,
	"escalation_keywords" text[],
	"escalation_sla" text DEFAULT '24 hours',
	"fallback_message" text,
	"can_book" boolean DEFAULT false,
	"booking_url" text,
	"instagram_page_id" text,
	"whatsapp_phone_id" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"customer_identifier" text NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"last_message_at" timestamp DEFAULT now(),
	"message_count" integer DEFAULT 0,
	"status" text DEFAULT 'active',
	"escalated_at" timestamp,
	"resolved_at" timestamp,
	"language_detected" text
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"is_escalation_trigger" boolean DEFAULT false,
	"input_tokens" integer,
	"output_tokens" integer
);
--> statement-breakpoint
CREATE TABLE "monthly_usage_rollup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"month" text NOT NULL,
	"total_conversations" integer DEFAULT 0,
	"total_messages" integer DEFAULT 0,
	"total_escalations" integer DEFAULT 0,
	"total_input_tokens" bigint DEFAULT 0,
	"total_output_tokens" bigint DEFAULT 0,
	"channel_instagram" integer DEFAULT 0,
	"channel_whatsapp" integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_client_configs_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_usage_rollup" ADD CONSTRAINT "monthly_usage_rollup_client_id_client_configs_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conv_client_status_idx" ON "conversations" USING btree ("client_id","status");--> statement-breakpoint
CREATE INDEX "conv_client_lastmsg_idx" ON "conversations" USING btree ("client_id","last_message_at");--> statement-breakpoint
CREATE INDEX "msg_conv_idx" ON "messages" USING btree ("conversation_id");