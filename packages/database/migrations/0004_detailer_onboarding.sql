CREATE TYPE "public"."detailer_onboarding_status" AS ENUM('draft', 'submitted', 'changes_requested', 'approved', 'rejected');
CREATE TYPE "public"."detailer_document_type" AS ENUM('identity', 'public_liability_insurance', 'motor_insurance');
CREATE TYPE "public"."detailer_document_status" AS ENUM('pending', 'approved', 'rejected');

ALTER TABLE "detailer_profiles" ADD COLUMN "business_name" text;
ALTER TABLE "detailer_profiles" ADD COLUMN "trading_address" text;
ALTER TABLE "detailer_profiles" ADD COLUMN "operating_postcode" text;
ALTER TABLE "detailer_profiles" ADD COLUMN "experience_years" integer;
ALTER TABLE "detailer_profiles" ADD COLUMN "right_to_work_declared" boolean DEFAULT false NOT NULL;
ALTER TABLE "detailer_profiles" ADD COLUMN "terms_accepted_at" timestamp with time zone;
ALTER TABLE "detailer_profiles" ADD COLUMN "onboarding_status" "detailer_onboarding_status" DEFAULT 'draft' NOT NULL;
ALTER TABLE "detailer_profiles" ADD COLUMN "submitted_at" timestamp with time zone;
ALTER TABLE "detailer_profiles" ADD COLUMN "reviewed_at" timestamp with time zone;
ALTER TABLE "detailer_profiles" ADD COLUMN "reviewed_by" uuid;
ALTER TABLE "detailer_profiles" ADD COLUMN "review_notes" text;

UPDATE "detailer_profiles"
SET "onboarding_status" = CASE WHEN "approved_at" IS NOT NULL THEN 'approved'::"detailer_onboarding_status" ELSE 'draft'::"detailer_onboarding_status" END;

CREATE TABLE "detailer_invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "token_hash" text NOT NULL,
  "invited_by" uuid NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "detailer_invitations_token_hash_idx" ON "detailer_invitations" USING btree ("token_hash");
CREATE INDEX "detailer_invitations_email_idx" ON "detailer_invitations" USING btree ("email", "expires_at");

CREATE TABLE "detailer_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "detailer_id" uuid NOT NULL,
  "type" "detailer_document_type" NOT NULL,
  "status" "detailer_document_status" DEFAULT 'pending' NOT NULL,
  "original_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "sha256" text NOT NULL,
  "storage_key" text NOT NULL,
  "expires_at" timestamp with time zone,
  "review_notes" text,
  "reviewed_at" timestamp with time zone,
  "reviewed_by" uuid,
  "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "detailer_documents_storage_key_idx" ON "detailer_documents" USING btree ("storage_key");
CREATE INDEX "detailer_documents_detailer_idx" ON "detailer_documents" USING btree ("detailer_id", "type", "uploaded_at");

ALTER TABLE "detailer_profiles" ADD CONSTRAINT "detailer_profiles_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "detailer_invitations" ADD CONSTRAINT "detailer_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "detailer_documents" ADD CONSTRAINT "detailer_documents_detailer_id_users_id_fk" FOREIGN KEY ("detailer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "detailer_documents" ADD CONSTRAINT "detailer_documents_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
