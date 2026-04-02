CREATE TABLE "conversation_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"customer_identifier" text NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"message_count" integer,
	"summary" text,
	"bot_resolved" boolean,
	"needs_follow_up" boolean,
	"customer_sentiment" text,
	"topic_tags" text[],
	"status" text DEFAULT 'needs_follow_up',
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "conversation_summaries_conversation_id_unique" UNIQUE("conversation_id")
);
--> statement-breakpoint
ALTER TABLE "client_configs" ADD COLUMN "subscription_plan" text DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE "client_configs" ADD COLUMN "dedicated_number" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "client_configs" ADD COLUMN "dedicated_number_fee" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "conversation_summaries" ADD CONSTRAINT "conversation_summaries_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_summaries" ADD CONSTRAINT "conversation_summaries_client_id_client_configs_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cs_client_idx" ON "conversation_summaries" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "cs_status_idx" ON "conversation_summaries" USING btree ("client_id","status");