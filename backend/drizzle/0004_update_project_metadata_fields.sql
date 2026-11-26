ALTER TABLE "projects" DROP COLUMN IF EXISTS "responsible_user";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "tariff";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "additional_feature";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "uae_local_agent" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "atc_code" text;
