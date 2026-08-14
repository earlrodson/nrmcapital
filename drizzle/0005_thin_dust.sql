ALTER TABLE "clients" ADD COLUMN "deferred" boolean;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "deferred_reason" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "deferred_set_by_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "deferred_set_at" timestamp (3);--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_deferred_set_by_id_users_id_fk" FOREIGN KEY ("deferred_set_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;
