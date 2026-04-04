CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"message" text NOT NULL,
	"template_name" text,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"recipients" jsonb,
	"total_recipients" integer DEFAULT 0,
	"sent_count" integer DEFAULT 0,
	"failed_count" integer DEFAULT 0,
	"status" text DEFAULT 'draft',
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_client_id_client_configs_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "promo_client_idx" ON "promotions" USING btree ("client_id");