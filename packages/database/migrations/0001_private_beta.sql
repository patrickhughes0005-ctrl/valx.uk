CREATE TYPE "deletion_request_status" AS ENUM ('requested', 'processing', 'completed', 'declined_legal_hold');

ALTER TABLE "users"
  ADD COLUMN "password_hash" text,
  ADD COLUMN "email_verified_at" timestamptz,
  ADD COLUMN "deleted_at" timestamptz;

UPDATE "users"
SET "password_hash" = 'disabled:pre-beta-user'
WHERE "password_hash" IS NULL;

ALTER TABLE "users"
  ALTER COLUMN "password_hash" SET NOT NULL;

CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "token_hash" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "last_seen_at" timestamptz NOT NULL DEFAULT now(),
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "sessions_token_hash_idx" ON "sessions" ("token_hash");
CREATE INDEX "sessions_user_idx" ON "sessions" ("user_id", "expires_at");

CREATE TABLE "customer_profiles" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id"),
  "water_available" boolean NOT NULL,
  "affiliate_code" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "detailer_profiles"
  ADD COLUMN "instagram" text,
  ADD COLUMN "onboarding_complete" boolean NOT NULL DEFAULT false;

ALTER TABLE "quotes"
  ADD COLUMN "customer_id" uuid REFERENCES "users"("id");

UPDATE "quotes"
SET "customer_id" = (
  SELECT "id" FROM "users" WHERE "role" = 'customer' ORDER BY "created_at" LIMIT 1
)
WHERE "customer_id" IS NULL;

DELETE FROM "quotes" WHERE "customer_id" IS NULL;

ALTER TABLE "quotes"
  ALTER COLUMN "customer_id" SET NOT NULL;

ALTER TABLE "bookings"
  ADD COLUMN "booking_type" text NOT NULL DEFAULT 'prebook';

CREATE UNIQUE INDEX "bookings_quote_idx" ON "bookings" ("quote_id");

CREATE TABLE "support_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid REFERENCES "users"("id"),
  "category" text NOT NULL,
  "message" text NOT NULL,
  "status" text NOT NULL DEFAULT 'open',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "support_requests_user_idx" ON "support_requests" ("user_id", "created_at");

CREATE TABLE "account_deletion_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "status" "deletion_request_status" NOT NULL DEFAULT 'requested',
  "reason" text,
  "requested_at" timestamptz NOT NULL DEFAULT now(),
  "completed_at" timestamptz
);

CREATE INDEX "account_deletion_requests_user_idx"
  ON "account_deletion_requests" ("user_id", "requested_at");
