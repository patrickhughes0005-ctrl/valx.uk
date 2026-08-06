CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "booking_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "detailer_id" uuid,
        "stripe_checkout_session_id" text,
        "stripe_payment_intent_id" text,
        "amount" integer NOT NULL,
        "currency" text DEFAULT 'gbp' NOT NULL,
        "status" text DEFAULT 'pending' NOT NULL,
        "refunded_amount" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "payments_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id"),
        CONSTRAINT "payments_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id")
);
--> statement-breakpoint

CREATE TABLE "stripe_accounts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "detailer_id" uuid NOT NULL,
        "stripe_account_id" text NOT NULL,
        "charges_enabled" boolean DEFAULT false NOT NULL,
        "payouts_enabled" boolean DEFAULT false NOT NULL,
        "onboarding_complete" boolean DEFAULT false NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "stripe_accounts_stripe_account_id_unique" UNIQUE("stripe_account_id")
);
--> statement-breakpoint

CREATE TABLE "stripe_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "stripe_event_id" text NOT NULL,
        "type" text NOT NULL,
        "processed_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "stripe_events_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint

CREATE TABLE "stripe_payouts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "detailer_id" uuid NOT NULL,
        "stripe_payout_id" text NOT NULL,
        "amount" integer NOT NULL,
        "currency" text DEFAULT 'gbp' NOT NULL,
        "status" text NOT NULL,
        "arrival_date" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "stripe_payouts_stripe_payout_id_unique" UNIQUE("stripe_payout_id")
);
