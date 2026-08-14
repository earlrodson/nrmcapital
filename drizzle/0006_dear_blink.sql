CREATE TABLE "login_throttles" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"key" text NOT NULL,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp (3) NOT NULL,
	"locked_until" timestamp (3),
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "login_throttles_scope_key_key" ON "login_throttles" USING btree ("scope","key");