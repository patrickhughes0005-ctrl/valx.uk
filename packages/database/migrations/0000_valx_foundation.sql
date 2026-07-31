CREATE TYPE "user_role" AS ENUM ('customer', 'detailer', 'admin');
CREATE TYPE "booking_status" AS ENUM ('draft', 'quoted', 'confirmed', 'assigned', 'on_way', 'arrived', 'in_progress', 'completed', 'cancelled', 'disputed');
CREATE TYPE "vehicle_type" AS ENUM ('hatchback', 'sedan', 'suv', 'coupe', 'pickup', 'other');

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "role" "user_role" NOT NULL,
  "email" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "phone" text,
  "mfa_required" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "detailer_profiles" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id"),
  "own_water_supply" boolean NOT NULL DEFAULT false,
  "service_radius_miles" integer NOT NULL DEFAULT 12,
  "vat_registered" boolean NOT NULL DEFAULT false,
  "vat_number" text,
  "insurance_expires_at" timestamptz,
  "approved_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "vehicles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" uuid NOT NULL REFERENCES "users"("id"),
  "registration_number" text NOT NULL,
  "make" text NOT NULL,
  "model" text,
  "colour" text,
  "fuel_type" text,
  "year_of_manufacture" integer,
  "type" "vehicle_type" NOT NULL,
  "lookup_source" text NOT NULL DEFAULT 'mock',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "addresses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" uuid NOT NULL REFERENCES "users"("id"),
  "google_place_id" text,
  "label" text NOT NULL,
  "postcode" text NOT NULL,
  "latitude" numeric(10,7),
  "longitude" numeric(10,7),
  "water_available" boolean,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "quotes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "service_id" text NOT NULL,
  "vehicle_type" "vehicle_type" NOT NULL,
  "distance_miles" numeric(7,2) NOT NULL,
  "predicted_minutes" integer NOT NULL,
  "breakdown" jsonb NOT NULL,
  "job_price" numeric(10,2) NOT NULL,
  "service_fee" numeric(10,2) NOT NULL,
  "customer_total" numeric(10,2) NOT NULL,
  "detailer_earnings" numeric(10,2) NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "bookings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" uuid NOT NULL REFERENCES "users"("id"),
  "detailer_id" uuid REFERENCES "users"("id"),
  "vehicle_id" uuid NOT NULL REFERENCES "vehicles"("id"),
  "address_id" uuid NOT NULL REFERENCES "addresses"("id"),
  "quote_id" uuid NOT NULL REFERENCES "quotes"("id"),
  "status" "booking_status" NOT NULL DEFAULT 'draft',
  "scheduled_for" timestamptz,
  "arrived_at" timestamptz,
  "completed_at" timestamptz,
  "payment_state" text NOT NULL DEFAULT 'not_connected',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "job_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "booking_id" uuid NOT NULL REFERENCES "bookings"("id"),
  "phase" text NOT NULL,
  "storage_key" text NOT NULL,
  "note" text,
  "captured_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "policy_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" text NOT NULL,
  "version" integer NOT NULL,
  "content" jsonb NOT NULL,
  "effective_at" timestamptz NOT NULL,
  "retired_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_id" uuid REFERENCES "users"("id"),
  "action" text NOT NULL,
  "subject_type" text NOT NULL,
  "subject_id" text NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "policy_versions_key_version_idx" ON "policy_versions" ("key", "version");
CREATE INDEX "bookings_customer_idx" ON "bookings" ("customer_id", "created_at");
CREATE INDEX "bookings_detailer_idx" ON "bookings" ("detailer_id", "scheduled_for");
CREATE INDEX "audit_subject_idx" ON "audit_log" ("subject_type", "subject_id", "created_at");
