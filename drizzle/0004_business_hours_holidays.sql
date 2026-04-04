ALTER TABLE "client_configs" ADD COLUMN "business_hours_structured" jsonb;--> statement-breakpoint
ALTER TABLE "client_configs" ADD COLUMN "holidays" jsonb;
