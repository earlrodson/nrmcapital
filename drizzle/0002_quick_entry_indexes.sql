CREATE INDEX IF NOT EXISTS "clients_is_active_created_at_idx" ON "clients" USING btree ("is_active","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_payment_date_idx" ON "payments" USING btree ("payment_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funding_transactions_transaction_date_idx" ON "funding_transactions" USING btree ("transaction_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_entity_created_at_idx" ON "audit_logs" USING btree ("entity","created_at");
