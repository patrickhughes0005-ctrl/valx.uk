ALTER TABLE "customer_profiles" ADD COLUMN "referred_detailer_id" uuid;
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_referred_detailer_id_users_id_fk" FOREIGN KEY ("referred_detailer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "detailer_profiles" ADD COLUMN "affiliate_code" text;
ALTER TABLE "detailer_profiles" ADD CONSTRAINT "detailer_profiles_affiliate_code_format" CHECK ("affiliate_code" IS NULL OR "affiliate_code" ~ '^[A-Z0-9]{4,20}$');
CREATE UNIQUE INDEX "detailer_profiles_affiliate_code_idx" ON "detailer_profiles" USING btree ("affiliate_code");

CREATE TABLE "affiliate_point_ledger" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "detailer_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "booking_id" uuid NOT NULL,
  "points" integer DEFAULT 10 NOT NULL,
  "reason" text DEFAULT 'first_referred_booking_completed' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "affiliate_point_ledger_positive_points" CHECK ("points" > 0)
);
ALTER TABLE "affiliate_point_ledger" ADD CONSTRAINT "affiliate_point_ledger_detailer_id_users_id_fk" FOREIGN KEY ("detailer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "affiliate_point_ledger" ADD CONSTRAINT "affiliate_point_ledger_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "affiliate_point_ledger" ADD CONSTRAINT "affiliate_point_ledger_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;
CREATE UNIQUE INDEX "affiliate_point_ledger_customer_idx" ON "affiliate_point_ledger" USING btree ("customer_id");
CREATE UNIQUE INDEX "affiliate_point_ledger_booking_idx" ON "affiliate_point_ledger" USING btree ("booking_id");
CREATE INDEX "affiliate_point_ledger_detailer_idx" ON "affiliate_point_ledger" USING btree ("detailer_id", "created_at");
