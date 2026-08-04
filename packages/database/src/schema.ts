import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", [
  "customer",
  "detailer",
  "admin"
]);
export const bookingStatus = pgEnum("booking_status", [
  "draft",
  "quoted",
  "confirmed",
  "assigned",
  "on_way",
  "arrived",
  "in_progress",
  "completed",
  "cancelled",
  "disputed"
]);
export const vehicleType = pgEnum("vehicle_type", [
  "hatchback",
  "sedan",
  "suv",
  "coupe",
  "pickup",
  "other"
]);
export const deletionRequestStatus = pgEnum("deletion_request_status", [
  "requested",
  "processing",
  "completed",
  "declined_legal_hold"
]);
export const authTokenPurpose = pgEnum("auth_token_purpose", [
  "verify_email",
  "reset_password"
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: userRole("role").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  mfaRequired: boolean("mfa_required").notNull().default(false),
  ...timestamps
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    uniqueIndex("sessions_token_hash_idx").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId, table.expiresAt)
  ]
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    purpose: authTokenPurpose("purpose").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    uniqueIndex("auth_tokens_token_hash_idx").on(table.tokenHash),
    index("auth_tokens_user_purpose_idx").on(
      table.userId,
      table.purpose,
      table.expiresAt
    )
  ]
);

export const customerProfiles = pgTable("customer_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id),
  waterAvailable: boolean("water_available").notNull(),
  affiliateCode: text("affiliate_code"),
  ...timestamps
});

export const detailerProfiles = pgTable("detailer_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id),
  ownWaterSupply: boolean("own_water_supply").notNull().default(false),
  serviceRadiusMiles: integer("service_radius_miles").notNull().default(12),
  vatRegistered: boolean("vat_registered").notNull().default(false),
  vatNumber: text("vat_number"),
  instagram: text("instagram"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  insuranceExpiresAt: timestamp("insurance_expires_at", {
    withTimezone: true
  }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  ...timestamps
});

export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => users.id),
  registrationNumber: text("registration_number").notNull(),
  make: text("make").notNull(),
  model: text("model"),
  colour: text("colour"),
  fuelType: text("fuel_type"),
  yearOfManufacture: integer("year_of_manufacture"),
  type: vehicleType("type").notNull(),
  lookupSource: text("lookup_source").notNull().default("mock"),
  ...timestamps
});

export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => users.id),
  googlePlaceId: text("google_place_id"),
  label: text("label").notNull(),
  postcode: text("postcode").notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  waterAvailable: boolean("water_available"),
  ...timestamps
});

export const quotes = pgTable("quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => users.id),
  serviceId: text("service_id").notNull(),
  vehicleType: vehicleType("vehicle_type").notNull(),
  distanceMiles: numeric("distance_miles", {
    precision: 7,
    scale: 2
  }).notNull(),
  predictedMinutes: integer("predicted_minutes").notNull(),
  breakdown: jsonb("breakdown").notNull(),
  jobPrice: numeric("job_price", { precision: 10, scale: 2 }).notNull(),
  serviceFee: numeric("service_fee", { precision: 10, scale: 2 }).notNull(),
  customerTotal: numeric("customer_total", {
    precision: 10,
    scale: 2
  }).notNull(),
  detailerEarnings: numeric("detailer_earnings", {
    precision: 10,
    scale: 2
  }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps
});

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id),
    detailerId: uuid("detailer_id").references(() => users.id),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id),
    addressId: uuid("address_id")
      .notNull()
      .references(() => addresses.id),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id),
    status: bookingStatus("status").notNull().default("draft"),
    bookingType: text("booking_type").notNull().default("prebook"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    arrivedAt: timestamp("arrived_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    paymentState: text("payment_state").notNull().default("not_connected"),
    ...timestamps
  },
  (table) => [uniqueIndex("bookings_quote_idx").on(table.quoteId)]
);

export const supportRequests = pgTable(
  "support_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    category: text("category").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [index("support_requests_user_idx").on(table.userId, table.createdAt)]
);

export const accountDeletionRequests = pgTable(
  "account_deletion_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    status: deletionRequestStatus("status").notNull().default("requested"),
    reason: text("reason"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true })
  },
  (table) => [
    index("account_deletion_requests_user_idx").on(
      table.userId,
      table.requestedAt
    )
  ]
);

export const jobEvidence = pgTable("job_evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id),
  phase: text("phase").notNull(),
  storageKey: text("storage_key").notNull(),
  note: text("note"),
  capturedAt: timestamp("captured_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export const policyVersions = pgTable("policy_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull(),
  version: integer("version").notNull(),
  content: jsonb("content").notNull(),
  effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
  retiredAt: timestamp("retired_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id),
  action: text("action").notNull(),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});
