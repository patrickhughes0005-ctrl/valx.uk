CREATE TYPE "auth_token_purpose" AS ENUM ('verify_email', 'reset_password');

CREATE TABLE "auth_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "purpose" "auth_token_purpose" NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "auth_tokens_token_hash_idx"
  ON "auth_tokens" ("token_hash");

CREATE INDEX "auth_tokens_user_purpose_idx"
  ON "auth_tokens" ("user_id", "purpose", "expires_at");
