import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { DvlaClient, GoogleMapsClient } from "@valx/integrations";
import {
  bookingPolicies,
  calculateQuote,
  services
} from "@valx/pricing-policy";
import Fastify, {
  type FastifyReply,
  type FastifyRequest
} from "fastify";
import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import type { ApiConfig } from "./config.js";
import {
  createAuthEmailDelivery,
  type AuthEmailDelivery
} from "./email.js";
import {
  createMemoryRepository,
  createPostgresRepository,
  type Role,
  type UserRecord,
  type ValxRepository
} from "./repository.js";
import {
  constantTimeTextEqual,
  createAdminMfaCode,
  createOneTimeToken,
  createSessionToken,
  hashOneTimeToken,
  hashPassword,
  hashSessionToken,
  normaliseEmail,
  verifyPassword
} from "./security.js";

const quoteInput = z.object({
  serviceId: z.enum([
    "exterior-detail",
    "exterior-interior",
    "deep-detail",
    "premium-full-detail"
  ]),
  vehicleType: z.enum([
    "hatchback",
    "sedan",
    "suv",
    "coupe",
    "pickup",
    "other"
  ]),
  distanceMiles: z.number().nonnegative(),
  affiliateFirstService: z.boolean().optional(),
  fastTrack: z.boolean().optional()
});

const vehicleInput = z.object({
  registrationNumber: z.string().min(5).max(12)
});

const routeInput = z.object({
  originPlaceId: z.string().min(1),
  destinationPlaceId: z.string().min(1)
});

const registrationInput = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("customer"),
    email: z.string().email(),
    password: z.string().min(10).max(128),
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(7).max(24),
    inviteCode: z.string().optional(),
    waterAvailable: z.boolean(),
    affiliateCode: z.string().trim().max(40).optional()
  }),
  z.object({
    role: z.literal("detailer"),
    email: z.string().email(),
    password: z.string().min(10).max(128),
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(7).max(24),
    inviteCode: z.string().optional(),
    invitationToken: z.string().min(32).max(256).optional(),
    ownWaterSupply: z.boolean(),
    serviceRadiusMiles: z.number().int().min(3).max(50),
    vatRegistered: z.boolean(),
    vatNumber: z.string().trim().max(20).optional(),
    instagram: z.string().trim().max(80).optional()
  })
]);

const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128)
});

const adminMfaInput = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/)
});

const authTokenInput = z.object({
  token: z.string().min(32).max(256)
});

const emailRequestInput = z.object({
  email: z.string().email()
});

const passwordResetInput = authTokenInput.extend({
  password: z.string().min(10).max(128)
});

const addressInput = z.object({
  googlePlaceId: z.string().min(1).optional(),
  label: z.string().trim().min(5).max(240),
  postcode: z.string().trim().min(5).max(10),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  waterAvailable: z.boolean()
});

const createVehicleInput = z.object({
  registrationNumber: z.string().trim().min(2).max(12),
  make: z.string().trim().min(1).max(80),
  model: z.string().trim().max(80).optional(),
  colour: z.string().trim().max(40).optional(),
  fuelType: z.string().trim().max(40).optional(),
  yearOfManufacture: z.number().int().min(1900).max(2100).optional(),
  type: z.enum(["hatchback", "sedan", "suv", "coupe", "pickup", "other"]),
  lookupSource: z.enum(["mock", "dvla", "manual"]).default("manual")
});

const bookingInput = z.object({
  vehicleId: z.string().uuid(),
  addressId: z.string().uuid(),
  quoteId: z.string().uuid(),
  bookingType: z.enum(["priority_pick", "prebook", "next_available"]),
  scheduledFor: z.string().datetime().optional()
});

const supportInput = z.object({
  category: z.enum([
    "booking",
    "account",
    "detailer_onboarding",
    "privacy",
    "other"
  ]),
  message: z.string().trim().min(10).max(4_000)
});

const deletionInput = z.object({
  confirmation: z.literal("DELETE"),
  reason: z.string().trim().max(1_000).optional()
});

const detailerInvitationInput = z.object({
  email: z.string().email()
});

const detailerOnboardingInput = z.object({
  businessName: z.string().trim().min(2).max(120),
  tradingAddress: z.string().trim().min(8).max(240),
  operatingPostcode: z.string().trim().min(5).max(10),
  experienceYears: z.number().int().min(0).max(80),
  ownWaterSupply: z.boolean(),
  serviceRadiusMiles: z.number().int().min(3).max(50),
  vatRegistered: z.boolean(),
  vatNumber: z.string().trim().max(20).optional(),
  instagram: z.string().trim().max(80).optional(),
  rightToWorkDeclared: z.literal(true),
  termsAccepted: z.literal(true)
});

const documentQueryInput = z.object({
  type: z.enum(["identity", "public_liability_insurance", "motor_insurance"]),
  fileName: z.string().trim().min(1).max(180),
  expiresAt: z.string().date().optional()
});

const reviewInput = z.object({
  decision: z.enum(["approved", "changes_requested", "rejected"]),
  notes: z.string().trim().min(3).max(2_000)
});

const validDocumentSignature = (mimeType: string, body: Buffer) => {
  if (mimeType === "application/pdf") return body.subarray(0, 5).toString() === "%PDF-";
  if (mimeType === "image/jpeg") return body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
  if (mimeType === "image/png") {
    return body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  return false;
};

const publicUser = (user: UserRecord) => ({
  id: user.id,
  role: user.role,
  email: user.email,
  name: user.name,
  phone: user.phone,
  emailVerified: user.emailVerifiedAt !== null
});

export const createApp = async (
  config: ApiConfig,
  repository?: ValxRepository,
  emailDelivery?: AuthEmailDelivery
) => {
  const app = Fastify({
    logger: config.NODE_ENV !== "test",
    bodyLimit: 64 * 1024,
    requestIdHeader: "x-request-id",
    // Production traffic can only reach the API through the localhost-bound
    // Caddy proxy. Trust its forwarded client address so authentication rate
    // limits are applied per visitor rather than to every visitor collectively.
    trustProxy: config.NODE_ENV === "production"
  });
  app.addContentTypeParser(
    ["application/pdf", "image/jpeg", "image/png"],
    { parseAs: "buffer" },
    (_request, body, done) => done(null, body)
  );
  const documentStorageRoot = resolve(config.DOCUMENT_STORAGE_PATH);
  await mkdir(documentStorageRoot, { recursive: true, mode: 0o700 });
  await chmod(documentStorageRoot, 0o700);

  await app.register(helmet, { global: true });
  await app.register(cors, {
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed"), false);
    }
  });
  await app.register(rateLimit, {
    max: config.NODE_ENV === "test" ? 10_000 : 120,
    timeWindow: "1 minute"
  });

  const data =
    repository ??
    (config.DATABASE_URL
      ? createPostgresRepository(config.DATABASE_URL)
      : createMemoryRepository());
  app.addHook("onClose", async () => data.close());
  const authEmail = emailDelivery ?? createAuthEmailDelivery(config);

  const bearerToken = (request: FastifyRequest) => {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) return null;
    const token = authorization.slice("Bearer ".length).trim();
    return token || null;
  };

  const authenticatedUser = async (
    request: FastifyRequest,
    reply: FastifyReply,
    roles?: Role[]
  ) => {
    const token = bearerToken(request);
    if (!token) {
      await reply.code(401).send({ error: "authentication_required" });
      return null;
    }
    const user = await data.authenticateSession(
      hashSessionToken(token, config.AUTH_TOKEN_PEPPER)
    );
    if (!user) {
      await reply.code(401).send({ error: "invalid_or_expired_session" });
      return null;
    }
    if (roles && !roles.includes(user.role)) {
      await reply.code(403).send({ error: "role_not_permitted" });
      return null;
    }
    return user;
  };

  const issueSession = async (user: UserRecord) => {
    const token = createSessionToken();
    const expiresAt = new Date(
      Date.now() + config.SESSION_TTL_HOURS * 60 * 60 * 1_000
    );
    await data.createSession(
      user.id,
      hashSessionToken(token, config.AUTH_TOKEN_PEPPER),
      expiresAt
    );
    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: publicUser(user)
    };
  };

  const sendAuthEmail = async (
    user: UserRecord,
    purpose: "verify_email" | "reset_password"
  ) => {
    const token = createOneTimeToken();
    const expiresInMinutes =
      purpose === "verify_email"
        ? config.EMAIL_VERIFICATION_TTL_MINUTES
        : config.PASSWORD_RESET_TTL_MINUTES;
    await data.createAuthToken({
      userId: user.id,
      purpose,
      tokenHash: hashOneTimeToken(token, config.AUTH_TOKEN_PEPPER),
      expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1_000)
    });
    const isAdminPasswordReset =
      purpose === "reset_password" && user.role === "admin";
    const path =
      purpose === "verify_email" ? "/verify-email" : "/reset-password";
    const actionUrl = new URL(
      isAdminPasswordReset ? config.ADMIN_APP_URL : config.PUBLIC_APP_URL
    );
    if (isAdminPasswordReset) {
      actionUrl.pathname = path;
      actionUrl.search = "";
      actionUrl.hash = "";
      actionUrl.searchParams.set("token", token);
    } else {
      actionUrl.hash = `${path}?token=${encodeURIComponent(token)}`;
    }
    await authEmail.send({
      kind: purpose,
      to: user.email,
      actionUrl: actionUrl.toString(),
      expiresInMinutes
    });
  };

  const trySendAuthEmail = async (
    user: UserRecord,
    purpose: "verify_email" | "reset_password"
  ) => {
    try {
      await sendAuthEmail(user, purpose);
      return true;
    } catch {
      app.log.error("Authentication email delivery failed");
      return false;
    }
  };

  const trySendAdminMfaEmail = async (user: UserRecord) => {
    const code = createAdminMfaCode();
    await data.createAuthToken({
      userId: user.id,
      purpose: "admin_mfa",
      tokenHash: hashOneTimeToken(
        `${normaliseEmail(user.email)}:${code}`,
        config.AUTH_TOKEN_PEPPER
      ),
      expiresAt: new Date(Date.now() + 10 * 60 * 1_000)
    });
    try {
      await authEmail.send({
        kind: "admin_mfa",
        to: user.email,
        code,
        expiresInMinutes: 10
      });
      return true;
    } catch {
      app.log.error("Administrator MFA email delivery failed");
      return false;
    }
  };

  const dvla = new DvlaClient({
    mode: config.DVLA_MODE,
    apiKey: config.DVLA_API_KEY,
    baseUrl: config.DVLA_API_BASE_URL
  });
  const google = new GoogleMapsClient({
    mode: config.GOOGLE_MAPS_MODE,
    apiKey: config.GOOGLE_MAPS_API_KEY,
    placesBaseUrl: config.GOOGLE_PLACES_BASE_URL,
    routesBaseUrl: config.GOOGLE_ROUTES_BASE_URL
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "valx-api",
    paymentsConnected: false,
    integrations: {
      dvla: config.DVLA_MODE,
      googleMaps: config.GOOGLE_MAPS_MODE
    }
  }));

  app.get("/ready", async (request, reply) => {
    try {
      await data.healthcheck();
    } catch {
      request.log.error("Database readiness check failed");
      return reply.code(503).send({ status: "not_ready" });
    }
    return { status: "ready" };
  });

  app.post(
    "/v1/auth/register",
    {
      config: {
        rateLimit: {
          max: config.NODE_ENV === "test" ? 10_000 : 10,
          timeWindow: "1 minute"
        }
      }
    },
    async (request, reply) => {
    const parsed = registrationInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_registration",
        details: parsed.error.flatten()
      });
    }
    const input = parsed.data;
    const email = normaliseEmail(input.email);
    const emailAllowed = config.betaAllowedEmails.includes(email);
    const codeAllowed =
      Boolean(config.BETA_INVITE_CODE && input.inviteCode) &&
      constantTimeTextEqual(input.inviteCode ?? "", config.BETA_INVITE_CODE!);
    const individualDetailerInvite =
      input.role === "detailer" && Boolean(input.invitationToken);
    if (
      config.BETA_REGISTRATION_MODE === "invite_only" &&
      !emailAllowed &&
      !codeAllowed &&
      !individualDetailerInvite
    ) {
      return reply.code(403).send({ error: "beta_invitation_required" });
    }
    if (input.role === "detailer" && input.vatRegistered && !input.vatNumber) {
      return reply.code(400).send({ error: "vat_number_required" });
    }
    try {
      const user = await data.createUser({
        ...input,
        email,
        invitationTokenHash:
          input.role === "detailer" && input.invitationToken
            ? hashOneTimeToken(input.invitationToken, config.AUTH_TOKEN_PEPPER)
            : undefined,
        passwordHash: await hashPassword(input.password)
      });
      const delivered = await trySendAuthEmail(user, "verify_email");
      return reply.code(201).send({
        verificationRequired: true,
        email: user.email,
        verificationDelivery: delivered ? "sent" : "delayed"
      });
    } catch (error) {
      request.log.info("Registration was not completed");
      if (error instanceof Error && error.message === "invalid_detailer_invitation") {
        return reply.code(403).send({ error: "invalid_detailer_invitation" });
      }
      return reply.code(409).send({ error: "account_already_exists" });
    }
    }
  );

  app.post(
    "/v1/auth/verify-email",
    {
      config: {
        rateLimit: {
          max: config.NODE_ENV === "test" ? 10_000 : 10,
          timeWindow: "1 minute"
        }
      }
    },
    async (request, reply) => {
      const parsed = authTokenInput.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_verification_token" });
      }
      const user = await data.verifyEmail(
        hashOneTimeToken(parsed.data.token, config.AUTH_TOKEN_PEPPER)
      );
      if (!user) {
        return reply.code(400).send({ error: "invalid_verification_token" });
      }
      return issueSession(user);
    }
  );

  app.post("/v1/auth/resend-verification", {
    config: {
      rateLimit: {
        max: config.NODE_ENV === "test" ? 10_000 : 3,
        timeWindow: "15 minutes"
      }
    }
  }, async (request, reply) => {
    const parsed = emailRequestInput.safeParse(request.body);
    if (parsed.success) {
      const user = await data.findUserByEmail(normaliseEmail(parsed.data.email));
      if (user && !user.emailVerifiedAt) {
        await trySendAuthEmail(user, "verify_email");
      }
    }
    return reply.code(202).send({ accepted: true });
  });

  app.post("/v1/auth/forgot-password", {
    config: {
      rateLimit: {
        max: config.NODE_ENV === "test" ? 10_000 : 5,
        timeWindow: "15 minutes"
      }
    }
  }, async (request, reply) => {
    const parsed = emailRequestInput.safeParse(request.body);
    if (parsed.success) {
      const user = await data.findUserByEmail(normaliseEmail(parsed.data.email));
      if (user?.emailVerifiedAt) {
        await trySendAuthEmail(user, "reset_password");
      }
    }
    return reply.code(202).send({ accepted: true });
  });

  app.post("/v1/auth/reset-password", {
    config: {
      rateLimit: {
        max: config.NODE_ENV === "test" ? 10_000 : 10,
        timeWindow: "15 minutes"
      }
    }
  }, async (request, reply) => {
    const parsed = passwordResetInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_password_reset" });
    }
    const reset = await data.resetPassword(
      hashOneTimeToken(parsed.data.token, config.AUTH_TOKEN_PEPPER),
      await hashPassword(parsed.data.password)
    );
    if (!reset) {
      return reply.code(400).send({ error: "invalid_password_reset" });
    }
    return reply.code(204).send();
  });

  app.post(
    "/v1/auth/login",
    {
      config: {
        rateLimit: {
          max: config.NODE_ENV === "test" ? 10_000 : 10,
          timeWindow: "1 minute"
        }
      }
    },
    async (request, reply) => {
    const parsed = loginInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_login" });
    }
    const user = await data.findUserByEmail(
      normaliseEmail(parsed.data.email)
    );
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }
    if (!user.emailVerifiedAt) {
      return reply.code(403).send({ error: "email_verification_required" });
    }
    if (user.role === "admin") {
      return reply.code(403).send({ error: "admin_login_required" });
    }
    return issueSession(user);
    }
  );

  app.post(
    "/v1/admin/auth/login",
    {
      config: {
        rateLimit: {
          max: config.NODE_ENV === "test" ? 10_000 : 5,
          timeWindow: "15 minutes"
        }
      }
    },
    async (request, reply) => {
      const parsed = loginInput.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_login" });
      }

      const user = await data.findUserByEmail(
        normaliseEmail(parsed.data.email)
      );
      if (
        user?.role !== "admin" ||
        !user.emailVerifiedAt ||
        !(await verifyPassword(parsed.data.password, user.passwordHash))
      ) {
        return reply.code(401).send({ error: "invalid_credentials" });
      }

      const delivered = await trySendAdminMfaEmail(user);
      if (!delivered) {
        return reply.code(503).send({ error: "auth_email_delivery_failed" });
      }

      return reply.code(202).send({ accepted: true });
    }
  );

  app.post(
    "/v1/admin/auth/verify-mfa",
    {
      config: {
        rateLimit: {
          max: config.NODE_ENV === "test" ? 10_000 : 5,
          timeWindow: "15 minutes"
        }
      }
    },
    async (request, reply) => {
      const parsed = adminMfaInput.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_mfa_code" });
      }
      const email = normaliseEmail(parsed.data.email);
      const user = await data.consumeAuthToken(
        hashOneTimeToken(
          `${email}:${parsed.data.code}`,
          config.AUTH_TOKEN_PEPPER
        ),
        "admin_mfa"
      );
      if (!user || user.role !== "admin") {
        return reply.code(401).send({ error: "invalid_mfa_code" });
      }
      return issueSession(user);
    }
  );

  app.get("/v1/me", async (request, reply) => {
    const user = await authenticatedUser(request, reply);
    if (!user) return;
    return { user: publicUser(user) };
  });

  app.post("/v1/auth/logout", async (request, reply) => {
    const token = bearerToken(request);
    if (!token) return reply.code(204).send();
    await data.revokeSession(
      hashSessionToken(token, config.AUTH_TOKEN_PEPPER)
    );
    return reply.code(204).send();
  });

  app.post(
    "/v1/admin/detailer-invitations",
    {
      config: {
        rateLimit: {
          max: config.NODE_ENV === "test" ? 10_000 : 10,
          timeWindow: "1 hour"
        }
      }
    },
    async (request, reply) => {
      const admin = await authenticatedUser(request, reply, ["admin"]);
      if (!admin) return;
      const parsed = detailerInvitationInput.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_detailer_invitation" });
      const email = normaliseEmail(parsed.data.email);
      const token = createOneTimeToken();
      const expiresInMinutes = 7 * 24 * 60;
      const invitation = await data.createDetailerInvitation({
        email,
        tokenHash: hashOneTimeToken(token, config.AUTH_TOKEN_PEPPER),
        invitedBy: admin.id,
        expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1_000)
      });
      const actionUrl = new URL(config.PUBLIC_APP_URL);
      actionUrl.hash = `/detailer-invite?token=${encodeURIComponent(token)}`;
      let delivery: "sent" | "delayed" = "sent";
      try {
        await authEmail.send({
          kind: "detailer_invite",
          to: email,
          actionUrl: actionUrl.toString(),
          expiresInMinutes
        });
      } catch {
        delivery = "delayed";
        request.log.error("Detailer invitation email delivery failed");
      }
      return reply.code(201).send({ invitation, delivery });
    }
  );

  app.get("/v1/detailer/onboarding", async (request, reply) => {
    const detailer = await authenticatedUser(request, reply, ["detailer"]);
    if (!detailer) return;
    const onboarding = await data.getDetailerOnboarding(detailer.id);
    if (!onboarding) return reply.code(404).send({ error: "detailer_onboarding_not_found" });
    return { onboarding };
  });

  app.patch("/v1/detailer/onboarding", async (request, reply) => {
    const detailer = await authenticatedUser(request, reply, ["detailer"]);
    if (!detailer) return;
    const parsed = detailerOnboardingInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_detailer_onboarding", details: parsed.error.flatten() });
    }
    if (parsed.data.vatRegistered && !parsed.data.vatNumber) {
      return reply.code(400).send({ error: "vat_number_required" });
    }
    const onboarding = await data.updateDetailerOnboarding(detailer.id, parsed.data);
    if (!onboarding) return reply.code(409).send({ error: "detailer_onboarding_locked" });
    return { onboarding };
  });

  app.post(
    "/v1/detailer/onboarding/documents",
    {
      bodyLimit: config.DOCUMENT_MAX_BYTES,
      config: {
        rateLimit: {
          max: config.NODE_ENV === "test" ? 10_000 : 15,
          timeWindow: "1 hour"
        }
      }
    },
    async (request, reply) => {
      const detailer = await authenticatedUser(request, reply, ["detailer"]);
      if (!detailer) return;
      const parsed = documentQueryInput.safeParse(request.query);
      const mimeType = request.headers["content-type"]?.split(";")[0]?.trim().toLowerCase();
      const body = request.body;
      if (!parsed.success || !mimeType || !Buffer.isBuffer(body) || body.length === 0) {
        return reply.code(400).send({ error: "invalid_detailer_document" });
      }
      if (body.length > config.DOCUMENT_MAX_BYTES || !validDocumentSignature(mimeType, body)) {
        return reply.code(415).send({ error: "unsupported_detailer_document" });
      }
      if (parsed.data.type !== "identity" && !parsed.data.expiresAt) {
        return reply.code(400).send({ error: "insurance_expiry_required" });
      }
      const extension = mimeType === "application/pdf" ? ".pdf" : mimeType === "image/png" ? ".png" : ".jpg";
      const storageKey = `${randomUUID()}${extension}`;
      const target = resolve(documentStorageRoot, storageKey);
      if (!target.startsWith(`${documentStorageRoot}\\`) && !target.startsWith(`${documentStorageRoot}/`)) {
        return reply.code(400).send({ error: "invalid_detailer_document" });
      }
      await writeFile(target, body, { flag: "wx", mode: 0o600 });
      try {
        const document = await data.addDetailerDocument({
          detailerId: detailer.id,
          type: parsed.data.type,
          originalName: parsed.data.fileName,
          mimeType,
          sizeBytes: body.length,
          sha256: createHash("sha256").update(body).digest("hex"),
          storageKey,
          expiresAt: parsed.data.expiresAt ? new Date(`${parsed.data.expiresAt}T23:59:59.999Z`) : undefined
        });
        return reply.code(201).send({ document });
      } catch (error) {
        await unlink(target).catch(() => undefined);
        if (error instanceof Error && error.message === "detailer_onboarding_locked") {
          return reply.code(409).send({ error: error.message });
        }
        throw error;
      }
    }
  );

  app.post("/v1/detailer/onboarding/submit", async (request, reply) => {
    const detailer = await authenticatedUser(request, reply, ["detailer"]);
    if (!detailer) return;
    try {
      const onboarding = await data.submitDetailerOnboarding(detailer.id);
      if (!onboarding) return reply.code(409).send({ error: "detailer_onboarding_locked" });
      return { onboarding };
    } catch (error) {
      if (error instanceof Error && error.message === "detailer_onboarding_incomplete") {
        return reply.code(400).send({ error: error.message });
      }
      throw error;
    }
  });

  app.get("/v1/admin/detailers", async (request, reply) => {
    const admin = await authenticatedUser(request, reply, ["admin"]);
    if (!admin) return;
    return { detailers: await data.listAdminDetailers() };
  });

  app.get("/v1/admin/dashboard", async (request, reply) => {
    const admin = await authenticatedUser(request, reply, ["admin"]);
    if (!admin) return;
    return { dashboard: await data.getAdminDashboard() };
  });

  app.patch("/v1/admin/detailers/:detailerId/review", async (request, reply) => {
    const admin = await authenticatedUser(request, reply, ["admin"]);
    if (!admin) return;
    const params = z.object({ detailerId: z.string().uuid() }).safeParse(request.params);
    const parsed = reviewInput.safeParse(request.body);
    if (!params.success || !parsed.success) {
      return reply.code(400).send({ error: "invalid_detailer_review" });
    }
    const onboarding = await data.reviewDetailerOnboarding({
      detailerId: params.data.detailerId,
      adminId: admin.id,
      ...parsed.data
    });
    if (!onboarding) return reply.code(409).send({ error: "detailer_not_ready_for_review" });
    return { onboarding };
  });

  app.get("/v1/admin/detailer-documents/:documentId", async (request, reply) => {
    const admin = await authenticatedUser(request, reply, ["admin"]);
    if (!admin) return;
    const params = z.object({ documentId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_detailer_document" });
    const document = await data.findDetailerDocumentForAdmin(params.data.documentId);
    if (!document) return reply.code(404).send({ error: "detailer_document_not_found" });
    const target = resolve(documentStorageRoot, document.storageKey);
    if (!target.startsWith(`${documentStorageRoot}\\`) && !target.startsWith(`${documentStorageRoot}/`)) {
      return reply.code(404).send({ error: "detailer_document_not_found" });
    }
    try {
      const body = await readFile(target);
      const safeName = document.originalName.replace(/[^a-zA-Z0-9._ -]/g, "_");
      return reply
        .header("content-type", document.mimeType)
        .header("content-disposition", `attachment; filename="${safeName}"`)
        .header("cache-control", "no-store")
        .send(body);
    } catch {
      return reply.code(404).send({ error: "detailer_document_not_found" });
    }
  });

  app.get("/v1/public/privacy", async () => ({
    controller: "VALX LIMITED (company number 17378672)",
    contact: config.SUPPORT_EMAIL,
    purpose:
      "Account onboarding, vehicle detailing bookings, service delivery, support and legal record keeping.",
    paymentsConnected: false,
    retention: {
      bookingAndFinanceRecords: "7 years, then securely deleted or anonymised",
      supportEvidence: "24 months after case closure",
      declinedDetailerDocuments: "90 days after final decision"
    },
    rightsUrl: `${config.PUBLIC_APP_URL}/delete-account`
  }));

  app.get("/v1/services", async () => ({ services }));
  app.get("/v1/policies/booking", async () => ({
    version: 1,
    policies: bookingPolicies
  }));

  app.post("/v1/quotes", async (request, reply) => {
    const parsed = quoteInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_quote_request",
        details: parsed.error.flatten()
      });
    }
    return {
      quote: calculateQuote(parsed.data),
      lockedAt: new Date().toISOString(),
      expiresInSeconds: 900,
      paymentState: "not_connected"
    };
  });

  app.post("/v1/customer/vehicles", async (request, reply) => {
    const user = await authenticatedUser(request, reply, ["customer"]);
    if (!user) return;
    const parsed = createVehicleInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_vehicle" });
    }
    const vehicle = await data.addVehicle({
      customerId: user.id,
      ...parsed.data,
      registrationNumber: parsed.data.registrationNumber
        .replace(/\s+/g, "")
        .toUpperCase()
    });
    return reply.code(201).send({ vehicle });
  });

  app.get("/v1/customer/vehicles", async (request, reply) => {
    const user = await authenticatedUser(request, reply, ["customer"]);
    if (!user) return;
    return { vehicles: await data.listCustomerVehicles(user.id) };
  });

  app.post("/v1/customer/addresses", async (request, reply) => {
    const user = await authenticatedUser(request, reply, ["customer"]);
    if (!user) return;
    const parsed = addressInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_address" });
    }
    const address = await data.addAddress({
      customerId: user.id,
      ...parsed.data,
      postcode: parsed.data.postcode.toUpperCase()
    });
    return reply.code(201).send({ address });
  });

  app.get("/v1/customer/addresses", async (request, reply) => {
    const user = await authenticatedUser(request, reply, ["customer"]);
    if (!user) return;
    return { addresses: await data.listCustomerAddresses(user.id) };
  });

  app.post("/v1/customer/quotes", async (request, reply) => {
    const user = await authenticatedUser(request, reply, ["customer"]);
    if (!user) return;
    const parsed = quoteInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_quote_request" });
    }
    const quote = calculateQuote(parsed.data);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1_000);
    const saved = await data.saveQuote({
      customerId: user.id,
      serviceId: parsed.data.serviceId,
      vehicleType: parsed.data.vehicleType,
      distanceMiles: parsed.data.distanceMiles,
      quote,
      expiresAt
    });
    return {
      quote: { ...quote, id: saved.id },
      lockedAt: new Date().toISOString(),
      expiresAt: saved.expiresAt,
      paymentState: "not_connected"
    };
  });

  app.post("/v1/customer/bookings", async (request, reply) => {
    const user = await authenticatedUser(request, reply, ["customer"]);
    if (!user) return;
    const parsed = bookingInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_booking_request" });
    }
    try {
      const booking = await data.createBooking({
        customerId: user.id,
        ...parsed.data,
        scheduledFor: parsed.data.scheduledFor
          ? new Date(parsed.data.scheduledFor)
          : undefined
      });
      return reply.code(201).send({
        booking,
        notice:
          "Booking request confirmed for the private beta. No payment has been taken."
      });
    } catch (error) {
      request.log.info({ error }, "Booking was not created");
      return reply.code(409).send({ error: "booking_reference_invalid" });
    }
  });

  app.get("/v1/customer/bookings", async (request, reply) => {
    const user = await authenticatedUser(request, reply, ["customer"]);
    if (!user) return;
    return { bookings: await data.listCustomerBookings(user.id) };
  });

  app.get("/v1/detailer/offers", async (request, reply) => {
    const user = await authenticatedUser(request, reply, ["detailer"]);
    if (!user) return;
    return { offers: await data.listDetailerOffers(user.id) };
  });

  app.get("/v1/detailer/bookings", async (request, reply) => {
    const user = await authenticatedUser(request, reply, ["detailer"]);
    if (!user) return;
    return { bookings: await data.listDetailerBookings(user.id) };
  });

  app.post(
    "/v1/detailer/bookings/:bookingId/accept",
    async (request, reply) => {
      const user = await authenticatedUser(request, reply, ["detailer"]);
      if (!user) return;
      const parsed = z
        .object({ bookingId: z.string().uuid() })
        .safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_booking_id" });
      }
      const booking = await data.acceptBooking(parsed.data.bookingId, user.id);
      if (!booking) {
        return reply.code(409).send({ error: "booking_no_longer_available" });
      }
      return { booking };
    }
  );

  app.patch(
    "/v1/detailer/bookings/:bookingId/status",
    async (request, reply) => {
      const user = await authenticatedUser(request, reply, ["detailer"]);
      if (!user) return;
      const params = z
        .object({ bookingId: z.string().uuid() })
        .safeParse(request.params);
      const body = z
        .object({
          status: z.enum(["on_way", "arrived", "in_progress", "completed"])
        })
        .safeParse(request.body);
      if (!params.success || !body.success) {
        return reply.code(400).send({ error: "invalid_booking_status" });
      }
      const current = (await data.listDetailerBookings(user.id)).find(
        ({ id }) => id === params.data.bookingId
      );
      const transitions: Record<string, string> = {
        assigned: "on_way",
        on_way: "arrived",
        arrived: "in_progress",
        in_progress: "completed"
      };
      if (!current || transitions[current.status] !== body.data.status) {
        return reply.code(409).send({ error: "invalid_status_transition" });
      }
      const booking = await data.updateBookingStatus(
        params.data.bookingId,
        user.id,
        body.data.status
      );
      return { booking };
    }
  );

  app.post("/v1/support/requests", async (request, reply) => {
    const user = await authenticatedUser(request, reply);
    if (!user) return;
    const parsed = supportInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_support_request" });
    }
    const supportRequest = await data.createSupportRequest(
      user.id,
      parsed.data.category,
      parsed.data.message
    );
    return reply.code(201).send({
      supportRequest,
      contact: config.SUPPORT_EMAIL
    });
  });

  app.post("/v1/account/deletion-request", async (request, reply) => {
    const user = await authenticatedUser(request, reply);
    if (!user) return;
    const parsed = deletionInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "deletion_confirmation_required" });
    }
    const deletionRequest = await data.requestAccountDeletion(
      user.id,
      parsed.data.reason
    );
    return reply.code(202).send({
      deletionRequest,
      message:
        "The account is signed out and the deletion request is queued for legal-hold review."
    });
  });

  app.post("/v1/vehicles/lookup", async (request, reply) => {
    const parsed = vehicleInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_registration",
        details: parsed.error.flatten()
      });
    }
    try {
      return { vehicle: await dvla.lookup(parsed.data.registrationNumber) };
    } catch (error) {
      request.log.warn({ error }, "Vehicle lookup failed");
      return reply.code(502).send({ error: "vehicle_lookup_failed" });
    }
  });

  app.get("/v1/places/autocomplete", async (request, reply) => {
    const parsed = z
      .object({ input: z.string().min(3).max(160) })
      .safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_place_query" });
    }
    try {
      return { suggestions: await google.autocomplete(parsed.data.input) };
    } catch (error) {
      request.log.warn({ error }, "Place autocomplete failed");
      return reply.code(502).send({ error: "place_lookup_failed" });
    }
  });

  app.post("/v1/routes/estimate", async (request, reply) => {
    const parsed = routeInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_route_request" });
    }
    try {
      return {
        route: await google.route(
          parsed.data.originPlaceId,
          parsed.data.destinationPlaceId
        )
      };
    } catch (error) {
      request.log.warn({ error }, "Route estimate failed");
      return reply.code(502).send({ error: "route_lookup_failed" });
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    void reply.code(500).send({ error: "internal_server_error" });
  });

  return app;
};
