CREATE TYPE "public"."AttachmentType" AS ENUM('GOV_ID', 'PROOF_OF_INCOME', 'PROOF_OF_BILLING', 'CONTRACT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."FundingTransactionType" AS ENUM('DEPOSIT', 'WITHDRAWAL');--> statement-breakpoint
CREATE TYPE "public"."LoanStatus" AS ENUM('ACTIVE', 'COMPLETED', 'DEFAULTED');--> statement-breakpoint
CREATE TYPE "public"."LoanType" AS ENUM('FLAT', 'DIMINISHING');--> statement-breakpoint
CREATE TYPE "public"."PaymentFrequency" AS ENUM('MONTHLY', 'SEMI_MONTHLY', 'WEEKLY');--> statement-breakpoint
CREATE TYPE "public"."PaymentMethod" AS ENUM('CASH', 'GCASH', 'BANK_TRANSFER', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."PaymentType" AS ENUM('REGULAR', 'ADVANCE', 'PENALTY');--> statement-breakpoint
CREATE TYPE "public"."Role" AS ENUM('SUPERADMIN', 'ADMIN', 'CLIENT');--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"type" "AttachmentType" DEFAULT 'OTHER' NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text,
	"uploaded_by_id" text NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"contact_number" text,
	"address" text,
	"id_type" text,
	"id_number" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"deleted_at" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "funding_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"investor_id" text,
	"transaction_type" "FundingTransactionType" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"transaction_date" timestamp (3) DEFAULT now() NOT NULL,
	"reference_number" text,
	"notes" text,
	"recorded_by_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"capital_amount" numeric(12, 2),
	"interest_share_rate" numeric(5, 2),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"investor_id" text,
	"loan_type" "LoanType" DEFAULT 'FLAT' NOT NULL,
	"principal_amount" numeric(12, 2) NOT NULL,
	"monthly_interest_rate" numeric(5, 2) NOT NULL,
	"months" integer NOT NULL,
	"terms_per_month" integer NOT NULL,
	"total_terms" integer NOT NULL,
	"payment_frequency" "PaymentFrequency" NOT NULL,
	"estimated_interest" numeric(12, 2) NOT NULL,
	"total_interest" numeric(12, 2) NOT NULL,
	"total_payable" numeric(12, 2) NOT NULL,
	"amortization_amount" numeric(12, 2) NOT NULL,
	"loan_date" timestamp (3) NOT NULL,
	"disbursement_date" timestamp (3),
	"expected_end_date" timestamp (3) NOT NULL,
	"actual_end_date" timestamp (3),
	"status" "LoanStatus" DEFAULT 'ACTIVE' NOT NULL,
	"outstanding_balance" numeric(12, 2) NOT NULL,
	"total_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "payment_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"loan_id" text NOT NULL,
	"term_number" integer NOT NULL,
	"due_date" timestamp (3) NOT NULL,
	"amount_due" numeric(12, 2) NOT NULL,
	"principal_due" numeric(12, 2) NOT NULL,
	"interest_due" numeric(12, 2) NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp (3),
	"updated_at" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"loan_id" text NOT NULL,
	"payment_schedule_id" text,
	"amount" numeric(12, 2) NOT NULL,
	"payment_type" "PaymentType" DEFAULT 'REGULAR' NOT NULL,
	"payment_method" "PaymentMethod" DEFAULT 'CASH' NOT NULL,
	"payment_date" timestamp (3) DEFAULT now() NOT NULL,
	"penalty_reason" text,
	"notes" text,
	"recorded_by_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"setting_key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"updated_by_id" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "Role" DEFAULT 'ADMIN' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp (3),
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "funding_transactions" ADD CONSTRAINT "funding_transactions_investor_id_investors_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "funding_transactions" ADD CONSTRAINT "funding_transactions_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_investor_id_investors_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_schedule_id_payment_schedules_id_fk" FOREIGN KEY ("payment_schedule_id") REFERENCES "public"."payment_schedules"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_user_id_key" ON "clients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "loans_client_id_idx" ON "loans" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "loans_investor_id_idx" ON "loans" USING btree ("investor_id");--> statement-breakpoint
CREATE INDEX "loans_status_idx" ON "loans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_schedules_loan_id_is_paid_idx" ON "payment_schedules" USING btree ("loan_id","is_paid");--> statement-breakpoint
CREATE INDEX "payment_schedules_due_date_idx" ON "payment_schedules" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "payments_loan_id_idx" ON "payments" USING btree ("loan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "system_settings_setting_key_key" ON "system_settings" USING btree ("setting_key");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");