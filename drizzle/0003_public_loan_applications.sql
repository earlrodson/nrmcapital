CREATE TYPE "public"."ApplicationStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED');
--> statement-breakpoint
CREATE TABLE "loan_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"applicant_user_id" text,
	"applicant_email" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"contact_number" text,
	"address" text,
	"principal_amount" numeric(12, 2) NOT NULL,
	"monthly_interest_rate" numeric(5, 2) NOT NULL,
	"months" integer NOT NULL,
	"terms_per_month" integer NOT NULL,
	"payment_frequency" "PaymentFrequency" NOT NULL,
	"notes" text,
	"status" "ApplicationStatus" DEFAULT 'PENDING' NOT NULL,
	"reviewed_by_id" text,
	"reviewed_at" timestamp (3),
	"rejection_reason" text,
	"created_loan_id" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_applicant_user_id_users_id_fk" FOREIGN KEY ("applicant_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_created_loan_id_loans_id_fk" FOREIGN KEY ("created_loan_id") REFERENCES "public"."loans"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "loan_applications_status_created_at_idx" ON "loan_applications" USING btree ("status","created_at");
--> statement-breakpoint
CREATE INDEX "loan_applications_applicant_email_idx" ON "loan_applications" USING btree ("applicant_email");
--> statement-breakpoint
CREATE INDEX "loan_applications_applicant_user_id_idx" ON "loan_applications" USING btree ("applicant_user_id");
