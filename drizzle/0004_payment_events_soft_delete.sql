CREATE TYPE "public"."PaymentEventType" AS ENUM('CREATED', 'UPDATED', 'SOFT_DELETED');
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "deleted_at" timestamp (3);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "deleted_by_id" text;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "delete_reason" text;
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "payments_deleted_at_idx" ON "payments" USING btree ("deleted_at");
--> statement-breakpoint
CREATE INDEX "payments_active_idx" ON "payments" USING btree ("loan_id","payment_date") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"loan_id" text NOT NULL,
	"payment_id" text NOT NULL,
	"event_type" "PaymentEventType" NOT NULL,
	"actor_user_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "payment_events_loan_created_at_idx" ON "payment_events" USING btree ("loan_id","created_at");
--> statement-breakpoint
CREATE INDEX "payment_events_payment_created_at_idx" ON "payment_events" USING btree ("payment_id","created_at");
