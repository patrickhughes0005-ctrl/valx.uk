import {
  accountDeletionRequests,
  addresses,
  affiliatePointLedger,
  auditLog,
  authTokens,
  bookings,
  createDatabase,
  customerProfiles,
  detailerDocuments,
  detailerInvitations,
  detailerProfiles,
  quotes,
  sessions,
  supportRequests,
  users,
  vehicles
} from "@valx/database";
import type {
  Quote,
  ServiceId,
  VehicleType
} from "@valx/pricing-policy";
import { and, desc, eq, gt, isNull, notLike, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export type Role = "customer" | "detailer" | "admin";

export type UserRecord = {
  id: string;
  role: Role;
  email: string;
  name: string;
  phone: string | null;
  passwordHash: string;
  emailVerifiedAt: Date | null;
};

export type AuthTokenPurpose =
  | "verify_email"
  | "reset_password"
  | "admin_mfa";

export type BookingView = {
  id: string;
  status:
    | "draft"
    | "quoted"
    | "confirmed"
    | "assigned"
    | "on_way"
    | "arrived"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "disputed";
  bookingType: string;
  scheduledFor: string | null;
  paymentState: "not_connected";
  serviceId: string;
  customerTotal: number;
  detailerEarnings: number;
  vehicle: {
    id: string;
    registrationNumber: string;
    make: string;
    model: string | null;
    type: VehicleType;
  };
  address: {
    id: string;
    label: string;
    postcode: string;
    waterAvailable: boolean | null;
  };
  customerName: string;
  detailerName: string | null;
};

export type RegistrationInput = {
  role: "customer" | "detailer";
  email: string;
  name: string;
  phone: string;
  passwordHash: string;
  waterAvailable?: boolean;
  affiliateCode?: string;
  ownWaterSupply?: boolean;
  serviceRadiusMiles?: number;
  vatRegistered?: boolean;
  vatNumber?: string;
  instagram?: string;
  invitationTokenHash?: string;
};

export type DetailerOnboardingStatus =
  | "draft"
  | "submitted"
  | "changes_requested"
  | "approved"
  | "rejected";
export type DetailerDocumentType =
  | "identity"
  | "public_liability_insurance"
  | "motor_insurance";
export type DetailerDocumentView = {
  id: string;
  type: DetailerDocumentType;
  status: "pending" | "approved" | "rejected";
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: string | null;
  uploadedAt: string;
  reviewNotes: string | null;
};
export type DetailerOnboardingView = {
  userId: string;
  email: string;
  name: string;
  phone: string | null;
  businessName: string | null;
  tradingAddress: string | null;
  operatingPostcode: string | null;
  experienceYears: number | null;
  ownWaterSupply: boolean;
  serviceRadiusMiles: number;
  vatRegistered: boolean;
  vatNumber: string | null;
  instagram: string | null;
  rightToWorkDeclared: boolean;
  termsAccepted: boolean;
  status: DetailerOnboardingStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  reviewNotes: string | null;
  documents: DetailerDocumentView[];
};

export type AffiliatePointEntry = {
  id: string;
  detailerId: string;
  detailerName: string;
  detailerEmail: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  bookingId: string;
  points: number;
  reason: "first_referred_booking_completed";
  createdAt: string;
};

export type DetailerRewardsView = {
  affiliateCode: string | null;
  pointsBalance: number;
  pointsPerFirstBooking: 10;
  suppliesStatus: "tbc";
  supplies: [];
  ledger: AffiliatePointEntry[];
};

export type AdminDashboardView = {
  generatedAt: string;
  paymentsConnected: false;
  metrics: {
    customers: number;
    detailers: number;
    approvedDetailers: number;
    bookings: number;
    activeBookings: number;
    completedBookings: number;
    bookingRequestValue: number;
    projectedDetailerCost: number;
    projectedContribution: number;
    capturedPayments: number;
    paidPayouts: number;
    openSupportRequests: number;
    pendingDeletionRequests: number;
    affiliatePointsAwarded: number;
  };
  customers: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    vehicleCount: number;
    bookingCount: number;
    createdAt: string;
  }>;
  bookings: BookingView[];
  supportRequests: Array<{
    id: string;
    userEmail: string | null;
    category: string;
    message: string;
    status: string;
    createdAt: string;
  }>;
  deletionRequests: Array<{
    id: string;
    userEmail: string | null;
    status: string;
    reason: string | null;
    requestedAt: string;
  }>;
  admins: Array<{
    id: string;
    name: string;
    email: string;
    mfaRequired: boolean;
    createdAt: string;
  }>;
  audit: Array<{
    id: string;
    actorEmail: string | null;
    action: string;
    subjectType: string;
    subjectId: string;
    metadata: unknown;
    createdAt: string;
  }>;
  affiliatePoints: AffiliatePointEntry[];
};

export interface ValxRepository {
  close(): Promise<void>;
  healthcheck(): Promise<void>;
  createUser(input: RegistrationInput): Promise<UserRecord>;
  createAdmin(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<UserRecord>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  createAuthToken(input: {
    userId: string;
    purpose: AuthTokenPurpose;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  consumeAuthToken(
    tokenHash: string,
    purpose: AuthTokenPurpose
  ): Promise<UserRecord | null>;
  verifyEmail(tokenHash: string): Promise<UserRecord | null>;
  resetPassword(tokenHash: string, passwordHash: string): Promise<boolean>;
  approveDetailerByEmail(email: string, operator: string): Promise<boolean>;
  createDetailerInvitation(input: {
    email: string;
    tokenHash: string;
    invitedBy: string;
    expiresAt: Date;
  }): Promise<{ id: string; email: string; expiresAt: string }>;
  getDetailerOnboarding(detailerId: string): Promise<DetailerOnboardingView | null>;
  updateDetailerOnboarding(
    detailerId: string,
    input: {
      businessName: string;
      tradingAddress: string;
      operatingPostcode: string;
      experienceYears: number;
      ownWaterSupply: boolean;
      serviceRadiusMiles: number;
      vatRegistered: boolean;
      vatNumber?: string;
      instagram?: string;
      rightToWorkDeclared: boolean;
      termsAccepted: boolean;
    }
  ): Promise<DetailerOnboardingView | null>;
  addDetailerDocument(input: {
    detailerId: string;
    type: DetailerDocumentType;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    storageKey: string;
    expiresAt?: Date;
  }): Promise<DetailerDocumentView>;
  submitDetailerOnboarding(detailerId: string): Promise<DetailerOnboardingView | null>;
  listAdminDetailers(): Promise<DetailerOnboardingView[]>;
  reviewDetailerOnboarding(input: {
    detailerId: string;
    adminId: string;
    decision: "approved" | "changes_requested" | "rejected";
    notes: string;
  }): Promise<DetailerOnboardingView | null>;
  findDetailerDocumentForAdmin(documentId: string): Promise<{
    storageKey: string;
    originalName: string;
    mimeType: string;
  } | null>;
  getDetailerRewards(detailerId: string): Promise<DetailerRewardsView | null>;
  setDetailerAffiliateCode(
    detailerId: string,
    code: string
  ): Promise<DetailerRewardsView | null>;
  getAdminDashboard(): Promise<AdminDashboardView>;
  createSession(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<void>;
  authenticateSession(tokenHash: string): Promise<UserRecord | null>;
  revokeSession(tokenHash: string): Promise<void>;
  addVehicle(input: {
    customerId: string;
    registrationNumber: string;
    make: string;
    model?: string;
    colour?: string;
    fuelType?: string;
    yearOfManufacture?: number;
    type: VehicleType;
    lookupSource: string;
  }): Promise<{ id: string }>;
  listCustomerVehicles(customerId: string): Promise<
    Array<{
      id: string;
      registrationNumber: string;
      make: string;
      model: string | null;
      type: VehicleType;
    }>
  >;
  addAddress(input: {
    customerId: string;
    googlePlaceId?: string;
    label: string;
    postcode: string;
    latitude?: number;
    longitude?: number;
    waterAvailable: boolean;
  }): Promise<{ id: string }>;
  listCustomerAddresses(customerId: string): Promise<
    Array<{
      id: string;
      label: string;
      postcode: string;
      waterAvailable: boolean | null;
    }>
  >;
  isCustomerAffiliateFirstBookingEligible(customerId: string): Promise<boolean>;
  saveQuote(input: {
    customerId: string;
    serviceId: ServiceId;
    vehicleType: VehicleType;
    distanceMiles: number;
    quote: Quote;
    expiresAt: Date;
  }): Promise<{ id: string; expiresAt: string }>;
  createBooking(input: {
    customerId: string;
    vehicleId: string;
    addressId: string;
    quoteId: string;
    bookingType: "priority_pick" | "prebook" | "next_available";
    scheduledFor?: Date;
  }): Promise<BookingView>;
  listCustomerBookings(customerId: string): Promise<BookingView[]>;
  listDetailerOffers(detailerId: string): Promise<BookingView[]>;
  listDetailerBookings(detailerId: string): Promise<BookingView[]>;
  acceptBooking(bookingId: string, detailerId: string): Promise<BookingView | null>;
  updateBookingStatus(
    bookingId: string,
    detailerId: string,
    status: "on_way" | "arrived" | "in_progress" | "completed"
  ): Promise<BookingView | null>;
  createSupportRequest(
    userId: string,
    category: string,
    message: string
  ): Promise<{ id: string }>;
  requestAccountDeletion(
    userId: string,
    reason?: string
  ): Promise<{ id: string; status: string }>;
}

const numberValue = (value: string | number) => Number(value);

export const createPostgresRepository = (
  databaseUrl: string
): ValxRepository => {
  const connection = createDatabase(databaseUrl);
  const { db } = connection;

  const bookingView = async (bookingId: string) => {
    const [row] = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        bookingType: bookings.bookingType,
        scheduledFor: bookings.scheduledFor,
        paymentState: bookings.paymentState,
        serviceId: quotes.serviceId,
        customerTotal: quotes.customerTotal,
        detailerEarnings: quotes.detailerEarnings,
        vehicleId: vehicles.id,
        registrationNumber: vehicles.registrationNumber,
        make: vehicles.make,
        model: vehicles.model,
        vehicleType: vehicles.type,
        addressId: addresses.id,
        addressLabel: addresses.label,
        postcode: addresses.postcode,
        waterAvailable: addresses.waterAvailable,
        customerName: users.name,
        detailerId: bookings.detailerId
      })
      .from(bookings)
      .innerJoin(quotes, eq(bookings.quoteId, quotes.id))
      .innerJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
      .innerJoin(addresses, eq(bookings.addressId, addresses.id))
      .innerJoin(users, eq(bookings.customerId, users.id))
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!row) return null;

    let detailerName: string | null = null;
    if (row.detailerId) {
      const [detailer] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, row.detailerId))
        .limit(1);
      detailerName = detailer?.name ?? null;
    }

    return {
      id: row.id,
      status: row.status,
      bookingType: row.bookingType,
      scheduledFor: row.scheduledFor?.toISOString() ?? null,
      paymentState: "not_connected" as const,
      serviceId: row.serviceId,
      customerTotal: numberValue(row.customerTotal),
      detailerEarnings: numberValue(row.detailerEarnings),
      vehicle: {
        id: row.vehicleId,
        registrationNumber: row.registrationNumber,
        make: row.make,
        model: row.model,
        type: row.vehicleType
      },
      address: {
        id: row.addressId,
        label: row.addressLabel,
        postcode: row.postcode,
        waterAvailable: row.waterAvailable
      },
      customerName: row.customerName,
      detailerName
    } satisfies BookingView;
  };

  const bookingList = async (conditions: ReturnType<typeof eq>) => {
    const rows = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(conditions)
      .orderBy(desc(bookings.createdAt));
    return (await Promise.all(rows.map(({ id }) => bookingView(id)))).filter(
      (item) => item !== null
    );
  };

  const onboardingView = async (
    detailerId: string
  ): Promise<DetailerOnboardingView | null> => {
    const [row] = await db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        profile: detailerProfiles
      })
      .from(users)
      .innerJoin(detailerProfiles, eq(detailerProfiles.userId, users.id))
      .where(
        and(
          eq(users.id, detailerId),
          eq(users.role, "detailer"),
          isNull(users.deletedAt)
        )
      )
      .limit(1);
    if (!row) return null;
    const documents = await db
      .select()
      .from(detailerDocuments)
      .where(eq(detailerDocuments.detailerId, detailerId))
      .orderBy(desc(detailerDocuments.uploadedAt));
    return {
      userId: row.userId,
      email: row.email,
      name: row.name,
      phone: row.phone,
      businessName: row.profile.businessName,
      tradingAddress: row.profile.tradingAddress,
      operatingPostcode: row.profile.operatingPostcode,
      experienceYears: row.profile.experienceYears,
      ownWaterSupply: row.profile.ownWaterSupply,
      serviceRadiusMiles: row.profile.serviceRadiusMiles,
      vatRegistered: row.profile.vatRegistered,
      vatNumber: row.profile.vatNumber,
      instagram: row.profile.instagram,
      rightToWorkDeclared: row.profile.rightToWorkDeclared,
      termsAccepted: row.profile.termsAcceptedAt !== null,
      status: row.profile.onboardingStatus,
      submittedAt: row.profile.submittedAt?.toISOString() ?? null,
      approvedAt: row.profile.approvedAt?.toISOString() ?? null,
      reviewNotes: row.profile.reviewNotes,
      documents: documents.map((document) => ({
        id: document.id,
        type: document.type,
        status: document.status,
        originalName: document.originalName,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        expiresAt: document.expiresAt?.toISOString() ?? null,
        uploadedAt: document.uploadedAt.toISOString(),
        reviewNotes: document.reviewNotes
      }))
    };
  };

  const detailerRewardsView = async (
    detailerId: string
  ): Promise<DetailerRewardsView | null> => {
    const [detailer] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        affiliateCode: detailerProfiles.affiliateCode
      })
      .from(detailerProfiles)
      .innerJoin(users, eq(detailerProfiles.userId, users.id))
      .where(
        and(
          eq(detailerProfiles.userId, detailerId),
          eq(detailerProfiles.onboardingStatus, "approved"),
          isNull(users.deletedAt)
        )
      )
      .limit(1);
    if (!detailer) return null;

    const entries = await db
      .select()
      .from(affiliatePointLedger)
      .where(eq(affiliatePointLedger.detailerId, detailerId))
      .orderBy(desc(affiliatePointLedger.createdAt));
    const ledger = await Promise.all(
      entries.map(async (entry) => {
        const [customer] = await db
          .select({ name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, entry.customerId))
          .limit(1);
        return {
          id: entry.id,
          detailerId,
          detailerName: detailer.name,
          detailerEmail: detailer.email,
          customerId: entry.customerId,
          customerName: customer?.name ?? "Deleted customer",
          customerEmail: customer?.email ?? "Deleted customer",
          bookingId: entry.bookingId,
          points: entry.points,
          reason: "first_referred_booking_completed" as const,
          createdAt: entry.createdAt.toISOString()
        };
      })
    );
    return {
      affiliateCode: detailer.affiliateCode,
      pointsBalance: ledger.reduce((total, entry) => total + entry.points, 0),
      pointsPerFirstBooking: 10,
      suppliesStatus: "tbc",
      supplies: [],
      ledger
    };
  };

  return {
    close: connection.close,
    async healthcheck() {
      await db.execute(sql`select 1`);
    },
    async createUser(input) {
      return db.transaction(async (tx) => {
        let referredDetailerId: string | null = null;
        if (input.role === "customer" && input.affiliateCode) {
          const [referrer] = await tx
            .select({ userId: detailerProfiles.userId })
            .from(detailerProfiles)
            .innerJoin(users, eq(detailerProfiles.userId, users.id))
            .where(
              and(
                eq(detailerProfiles.affiliateCode, input.affiliateCode),
                eq(detailerProfiles.onboardingStatus, "approved"),
                isNull(users.deletedAt)
              )
            )
            .limit(1);
          if (!referrer) throw new Error("invalid_affiliate_code");
          referredDetailerId = referrer.userId;
        }
        if (input.role === "detailer" && input.invitationTokenHash) {
          const now = new Date();
          const [invitation] = await tx
            .update(detailerInvitations)
            .set({ acceptedAt: now })
            .where(
              and(
                eq(detailerInvitations.tokenHash, input.invitationTokenHash),
                eq(detailerInvitations.email, input.email),
                gt(detailerInvitations.expiresAt, now),
                isNull(detailerInvitations.acceptedAt)
              )
            )
            .returning({ id: detailerInvitations.id });
          if (!invitation) throw new Error("invalid_detailer_invitation");
        }
        const [user] = await tx
          .insert(users)
          .values({
            role: input.role,
            email: input.email,
            name: input.name,
            phone: input.phone,
            passwordHash: input.passwordHash
          })
          .returning();
        if (!user) throw new Error("user_not_created");

        if (input.role === "customer") {
          await tx.insert(customerProfiles).values({
            userId: user.id,
            waterAvailable: input.waterAvailable ?? true,
            affiliateCode: input.affiliateCode || null,
            referredDetailerId
          });
        } else {
          await tx.insert(detailerProfiles).values({
            userId: user.id,
            ownWaterSupply: input.ownWaterSupply ?? false,
            serviceRadiusMiles: input.serviceRadiusMiles ?? 12,
            vatRegistered: input.vatRegistered ?? false,
            vatNumber: input.vatNumber || null,
            instagram: input.instagram || null,
            onboardingComplete: false,
            onboardingStatus: "draft"
          });
        }
        await tx.insert(auditLog).values({
          actorId: user.id,
          action: "account.registered",
          subjectType: "user",
          subjectId: user.id,
          metadata: { role: user.role, beta: true }
        });
        return {
          id: user.id,
          role: user.role,
          email: user.email,
          name: user.name,
          phone: user.phone,
          passwordHash: user.passwordHash,
          emailVerifiedAt: user.emailVerifiedAt
        };
      });
    },
    async createAdmin(input) {
      return db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(users)
          .where(and(eq(users.email, input.email), isNull(users.deletedAt)))
          .limit(1);
        if (existing) {
          if (existing.role !== "admin") {
            throw new Error("email_belongs_to_non_admin");
          }
          return {
            id: existing.id,
            role: existing.role,
            email: existing.email,
            name: existing.name,
            phone: existing.phone,
            passwordHash: existing.passwordHash,
            emailVerifiedAt: existing.emailVerifiedAt
          };
        }

        const now = new Date();
        const [user] = await tx
          .insert(users)
          .values({
            role: "admin",
            email: input.email,
            name: input.name,
            phone: null,
            passwordHash: input.passwordHash,
            emailVerifiedAt: now,
            mfaRequired: true
          })
          .returning();
        if (!user) throw new Error("admin_not_created");
        await tx.insert(auditLog).values({
          actorId: user.id,
          action: "admin.bootstrapped",
          subjectType: "user",
          subjectId: user.id,
          metadata: { mfaRequired: true }
        });
        return {
          id: user.id,
          role: user.role,
          email: user.email,
          name: user.name,
          phone: user.phone,
          passwordHash: user.passwordHash,
          emailVerifiedAt: user.emailVerifiedAt
        };
      });
    },
    async findUserByEmail(email) {
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), isNull(users.deletedAt)))
        .limit(1);
      return user
        ? {
            id: user.id,
            role: user.role,
            email: user.email,
            name: user.name,
            phone: user.phone,
            passwordHash: user.passwordHash,
            emailVerifiedAt: user.emailVerifiedAt
          }
        : null;
    },
    async createAuthToken(input) {
      await db.insert(authTokens).values(input);
    },
    async consumeAuthToken(tokenHash, purpose) {
      return db.transaction(async (tx) => {
        const now = new Date();
        const [token] = await tx
          .update(authTokens)
          .set({ usedAt: now })
          .where(
            and(
              eq(authTokens.tokenHash, tokenHash),
              eq(authTokens.purpose, purpose),
              gt(authTokens.expiresAt, now),
              isNull(authTokens.usedAt)
            )
          )
          .returning({ userId: authTokens.userId });
        if (!token) return null;
        await tx
          .update(authTokens)
          .set({ usedAt: now })
          .where(
            and(
              eq(authTokens.userId, token.userId),
              eq(authTokens.purpose, purpose),
              isNull(authTokens.usedAt)
            )
          );
        const [user] = await tx
          .select()
          .from(users)
          .where(and(eq(users.id, token.userId), isNull(users.deletedAt)))
          .limit(1);
        return user
          ? {
              id: user.id,
              role: user.role,
              email: user.email,
              name: user.name,
              phone: user.phone,
              passwordHash: user.passwordHash,
              emailVerifiedAt: user.emailVerifiedAt
            }
          : null;
      });
    },
    async verifyEmail(tokenHash) {
      return db.transaction(async (tx) => {
        const now = new Date();
        const [token] = await tx
          .update(authTokens)
          .set({ usedAt: now })
          .where(
            and(
              eq(authTokens.tokenHash, tokenHash),
              eq(authTokens.purpose, "verify_email"),
              gt(authTokens.expiresAt, now),
              isNull(authTokens.usedAt)
            )
          )
          .returning({ userId: authTokens.userId });
        if (!token) return null;
        await tx
          .update(authTokens)
          .set({ usedAt: now })
          .where(
            and(
              eq(authTokens.userId, token.userId),
              eq(authTokens.purpose, "verify_email"),
              isNull(authTokens.usedAt)
            )
          );
        const [user] = await tx
          .update(users)
          .set({ emailVerifiedAt: now, updatedAt: now })
          .where(and(eq(users.id, token.userId), isNull(users.deletedAt)))
          .returning();
        if (!user) return null;
        await tx.insert(auditLog).values({
          actorId: user.id,
          action: "account.email_verified",
          subjectType: "user",
          subjectId: user.id,
          metadata: {}
        });
        return {
          id: user.id,
          role: user.role,
          email: user.email,
          name: user.name,
          phone: user.phone,
          passwordHash: user.passwordHash,
          emailVerifiedAt: user.emailVerifiedAt
        };
      });
    },
    async resetPassword(tokenHash, passwordHash) {
      return db.transaction(async (tx) => {
        const now = new Date();
        const [token] = await tx
          .update(authTokens)
          .set({ usedAt: now })
          .where(
            and(
              eq(authTokens.tokenHash, tokenHash),
              eq(authTokens.purpose, "reset_password"),
              gt(authTokens.expiresAt, now),
              isNull(authTokens.usedAt)
            )
          )
          .returning({ userId: authTokens.userId });
        if (!token) return false;
        await tx
          .update(authTokens)
          .set({ usedAt: now })
          .where(
            and(
              eq(authTokens.userId, token.userId),
              eq(authTokens.purpose, "reset_password"),
              isNull(authTokens.usedAt)
            )
          );
        const [user] = await tx
          .update(users)
          .set({ passwordHash, updatedAt: now })
          .where(and(eq(users.id, token.userId), isNull(users.deletedAt)))
          .returning({ id: users.id });
        if (!user) return false;
        await tx
          .update(sessions)
          .set({ revokedAt: now })
          .where(and(eq(sessions.userId, user.id), isNull(sessions.revokedAt)));
        await tx.insert(auditLog).values({
          actorId: user.id,
          action: "account.password_reset",
          subjectType: "user",
          subjectId: user.id,
          metadata: {}
        });
        return true;
      });
    },
    async approveDetailerByEmail(email, operator) {
      return db.transaction(async (tx) => {
        const [detailer] = await tx
          .select({
            id: users.id,
            emailVerifiedAt: users.emailVerifiedAt
          })
          .from(users)
          .innerJoin(
            detailerProfiles,
            eq(detailerProfiles.userId, users.id)
          )
          .where(
            and(
              eq(users.email, email),
              eq(users.role, "detailer"),
              isNull(users.deletedAt)
            )
          )
          .limit(1);
        if (!detailer?.emailVerifiedAt) return false;
        const now = new Date();
        await tx
          .update(detailerProfiles)
          .set({
            approvedAt: now,
            reviewedAt: now,
            onboardingComplete: true,
            onboardingStatus: "approved",
            updatedAt: now
          })
          .where(eq(detailerProfiles.userId, detailer.id));
        await tx.insert(auditLog).values({
          actorId: null,
          action: "detailer.approved_by_operator",
          subjectType: "user",
          subjectId: detailer.id,
          metadata: { operator, source: "server_cli" }
        });
        return true;
      });
    },
    async createDetailerInvitation(input) {
      const [invitation] = await db
        .insert(detailerInvitations)
        .values(input)
        .returning();
      if (!invitation) throw new Error("detailer_invitation_not_created");
      await db.insert(auditLog).values({
        actorId: input.invitedBy,
        action: "detailer.invited",
        subjectType: "detailer_invitation",
        subjectId: invitation.id,
        metadata: { email: input.email, expiresAt: input.expiresAt.toISOString() }
      });
      return {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt.toISOString()
      };
    },
    getDetailerOnboarding: onboardingView,
    async updateDetailerOnboarding(detailerId, input) {
      const [profile] = await db
        .select({ status: detailerProfiles.onboardingStatus })
        .from(detailerProfiles)
        .where(eq(detailerProfiles.userId, detailerId))
        .limit(1);
      if (!profile || profile.status === "approved" || profile.status === "submitted") {
        return null;
      }
      const now = new Date();
      await db
        .update(detailerProfiles)
        .set({
          businessName: input.businessName,
          tradingAddress: input.tradingAddress,
          operatingPostcode: input.operatingPostcode,
          experienceYears: input.experienceYears,
          ownWaterSupply: input.ownWaterSupply,
          serviceRadiusMiles: input.serviceRadiusMiles,
          vatRegistered: input.vatRegistered,
          vatNumber: input.vatRegistered ? input.vatNumber || null : null,
          instagram: input.instagram || null,
          rightToWorkDeclared: input.rightToWorkDeclared,
          termsAcceptedAt: input.termsAccepted ? now : null,
          onboardingStatus: "draft",
          reviewNotes: null,
          updatedAt: now
        })
        .where(eq(detailerProfiles.userId, detailerId));
      await db.insert(auditLog).values({
        actorId: detailerId,
        action: "detailer.onboarding_updated",
        subjectType: "user",
        subjectId: detailerId,
        metadata: {}
      });
      return onboardingView(detailerId);
    },
    async addDetailerDocument(input) {
      const [profile] = await db
        .select({ status: detailerProfiles.onboardingStatus })
        .from(detailerProfiles)
        .where(eq(detailerProfiles.userId, input.detailerId))
        .limit(1);
      if (!profile || profile.status === "approved" || profile.status === "submitted") {
        throw new Error("detailer_onboarding_locked");
      }
      const [document] = await db
        .insert(detailerDocuments)
        .values({ ...input, status: "pending" })
        .returning();
      if (!document) throw new Error("detailer_document_not_created");
      await db.insert(auditLog).values({
        actorId: input.detailerId,
        action: "detailer.document_uploaded",
        subjectType: "detailer_document",
        subjectId: document.id,
        metadata: {
          type: document.type,
          sizeBytes: document.sizeBytes,
          sha256: document.sha256
        }
      });
      return {
        id: document.id,
        type: document.type,
        status: document.status,
        originalName: document.originalName,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        expiresAt: document.expiresAt?.toISOString() ?? null,
        uploadedAt: document.uploadedAt.toISOString(),
        reviewNotes: document.reviewNotes
      };
    },
    async submitDetailerOnboarding(detailerId) {
      const submitted = await db.transaction(async (tx) => {
        const [profile] = await tx
          .select()
          .from(detailerProfiles)
          .where(eq(detailerProfiles.userId, detailerId))
          .limit(1);
        if (!profile || !["draft", "changes_requested"].includes(profile.onboardingStatus)) {
          return null;
        }
        const documents = await tx
          .select({ type: detailerDocuments.type, status: detailerDocuments.status })
          .from(detailerDocuments)
          .where(eq(detailerDocuments.detailerId, detailerId));
        const types = new Set(
          documents.filter(({ status }) => status !== "rejected").map(({ type }) => type)
        );
        const complete =
          Boolean(profile.businessName && profile.tradingAddress && profile.operatingPostcode) &&
          profile.experienceYears !== null &&
          profile.rightToWorkDeclared &&
          profile.termsAcceptedAt !== null &&
          (!profile.vatRegistered || Boolean(profile.vatNumber)) &&
          ["identity", "public_liability_insurance", "motor_insurance"].every((type) =>
            types.has(type as DetailerDocumentType)
          );
        if (!complete) throw new Error("detailer_onboarding_incomplete");
        const now = new Date();
        await tx
          .update(detailerProfiles)
          .set({ onboardingStatus: "submitted", submittedAt: now, reviewNotes: null, updatedAt: now })
          .where(eq(detailerProfiles.userId, detailerId));
        await tx.insert(auditLog).values({
          actorId: detailerId,
          action: "detailer.onboarding_submitted",
          subjectType: "user",
          subjectId: detailerId,
          metadata: {}
        });
        return true;
      });
      return submitted ? onboardingView(detailerId) : null;
    },
    async listAdminDetailers() {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.role, "detailer"),
            isNull(users.deletedAt),
            notLike(users.email, "%@staging.valx.invalid")
          )
        )
        .orderBy(desc(users.createdAt));
      return (await Promise.all(rows.map(({ id }) => onboardingView(id)))).filter(
        (item): item is DetailerOnboardingView => item !== null
      );
    },
    async reviewDetailerOnboarding(input) {
      const reviewed = await db.transaction(async (tx) => {
        const [profile] = await tx
          .select({ status: detailerProfiles.onboardingStatus })
          .from(detailerProfiles)
          .where(eq(detailerProfiles.userId, input.detailerId))
          .limit(1);
        if (!profile || profile.status !== "submitted") return null;
        const now = new Date();
        const approved = input.decision === "approved";
        await tx
          .update(detailerProfiles)
          .set({
            onboardingStatus: input.decision,
            onboardingComplete: approved,
            approvedAt: approved ? now : null,
            reviewedAt: now,
            reviewedBy: input.adminId,
            reviewNotes: input.notes,
            updatedAt: now
          })
          .where(eq(detailerProfiles.userId, input.detailerId));
        await tx
          .update(detailerDocuments)
          .set({
            status: approved ? "approved" : "rejected",
            reviewedAt: now,
            reviewedBy: input.adminId,
            reviewNotes: input.notes
          })
          .where(eq(detailerDocuments.detailerId, input.detailerId));
        await tx.insert(auditLog).values({
          actorId: input.adminId,
          action: `detailer.onboarding_${input.decision}`,
          subjectType: "user",
          subjectId: input.detailerId,
          metadata: { notes: input.notes }
        });
        return true;
      });
      return reviewed ? onboardingView(input.detailerId) : null;
    },
    async findDetailerDocumentForAdmin(documentId) {
      const [document] = await db
        .select({
          storageKey: detailerDocuments.storageKey,
          originalName: detailerDocuments.originalName,
          mimeType: detailerDocuments.mimeType
        })
        .from(detailerDocuments)
        .where(eq(detailerDocuments.id, documentId))
        .limit(1);
      return document ?? null;
    },
    async getDetailerRewards(detailerId) {
      return detailerRewardsView(detailerId);
    },
    async setDetailerAffiliateCode(detailerId, code) {
      const [profile] = await db
        .select({
          affiliateCode: detailerProfiles.affiliateCode,
          status: detailerProfiles.onboardingStatus
        })
        .from(detailerProfiles)
        .where(eq(detailerProfiles.userId, detailerId))
        .limit(1);
      if (!profile || profile.status !== "approved") return null;
      if (profile.affiliateCode === code) return detailerRewardsView(detailerId);
      if (profile.affiliateCode) throw new Error("affiliate_code_locked");
      try {
        const [updated] = await db
          .update(detailerProfiles)
          .set({ affiliateCode: code, updatedAt: new Date() })
          .where(
            and(
              eq(detailerProfiles.userId, detailerId),
              eq(detailerProfiles.onboardingStatus, "approved"),
              isNull(detailerProfiles.affiliateCode)
            )
          )
          .returning({ userId: detailerProfiles.userId });
        if (!updated) throw new Error("affiliate_code_locked");
        await db.insert(auditLog).values({
          actorId: detailerId,
          action: "affiliate.code_created",
          subjectType: "detailer",
          subjectId: detailerId,
          metadata: { code }
        });
        return detailerRewardsView(detailerId);
      } catch (error) {
        if (error instanceof Error && error.message === "affiliate_code_locked") {
          throw error;
        }
        throw new Error("affiliate_code_unavailable");
      }
    },
    async getAdminDashboard() {
      const realAccount = notLike(users.email, "%@staging.valx.invalid");
      const customerRows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          createdAt: users.createdAt
        })
        .from(users)
        .where(
          and(
            eq(users.role, "customer"),
            isNull(users.deletedAt),
            realAccount
          )
        )
        .orderBy(desc(users.createdAt));
      const vehicleCounts = await db
        .select({
          customerId: vehicles.customerId,
          count: sql<number>`count(*)::int`
        })
        .from(vehicles)
        .groupBy(vehicles.customerId);
      const bookingCounts = await db
        .select({
          customerId: bookings.customerId,
          count: sql<number>`count(*)::int`
        })
        .from(bookings)
        .groupBy(bookings.customerId);
      const vehicleCountByCustomer = new Map(
        vehicleCounts.map(({ customerId, count }) => [customerId, numberValue(count)])
      );
      const bookingCountByCustomer = new Map(
        bookingCounts.map(({ customerId, count }) => [customerId, numberValue(count)])
      );

      const bookingRows = await db
        .select({
          id: bookings.id,
          status: bookings.status,
          customerTotal: quotes.customerTotal,
          detailerEarnings: quotes.detailerEarnings,
          paymentState: bookings.paymentState
        })
        .from(bookings)
        .innerJoin(quotes, eq(bookings.quoteId, quotes.id))
        .innerJoin(users, eq(bookings.customerId, users.id))
        .where(realAccount)
        .orderBy(desc(bookings.createdAt));
      const bookingViews = (
        await Promise.all(bookingRows.map(({ id }) => bookingView(id)))
      ).filter((item): item is BookingView => item !== null);

      const detailerRows = await db
        .select({ approvedAt: detailerProfiles.approvedAt })
        .from(detailerProfiles)
        .innerJoin(users, eq(detailerProfiles.userId, users.id))
        .where(and(isNull(users.deletedAt), realAccount));
      const supportRows = await db
        .select({
          id: supportRequests.id,
          userEmail: users.email,
          category: supportRequests.category,
          message: supportRequests.message,
          status: supportRequests.status,
          createdAt: supportRequests.createdAt
        })
        .from(supportRequests)
        .leftJoin(users, eq(supportRequests.userId, users.id))
        .where(or(isNull(users.email), realAccount))
        .orderBy(desc(supportRequests.createdAt));
      const deletionRows = await db
        .select({
          id: accountDeletionRequests.id,
          userEmail: users.email,
          status: accountDeletionRequests.status,
          reason: accountDeletionRequests.reason,
          requestedAt: accountDeletionRequests.requestedAt
        })
        .from(accountDeletionRequests)
        .leftJoin(users, eq(accountDeletionRequests.userId, users.id))
        .where(or(isNull(users.email), realAccount))
        .orderBy(desc(accountDeletionRequests.requestedAt));
      const adminRows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          mfaRequired: users.mfaRequired,
          createdAt: users.createdAt
        })
        .from(users)
        .where(and(eq(users.role, "admin"), isNull(users.deletedAt)))
        .orderBy(users.createdAt);
      const auditRows = await db
        .select({
          id: auditLog.id,
          actorEmail: users.email,
          action: auditLog.action,
          subjectType: auditLog.subjectType,
          subjectId: auditLog.subjectId,
          metadata: auditLog.metadata,
          createdAt: auditLog.createdAt
        })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.actorId, users.id))
        .where(or(isNull(users.email), realAccount))
        .orderBy(desc(auditLog.createdAt))
        .limit(100);
      const rewardRows = await db
        .select()
        .from(affiliatePointLedger)
        .orderBy(desc(affiliatePointLedger.createdAt))
        .limit(100);
      const affiliatePoints = (
        await Promise.all(
          rewardRows.map(async (entry) => {
            const [detailer] = await db
              .select({ name: users.name, email: users.email })
              .from(users)
              .where(eq(users.id, entry.detailerId))
              .limit(1);
            const [customer] = await db
              .select({ name: users.name, email: users.email })
              .from(users)
              .where(eq(users.id, entry.customerId))
              .limit(1);
            if (!detailer || !customer) return null;
            return {
              id: entry.id,
              detailerId: entry.detailerId,
              detailerName: detailer.name,
              detailerEmail: detailer.email,
              customerId: entry.customerId,
              customerName: customer.name,
              customerEmail: customer.email,
              bookingId: entry.bookingId,
              points: entry.points,
              reason: "first_referred_booking_completed" as const,
              createdAt: entry.createdAt.toISOString()
            };
          })
        )
      ).filter(
        (entry): entry is AffiliatePointEntry =>
          entry !== null &&
          !entry.detailerEmail.endsWith("@staging.valx.invalid") &&
          !entry.customerEmail.endsWith("@staging.valx.invalid")
      );

      const activeStatuses = new Set([
        "confirmed",
        "assigned",
        "on_way",
        "arrived",
        "in_progress"
      ]);
      const countedBookings = bookingRows.filter(
        ({ status }) => status !== "cancelled"
      );
      const bookingRequestValue = countedBookings.reduce(
        (total, row) => total + numberValue(row.customerTotal),
        0
      );
      const projectedDetailerCost = countedBookings.reduce(
        (total, row) => total + numberValue(row.detailerEarnings),
        0
      );

      return {
        generatedAt: new Date().toISOString(),
        paymentsConnected: false as const,
        metrics: {
          customers: customerRows.length,
          detailers: detailerRows.length,
          approvedDetailers: detailerRows.filter(({ approvedAt }) => approvedAt !== null).length,
          bookings: bookingRows.length,
          activeBookings: bookingRows.filter(({ status }) => activeStatuses.has(status)).length,
          completedBookings: bookingRows.filter(({ status }) => status === "completed").length,
          bookingRequestValue,
          projectedDetailerCost,
          projectedContribution: bookingRequestValue - projectedDetailerCost,
          capturedPayments: 0,
          paidPayouts: 0,
          openSupportRequests: supportRows.filter(({ status }) => status === "open").length,
          pendingDeletionRequests: deletionRows.filter(({ status }) =>
            status === "requested" || status === "processing"
          ).length,
          affiliatePointsAwarded: affiliatePoints.reduce(
            (total, entry) => total + entry.points,
            0
          )
        },
        customers: customerRows.map((customer) => ({
          ...customer,
          vehicleCount: vehicleCountByCustomer.get(customer.id) ?? 0,
          bookingCount: bookingCountByCustomer.get(customer.id) ?? 0,
          createdAt: customer.createdAt.toISOString()
        })),
        bookings: bookingViews,
        supportRequests: supportRows.map((request) => ({
          ...request,
          createdAt: request.createdAt.toISOString()
        })),
        deletionRequests: deletionRows.map((request) => ({
          ...request,
          requestedAt: request.requestedAt.toISOString()
        })),
        admins: adminRows.map((admin) => ({
          ...admin,
          createdAt: admin.createdAt.toISOString()
        })),
        audit: auditRows.map((entry) => ({
          ...entry,
          createdAt: entry.createdAt.toISOString()
        })),
        affiliatePoints
      };
    },
    async createSession(userId, tokenHash, expiresAt) {
      await db.insert(sessions).values({ userId, tokenHash, expiresAt });
    },
    async authenticateSession(tokenHash) {
      const [row] = await db
        .select({ user: users, sessionId: sessions.id })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(
          and(
            eq(sessions.tokenHash, tokenHash),
            gt(sessions.expiresAt, new Date()),
            isNull(sessions.revokedAt),
            isNull(users.deletedAt)
          )
        )
        .limit(1);
      if (!row) return null;
      await db
        .update(sessions)
        .set({ lastSeenAt: new Date() })
        .where(eq(sessions.id, row.sessionId));
      return {
        id: row.user.id,
        role: row.user.role,
        email: row.user.email,
        name: row.user.name,
        phone: row.user.phone,
        passwordHash: row.user.passwordHash,
        emailVerifiedAt: row.user.emailVerifiedAt
      };
    },
    async revokeSession(tokenHash) {
      await db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(eq(sessions.tokenHash, tokenHash));
    },
    async addVehicle(input) {
      const [vehicle] = await db.insert(vehicles).values(input).returning();
      if (!vehicle) throw new Error("vehicle_not_created");
      return { id: vehicle.id };
    },
    async listCustomerVehicles(customerId) {
      return db
        .select({
          id: vehicles.id,
          registrationNumber: vehicles.registrationNumber,
          make: vehicles.make,
          model: vehicles.model,
          type: vehicles.type
        })
        .from(vehicles)
        .where(eq(vehicles.customerId, customerId))
        .orderBy(desc(vehicles.createdAt));
    },
    async addAddress(input) {
      const [address] = await db
        .insert(addresses)
        .values({
          ...input,
          latitude:
            input.latitude === undefined ? null : String(input.latitude),
          longitude:
            input.longitude === undefined ? null : String(input.longitude)
        })
        .returning();
      if (!address) throw new Error("address_not_created");
      return { id: address.id };
    },
    async listCustomerAddresses(customerId) {
      return db
        .select({
          id: addresses.id,
          label: addresses.label,
          postcode: addresses.postcode,
          waterAvailable: addresses.waterAvailable
        })
        .from(addresses)
        .where(eq(addresses.customerId, customerId))
        .orderBy(desc(addresses.createdAt));
    },
    async isCustomerAffiliateFirstBookingEligible(customerId) {
      const [profile] = await db
        .select({ referredDetailerId: customerProfiles.referredDetailerId })
        .from(customerProfiles)
        .where(eq(customerProfiles.userId, customerId))
        .limit(1);
      if (!profile?.referredDetailerId) return false;
      const [existing] = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.customerId, customerId),
            sql`${bookings.status} <> 'cancelled'`
          )
        )
        .limit(1);
      return !existing;
    },
    async saveQuote(input) {
      const [quote] = await db
        .insert(quotes)
        .values({
          customerId: input.customerId,
          serviceId: input.serviceId,
          vehicleType: input.vehicleType,
          distanceMiles: String(input.distanceMiles),
          predictedMinutes: input.quote.predictedMinutes,
          breakdown: input.quote,
          jobPrice: String(input.quote.jobPrice),
          serviceFee: String(input.quote.serviceFee),
          customerTotal: String(input.quote.customerTotal),
          detailerEarnings: String(input.quote.detailerEarnings),
          expiresAt: input.expiresAt
        })
        .returning();
      if (!quote) throw new Error("quote_not_created");
      return { id: quote.id, expiresAt: quote.expiresAt.toISOString() };
    },
    async createBooking(input) {
      const [existing] = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.quoteId, input.quoteId),
            eq(bookings.customerId, input.customerId)
          )
        )
        .limit(1);
      if (existing) {
        const view = await bookingView(existing.id);
        if (!view) throw new Error("booking_not_found");
        return view;
      }
      const [ownedVehicle] = await db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.id, input.vehicleId),
            eq(vehicles.customerId, input.customerId)
          )
        );
      const [ownedAddress] = await db
        .select({ id: addresses.id })
        .from(addresses)
        .where(
          and(
            eq(addresses.id, input.addressId),
            eq(addresses.customerId, input.customerId)
          )
        );
      const [ownedQuote] = await db
        .select({ id: quotes.id, expiresAt: quotes.expiresAt })
        .from(quotes)
        .where(
          and(
            eq(quotes.id, input.quoteId),
            eq(quotes.customerId, input.customerId),
            gt(quotes.expiresAt, new Date())
          )
        );
      if (!ownedVehicle || !ownedAddress || !ownedQuote) {
        throw new Error("booking_reference_invalid");
      }
      const [booking] = await db
        .insert(bookings)
        .values({
          customerId: input.customerId,
          vehicleId: input.vehicleId,
          addressId: input.addressId,
          quoteId: input.quoteId,
          bookingType: input.bookingType,
          scheduledFor: input.scheduledFor,
          status: "confirmed",
          paymentState: "not_connected"
        })
        .onConflictDoNothing({ target: bookings.quoteId })
        .returning();
      if (!booking) {
        const [concurrent] = await db
          .select({ id: bookings.id })
          .from(bookings)
          .where(eq(bookings.quoteId, input.quoteId))
          .limit(1);
        if (!concurrent) throw new Error("booking_not_created");
        const concurrentView = await bookingView(concurrent.id);
        if (!concurrentView) throw new Error("booking_not_found");
        return concurrentView;
      }
      await db.insert(auditLog).values({
        actorId: input.customerId,
        action: "booking.confirmed_without_payment",
        subjectType: "booking",
        subjectId: booking.id,
        metadata: { bookingType: input.bookingType }
      });
      const view = await bookingView(booking.id);
      if (!view) throw new Error("booking_not_found");
      return view;
    },
    listCustomerBookings: (customerId) =>
      bookingList(eq(bookings.customerId, customerId)),
    async listDetailerOffers(detailerId) {
      const [profile] = await db
        .select()
        .from(detailerProfiles)
        .where(eq(detailerProfiles.userId, detailerId))
        .limit(1);
      if (!profile || !profile.onboardingComplete || !profile.approvedAt) {
        return [];
      }
      const rows = await db
        .select({
          id: bookings.id,
          waterAvailable: addresses.waterAvailable
        })
        .from(bookings)
        .innerJoin(addresses, eq(bookings.addressId, addresses.id))
        .where(
          and(
            eq(bookings.status, "confirmed"),
            isNull(bookings.detailerId)
          )
        )
        .orderBy(desc(bookings.createdAt));
      const eligible = rows.filter(
        (row) => row.waterAvailable !== false || profile.ownWaterSupply
      );
      return (
        await Promise.all(eligible.map(({ id }) => bookingView(id)))
      ).filter((item) => item !== null);
    },
    listDetailerBookings: (detailerId) =>
      bookingList(eq(bookings.detailerId, detailerId)),
    async acceptBooking(bookingId, detailerId) {
      const [eligibility] = await db
        .select({
          ownWaterSupply: detailerProfiles.ownWaterSupply,
          onboardingComplete: detailerProfiles.onboardingComplete,
          approvedAt: detailerProfiles.approvedAt,
          waterAvailable: addresses.waterAvailable
        })
        .from(detailerProfiles)
        .innerJoin(bookings, eq(bookings.id, bookingId))
        .innerJoin(addresses, eq(bookings.addressId, addresses.id))
        .where(eq(detailerProfiles.userId, detailerId))
        .limit(1);
      if (
        !eligibility ||
        !eligibility.onboardingComplete ||
        !eligibility.approvedAt ||
        (eligibility.waterAvailable === false &&
          !eligibility.ownWaterSupply)
      ) {
        return null;
      }
      const [assigned] = await db
        .update(bookings)
        .set({
          detailerId,
          status: "assigned",
          updatedAt: new Date()
        })
        .where(
          and(
            eq(bookings.id, bookingId),
            eq(bookings.status, "confirmed"),
            isNull(bookings.detailerId)
          )
        )
        .returning({ id: bookings.id });
      if (!assigned) return null;
      await db.insert(auditLog).values({
        actorId: detailerId,
        action: "booking.accepted",
        subjectType: "booking",
        subjectId: bookingId,
        metadata: {}
      });
      return bookingView(bookingId);
    },
    async updateBookingStatus(bookingId, detailerId, status) {
      const now = new Date();
      const updated = await db.transaction(async (tx) => {
        const [booking] = await tx
          .update(bookings)
          .set({
            status,
            arrivedAt: status === "arrived" ? now : undefined,
            completedAt: status === "completed" ? now : undefined,
            updatedAt: now
          })
          .where(
            and(
              eq(bookings.id, bookingId),
              eq(bookings.detailerId, detailerId)
            )
          )
          .returning({ id: bookings.id, customerId: bookings.customerId });
        if (!booking) return null;

        await tx.insert(auditLog).values({
          actorId: detailerId,
          action: `booking.${status}`,
          subjectType: "booking",
          subjectId: bookingId,
          metadata: {}
        });
        if (status === "completed") {
          const [referral] = await tx
            .select({ detailerId: customerProfiles.referredDetailerId })
            .from(customerProfiles)
            .where(eq(customerProfiles.userId, booking.customerId))
            .limit(1);
          if (referral?.detailerId) {
            const [award] = await tx
              .insert(affiliatePointLedger)
              .values({
                detailerId: referral.detailerId,
                customerId: booking.customerId,
                bookingId,
                points: 10,
                reason: "first_referred_booking_completed"
              })
              .onConflictDoNothing({ target: affiliatePointLedger.customerId })
              .returning({ id: affiliatePointLedger.id });
            if (award) {
              await tx.insert(auditLog).values({
                actorId: detailerId,
                action: "affiliate.points_awarded",
                subjectType: "affiliate_point_ledger",
                subjectId: award.id,
                metadata: {
                  awardedDetailerId: referral.detailerId,
                  customerId: booking.customerId,
                  bookingId,
                  points: 10
                }
              });
            }
          }
        }
        return booking;
      });
      if (!updated) return null;
      return bookingView(bookingId);
    },
    async createSupportRequest(userId, category, message) {
      const [request] = await db
        .insert(supportRequests)
        .values({ userId, category, message })
        .returning({ id: supportRequests.id });
      if (!request) throw new Error("support_request_not_created");
      return request;
    },
    async requestAccountDeletion(userId, reason) {
      return db.transaction(async (tx) => {
        const [request] = await tx
          .insert(accountDeletionRequests)
          .values({ userId, reason })
          .returning({
            id: accountDeletionRequests.id,
            status: accountDeletionRequests.status
          });
        if (!request) throw new Error("deletion_request_not_created");
        await tx
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(eq(sessions.userId, userId));
        await tx
          .update(users)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(users.id, userId));
        await tx.insert(auditLog).values({
          actorId: userId,
          action: "account.deletion_requested",
          subjectType: "user",
          subjectId: userId,
          metadata: {}
        });
        return request;
      });
    }
  };
};

type MemoryUser = UserRecord & {
  detailerApproved: boolean;
  ownWaterSupply?: boolean;
};
type MemoryQuote = {
  id: string;
  customerId: string;
  serviceId: ServiceId;
  vehicleType: VehicleType;
  quote: Quote;
  expiresAt: Date;
};
type MemoryVehicle = {
  id: string;
  customerId: string;
  registrationNumber: string;
  make: string;
  model?: string;
  type: VehicleType;
};
type MemoryAddress = {
  id: string;
  customerId: string;
  label: string;
  postcode: string;
  waterAvailable: boolean;
};

export const createMemoryRepository = (): ValxRepository => {
  const memoryUsers = new Map<string, MemoryUser>();
  const sessionTokens = new Map<
    string,
    { userId: string; expiresAt: Date; revoked: boolean }
  >();
  const oneTimeTokens = new Map<
    string,
    {
      userId: string;
      purpose: AuthTokenPurpose;
      expiresAt: Date;
      used: boolean;
    }
  >();
  const memoryVehicles = new Map<string, MemoryVehicle>();
  const memoryAddresses = new Map<string, MemoryAddress>();
  const memoryQuotes = new Map<string, MemoryQuote>();
  const memoryBookings = new Map<
    string,
    BookingView & {
      customerId: string;
      detailerId: string | null;
      quoteId: string;
    }
  >();
  const memoryInvitations = new Map<
    string,
    { id: string; email: string; invitedBy: string; expiresAt: Date; accepted: boolean }
  >();
  const memoryOnboarding = new Map<string, DetailerOnboardingView>();
  const memoryDocumentStorage = new Map<
    string,
    { storageKey: string; originalName: string; mimeType: string }
  >();
  const memoryAffiliateCodes = new Map<string, string>();
  const memoryCustomerReferrals = new Map<string, string>();
  const memoryAffiliatePoints: AffiliatePointEntry[] = [];
  const memoryRewardsView = (detailerId: string): DetailerRewardsView | null => {
    const detailer = memoryUsers.get(detailerId);
    if (!detailer?.detailerApproved) return null;
    const ledger = memoryAffiliatePoints.filter(
      (entry) => entry.detailerId === detailerId
    );
    return {
      affiliateCode: memoryAffiliateCodes.get(detailerId) ?? null,
      pointsBalance: ledger.reduce((total, entry) => total + entry.points, 0),
      pointsPerFirstBooking: 10,
      suppliesStatus: "tbc",
      supplies: [],
      ledger
    };
  };

  return {
    async close() {},
    async healthcheck() {},
    async createUser(input) {
      if ([...memoryUsers.values()].some((user) => user.email === input.email)) {
        throw new Error("user_exists");
      }
      if (input.role === "detailer" && input.invitationTokenHash) {
        const invitation = memoryInvitations.get(input.invitationTokenHash);
        if (
          !invitation ||
          invitation.accepted ||
          invitation.email !== input.email ||
          invitation.expiresAt <= new Date()
        ) {
          throw new Error("invalid_detailer_invitation");
        }
        invitation.accepted = true;
      }
      let referredDetailerId: string | null = null;
      if (input.role === "customer" && input.affiliateCode) {
        referredDetailerId =
          [...memoryAffiliateCodes.entries()].find(
            ([detailerId, code]) =>
              code === input.affiliateCode &&
              memoryUsers.get(detailerId)?.detailerApproved
          )?.[0] ?? null;
        if (!referredDetailerId) throw new Error("invalid_affiliate_code");
      }
      const user: MemoryUser = {
        ...input,
        id: randomUUID(),
        phone: input.phone,
        emailVerifiedAt: null,
        detailerApproved: input.role === "customer"
      };
      memoryUsers.set(user.id, user);
      if (referredDetailerId) {
        memoryCustomerReferrals.set(user.id, referredDetailerId);
      }
      if (user.role === "detailer") {
        memoryOnboarding.set(user.id, {
          userId: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          businessName: null,
          tradingAddress: null,
          operatingPostcode: null,
          experienceYears: null,
          ownWaterSupply: input.ownWaterSupply ?? false,
          serviceRadiusMiles: input.serviceRadiusMiles ?? 12,
          vatRegistered: input.vatRegistered ?? false,
          vatNumber: input.vatNumber ?? null,
          instagram: input.instagram ?? null,
          rightToWorkDeclared: false,
          termsAccepted: false,
          status: "draft",
          submittedAt: null,
          approvedAt: null,
          reviewNotes: null,
          documents: []
        });
      }
      return user;
    },
    async createAdmin(input) {
      const existing = [...memoryUsers.values()].find(
        (user) => user.email === input.email
      );
      if (existing) {
        if (existing.role !== "admin") {
          throw new Error("email_belongs_to_non_admin");
        }
        return existing;
      }
      const user: MemoryUser = {
        id: randomUUID(),
        role: "admin",
        email: input.email,
        name: input.name,
        phone: null,
        passwordHash: input.passwordHash,
        emailVerifiedAt: new Date(),
        detailerApproved: false
      };
      memoryUsers.set(user.id, user);
      return user;
    },
    async findUserByEmail(email) {
      return (
        [...memoryUsers.values()].find((user) => user.email === email) ?? null
      );
    },
    async createAuthToken(input) {
      oneTimeTokens.set(input.tokenHash, {
        userId: input.userId,
        purpose: input.purpose,
        expiresAt: input.expiresAt,
        used: false
      });
    },
    async consumeAuthToken(tokenHash, purpose) {
      const token = oneTimeTokens.get(tokenHash);
      if (
        !token ||
        token.used ||
        token.purpose !== purpose ||
        token.expiresAt <= new Date()
      ) {
        return null;
      }
      token.used = true;
      for (const candidate of oneTimeTokens.values()) {
        if (candidate.userId === token.userId && candidate.purpose === purpose) {
          candidate.used = true;
        }
      }
      return memoryUsers.get(token.userId) ?? null;
    },
    async verifyEmail(tokenHash) {
      const token = oneTimeTokens.get(tokenHash);
      if (
        !token ||
        token.used ||
        token.purpose !== "verify_email" ||
        token.expiresAt <= new Date()
      ) {
        return null;
      }
      token.used = true;
      for (const candidate of oneTimeTokens.values()) {
        if (
          candidate.userId === token.userId &&
          candidate.purpose === "verify_email"
        ) {
          candidate.used = true;
        }
      }
      const user = memoryUsers.get(token.userId);
      if (!user) return null;
      user.emailVerifiedAt = new Date();
      return user;
    },
    async resetPassword(tokenHash, passwordHash) {
      const token = oneTimeTokens.get(tokenHash);
      if (
        !token ||
        token.used ||
        token.purpose !== "reset_password" ||
        token.expiresAt <= new Date()
      ) {
        return false;
      }
      token.used = true;
      for (const candidate of oneTimeTokens.values()) {
        if (
          candidate.userId === token.userId &&
          candidate.purpose === "reset_password"
        ) {
          candidate.used = true;
        }
      }
      const user = memoryUsers.get(token.userId);
      if (!user) return false;
      user.passwordHash = passwordHash;
      for (const session of sessionTokens.values()) {
        if (session.userId === user.id) session.revoked = true;
      }
      return true;
    },
    async approveDetailerByEmail(email) {
      const detailer = [...memoryUsers.values()].find(
        (user) => user.email === email && user.role === "detailer"
      );
      if (!detailer?.emailVerifiedAt) return false;
      detailer.detailerApproved = true;
      const onboarding = memoryOnboarding.get(detailer.id);
      if (onboarding) {
        onboarding.status = "approved";
        onboarding.approvedAt = new Date().toISOString();
      }
      return true;
    },
    async createDetailerInvitation(input) {
      const invitation = {
        id: randomUUID(),
        email: input.email,
        invitedBy: input.invitedBy,
        expiresAt: input.expiresAt,
        accepted: false
      };
      memoryInvitations.set(input.tokenHash, invitation);
      return {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt.toISOString()
      };
    },
    async getDetailerOnboarding(detailerId) {
      return memoryOnboarding.get(detailerId) ?? null;
    },
    async updateDetailerOnboarding(detailerId, input) {
      const profile = memoryOnboarding.get(detailerId);
      if (!profile || profile.status === "approved" || profile.status === "submitted") return null;
      Object.assign(profile, {
        ...input,
        vatNumber: input.vatRegistered ? input.vatNumber ?? null : null,
        instagram: input.instagram ?? null,
        termsAccepted: input.termsAccepted,
        status: "draft" as const,
        reviewNotes: null
      });
      return profile;
    },
    async addDetailerDocument(input) {
      const profile = memoryOnboarding.get(input.detailerId);
      if (!profile || profile.status === "approved" || profile.status === "submitted") {
        throw new Error("detailer_onboarding_locked");
      }
      const document: DetailerDocumentView = {
        id: randomUUID(),
        type: input.type,
        status: "pending",
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        expiresAt: input.expiresAt?.toISOString() ?? null,
        uploadedAt: new Date().toISOString(),
        reviewNotes: null
      };
      profile.documents.unshift(document);
      memoryDocumentStorage.set(document.id, {
        storageKey: input.storageKey,
        originalName: input.originalName,
        mimeType: input.mimeType
      });
      return document;
    },
    async submitDetailerOnboarding(detailerId) {
      const profile = memoryOnboarding.get(detailerId);
      if (!profile || !["draft", "changes_requested"].includes(profile.status)) return null;
      const types = new Set(
        profile.documents.filter(({ status }) => status !== "rejected").map(({ type }) => type)
      );
      const complete = Boolean(
        profile.businessName &&
          profile.tradingAddress &&
          profile.operatingPostcode &&
          profile.experienceYears !== null &&
          profile.rightToWorkDeclared &&
          profile.termsAccepted &&
          (!profile.vatRegistered || profile.vatNumber) &&
          ["identity", "public_liability_insurance", "motor_insurance"].every((type) => types.has(type as DetailerDocumentType))
      );
      if (!complete) throw new Error("detailer_onboarding_incomplete");
      profile.status = "submitted";
      profile.submittedAt = new Date().toISOString();
      return profile;
    },
    async listAdminDetailers() {
      return [...memoryOnboarding.values()].filter(
        ({ email }) => !email.endsWith("@staging.valx.invalid")
      );
    },
    async reviewDetailerOnboarding(input) {
      const profile = memoryOnboarding.get(input.detailerId);
      if (!profile || profile.status !== "submitted") return null;
      profile.status = input.decision;
      profile.reviewNotes = input.notes;
      profile.approvedAt = input.decision === "approved" ? new Date().toISOString() : null;
      profile.documents = profile.documents.map((document) => ({
        ...document,
        status: input.decision === "approved" ? "approved" : "rejected",
        reviewNotes: input.notes
      }));
      const user = memoryUsers.get(input.detailerId);
      if (user) user.detailerApproved = input.decision === "approved";
      return profile;
    },
    async findDetailerDocumentForAdmin(documentId) {
      return memoryDocumentStorage.get(documentId) ?? null;
    },
    async getDetailerRewards(detailerId) {
      return memoryRewardsView(detailerId);
    },
    async setDetailerAffiliateCode(detailerId, code) {
      const detailer = memoryUsers.get(detailerId);
      if (!detailer?.detailerApproved) return null;
      const existing = memoryAffiliateCodes.get(detailerId);
      if (existing === code) return memoryRewardsView(detailerId);
      if (existing) throw new Error("affiliate_code_locked");
      if ([...memoryAffiliateCodes.values()].includes(code)) {
        throw new Error("affiliate_code_unavailable");
      }
      memoryAffiliateCodes.set(detailerId, code);
      return memoryRewardsView(detailerId);
    },
    async getAdminDashboard() {
      const visibleUsers = [...memoryUsers.values()].filter(
        ({ email }) => !email.endsWith("@staging.valx.invalid")
      );
      const customerUsers = visibleUsers.filter(({ role }) => role === "customer");
      const detailerUsers = visibleUsers.filter(({ role }) => role === "detailer");
      const visibleBookings = [...memoryBookings.values()].filter((booking) =>
        customerUsers.some(({ id }) => id === booking.customerId)
      );
      const countedBookings = visibleBookings.filter(({ status }) => status !== "cancelled");
      const bookingRequestValue = countedBookings.reduce(
        (total, booking) => total + booking.customerTotal,
        0
      );
      const projectedDetailerCost = countedBookings.reduce(
        (total, booking) => total + booking.detailerEarnings,
        0
      );
      return {
        generatedAt: new Date().toISOString(),
        paymentsConnected: false as const,
        metrics: {
          customers: customerUsers.length,
          detailers: detailerUsers.length,
          approvedDetailers: detailerUsers.filter(({ detailerApproved }) => detailerApproved).length,
          bookings: visibleBookings.length,
          activeBookings: visibleBookings.filter(({ status }) =>
            ["confirmed", "assigned", "on_way", "arrived", "in_progress"].includes(status)
          ).length,
          completedBookings: visibleBookings.filter(({ status }) => status === "completed").length,
          bookingRequestValue,
          projectedDetailerCost,
          projectedContribution: bookingRequestValue - projectedDetailerCost,
          capturedPayments: 0,
          paidPayouts: 0,
          openSupportRequests: 0,
          pendingDeletionRequests: 0,
          affiliatePointsAwarded: memoryAffiliatePoints.reduce(
            (total, entry) => total + entry.points,
            0
          )
        },
        customers: customerUsers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          vehicleCount: [...memoryVehicles.values()].filter(({ customerId }) => customerId === customer.id).length,
          bookingCount: visibleBookings.filter(({ customerId }) => customerId === customer.id).length,
          createdAt: new Date().toISOString()
        })),
        bookings: visibleBookings,
        supportRequests: [],
        deletionRequests: [],
        admins: visibleUsers
          .filter(({ role }) => role === "admin")
          .map((admin) => ({
            id: admin.id,
            name: admin.name,
            email: admin.email,
            mfaRequired: true,
            createdAt: new Date().toISOString()
          })),
        audit: [],
        affiliatePoints: memoryAffiliatePoints
      };
    },
    async createSession(userId, tokenHash, expiresAt) {
      sessionTokens.set(tokenHash, { userId, expiresAt, revoked: false });
    },
    async authenticateSession(tokenHash) {
      const session = sessionTokens.get(tokenHash);
      if (!session || session.revoked || session.expiresAt <= new Date()) {
        return null;
      }
      return memoryUsers.get(session.userId) ?? null;
    },
    async revokeSession(tokenHash) {
      const session = sessionTokens.get(tokenHash);
      if (session) session.revoked = true;
    },
    async addVehicle(input) {
      const id = randomUUID();
      memoryVehicles.set(id, { id, ...input });
      return { id };
    },
    async listCustomerVehicles(customerId) {
      return [...memoryVehicles.values()]
        .filter((vehicle) => vehicle.customerId === customerId)
        .map((vehicle) => ({
          id: vehicle.id,
          registrationNumber: vehicle.registrationNumber,
          make: vehicle.make,
          model: vehicle.model ?? null,
          type: vehicle.type
        }));
    },
    async addAddress(input) {
      const id = randomUUID();
      memoryAddresses.set(id, { id, ...input });
      return { id };
    },
    async listCustomerAddresses(customerId) {
      return [...memoryAddresses.values()]
        .filter((address) => address.customerId === customerId)
        .map((address) => ({
          id: address.id,
          label: address.label,
          postcode: address.postcode,
          waterAvailable: address.waterAvailable
        }));
    },
    async isCustomerAffiliateFirstBookingEligible(customerId) {
      return (
        memoryCustomerReferrals.has(customerId) &&
        ![...memoryBookings.values()].some(
          (booking) =>
            booking.customerId === customerId && booking.status !== "cancelled"
        )
      );
    },
    async saveQuote(input) {
      const id = randomUUID();
      memoryQuotes.set(id, { id, ...input });
      return { id, expiresAt: input.expiresAt.toISOString() };
    },
    async createBooking(input) {
      const existingForQuote = [...memoryBookings.values()].find(
        (booking) => booking.quoteId === input.quoteId
      );
      if (existingForQuote) return existingForQuote;
      const vehicle = memoryVehicles.get(input.vehicleId);
      const address = memoryAddresses.get(input.addressId);
      const quote = memoryQuotes.get(input.quoteId);
      const customer = memoryUsers.get(input.customerId);
      if (
        !vehicle ||
        !address ||
        !quote ||
        !customer ||
        vehicle.customerId !== input.customerId ||
        address.customerId !== input.customerId ||
        quote.customerId !== input.customerId ||
        quote.expiresAt <= new Date()
      ) {
        throw new Error("booking_reference_invalid");
      }
      const booking: BookingView & {
        customerId: string;
        detailerId: string | null;
        quoteId: string;
      } = {
        id: randomUUID(),
        quoteId: input.quoteId,
        customerId: input.customerId,
        detailerId: null,
        status: "confirmed",
        bookingType: input.bookingType,
        scheduledFor: input.scheduledFor?.toISOString() ?? null,
        paymentState: "not_connected" as const,
        serviceId: quote.serviceId,
        customerTotal: quote.quote.customerTotal,
        detailerEarnings: quote.quote.detailerEarnings,
        vehicle: {
          id: vehicle.id,
          registrationNumber: vehicle.registrationNumber,
          make: vehicle.make,
          model: vehicle.model ?? null,
          type: vehicle.type
        },
        address: {
          id: address.id,
          label: address.label,
          postcode: address.postcode,
          waterAvailable: address.waterAvailable
        },
        customerName: customer.name,
        detailerName: null
      };
      memoryBookings.set(booking.id, booking);
      return booking;
    },
    async listCustomerBookings(customerId) {
      return [...memoryBookings.values()].filter(
        (booking) => booking.customerId === customerId
      );
    },
    async listDetailerOffers(detailerId) {
      const detailer = memoryUsers.get(detailerId);
      if (!detailer?.detailerApproved) return [];
      return [...memoryBookings.values()].filter(
        (booking) =>
          booking.status === "confirmed" &&
          booking.detailerId === null &&
          (booking.address.waterAvailable !== false ||
            detailer?.ownWaterSupply === true)
      );
    },
    async listDetailerBookings(detailerId) {
      return [...memoryBookings.values()].filter(
        (booking) => booking.detailerId === detailerId
      );
    },
    async acceptBooking(bookingId, detailerId) {
      const booking = memoryBookings.get(bookingId);
      const detailer = memoryUsers.get(detailerId);
      if (
        !booking ||
        !detailer ||
        !detailer.detailerApproved ||
        booking.status !== "confirmed" ||
        booking.detailerId ||
        (booking.address.waterAvailable === false &&
          detailer.ownWaterSupply !== true)
      ) {
        return null;
      }
      booking.detailerId = detailerId;
      booking.detailerName = detailer.name;
      booking.status = "assigned";
      return booking;
    },
    async updateBookingStatus(bookingId, detailerId, status) {
      const booking = memoryBookings.get(bookingId);
      if (!booking || booking.detailerId !== detailerId) return null;
      booking.status = status;
      if (status === "completed") {
        const referredDetailerId = memoryCustomerReferrals.get(
          booking.customerId
        );
        const alreadyAwarded = memoryAffiliatePoints.some(
          (entry) => entry.customerId === booking.customerId
        );
        const referredDetailer = referredDetailerId
          ? memoryUsers.get(referredDetailerId)
          : null;
        const customer = memoryUsers.get(booking.customerId);
        if (referredDetailerId && referredDetailer && customer && !alreadyAwarded) {
          memoryAffiliatePoints.unshift({
            id: randomUUID(),
            detailerId: referredDetailerId,
            detailerName: referredDetailer.name,
            detailerEmail: referredDetailer.email,
            customerId: customer.id,
            customerName: customer.name,
            customerEmail: customer.email,
            bookingId,
            points: 10,
            reason: "first_referred_booking_completed",
            createdAt: new Date().toISOString()
          });
        }
      }
      return booking;
    },
    async createSupportRequest() {
      return { id: randomUUID() };
    },
    async requestAccountDeletion(userId) {
      for (const session of sessionTokens.values()) {
        if (session.userId === userId) session.revoked = true;
      }
      memoryUsers.delete(userId);
      return { id: randomUUID(), status: "requested" };
    }
  };
};
