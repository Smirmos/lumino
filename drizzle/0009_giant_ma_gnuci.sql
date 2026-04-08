CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"conversation_id" uuid,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text NOT NULL,
	"service" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"action_token" text NOT NULL,
	"action_token_expires_at" timestamp,
	"owner_notified_at" timestamp,
	"customer_notified_at" timestamp,
	"notes" text,
	"decline_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "appointments_action_token_unique" UNIQUE("action_token")
);
--> statement-breakpoint
ALTER TABLE "client_configs" ADD COLUMN "booking_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "client_configs" ADD COLUMN "slot_duration_minutes" integer DEFAULT 60;--> statement-breakpoint
ALTER TABLE "client_configs" ADD COLUMN "max_concurrent_bookings" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "client_configs" ADD COLUMN "buffer_minutes" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "client_configs" ADD COLUMN "booking_lead_hours" integer DEFAULT 2;--> statement-breakpoint
ALTER TABLE "client_configs" ADD COLUMN "booking_horizon_days" integer DEFAULT 14;--> statement-breakpoint
ALTER TABLE "client_configs" ADD COLUMN "timezone" text DEFAULT 'Asia/Jerusalem';--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_client_configs_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appt_client_status_idx" ON "appointments" USING btree ("client_id","status");--> statement-breakpoint
CREATE INDEX "appt_client_time_idx" ON "appointments" USING btree ("client_id","start_time");--> statement-breakpoint
CREATE INDEX "appt_action_token_idx" ON "appointments" USING btree ("action_token");