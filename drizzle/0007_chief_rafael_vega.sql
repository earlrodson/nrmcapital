CREATE SEQUENCE IF NOT EXISTS "client_number_seq";--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "client_number" text DEFAULT ('CL-' || lpad(nextval('client_number_seq')::text, 4, '0')) NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "clients_client_number_key" ON "clients" USING btree ("client_number");