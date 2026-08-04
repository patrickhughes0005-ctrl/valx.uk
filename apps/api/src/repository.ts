import {
  accountDeletionRequests,
  addresses,
  auditLog,
  authTokens,
  bookings,
  createDatabase,
  customerProfiles,
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
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
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

export type AuthTokenPurpose = "verify_email" | "reset_password";

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
};

export interface ValxRepository {
  close(): Promise<void>;
  healthcheck(): Promise<void>;
  createUser(input: RegistrationInput): Promise<UserRecord>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  createAuthToken(input: {
    userId: string;
    purpose: AuthTokenPurpose;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  verifyEmail(tokenHash: string): Promise<UserRecord | null>;
  resetPassword(tokenHash: string, passwordHash: string): Promise<boolean>;
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

  return {
    close: connection.close,
    async healthcheck() {
      await db.execute(sql`select 1`);
    },
    async createUser(input) {
      return db.transaction(async (tx) => {
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
            affiliateCode: input.affiliateCode || null
          });
        } else {
          await tx.insert(detailerProfiles).values({
            userId: user.id,
            ownWaterSupply: input.ownWaterSupply ?? false,
            serviceRadiusMiles: input.serviceRadiusMiles ?? 12,
            vatRegistered: input.vatRegistered ?? false,
            vatNumber: input.vatNumber || null,
            instagram: input.instagram || null,
            onboardingComplete: true
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
      if (!profile) return [];
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
          waterAvailable: addresses.waterAvailable
        })
        .from(detailerProfiles)
        .innerJoin(bookings, eq(bookings.id, bookingId))
        .innerJoin(addresses, eq(bookings.addressId, addresses.id))
        .where(eq(detailerProfiles.userId, detailerId))
        .limit(1);
      if (
        !eligibility ||
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
      const [updated] = await db
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
        .returning({ id: bookings.id });
      if (!updated) return null;
      await db.insert(auditLog).values({
        actorId: detailerId,
        action: `booking.${status}`,
        subjectType: "booking",
        subjectId: bookingId,
        metadata: {}
      });
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

type MemoryUser = UserRecord & RegistrationInput;
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

  return {
    async close() {},
    async healthcheck() {},
    async createUser(input) {
      if ([...memoryUsers.values()].some((user) => user.email === input.email)) {
        throw new Error("user_exists");
      }
      const user: MemoryUser = {
        ...input,
        id: randomUUID(),
        phone: input.phone,
        emailVerifiedAt: null
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
