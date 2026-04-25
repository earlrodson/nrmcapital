ALTER TABLE "payment_schedules" ADD COLUMN IF NOT EXISTS "amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL;
