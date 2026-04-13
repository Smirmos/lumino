CREATE TABLE IF NOT EXISTS "mobile_push_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "expo_token" text NOT NULL UNIQUE,
  "platform" text NOT NULL,
  "device_name" text,
  "app_version" text,
  "created_at" timestamp DEFAULT now(),
  "last_seen_at" timestamp DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "mobile_push_tokens" ADD CONSTRAINT "mobile_push_tokens_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "mobile_push_tokens" ADD CONSTRAINT "mobile_push_tokens_client_id_client_configs_id_fk"
    FOREIGN KEY ("client_id") REFERENCES "client_configs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "push_client_idx" ON "mobile_push_tokens" ("client_id");
CREATE INDEX IF NOT EXISTS "push_user_idx" ON "mobile_push_tokens" ("user_id");
