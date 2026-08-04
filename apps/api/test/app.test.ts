import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config";
import { CaptureAuthEmailDelivery } from "../src/email";
import { createMemoryRepository } from "../src/repository";
import { hashPassword } from "../src/security";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const documentStoragePath = await mkdtemp(join(tmpdir(), "valx-api-test-"));

const config = loadConfig({
  NODE_ENV: "test",
  BETA_REGISTRATION_MODE: "open",
  DVLA_MODE: "mock",
  GOOGLE_MAPS_MODE: "mock",
  DOCUMENT_STORAGE_PATH: documentStoragePath
});
const emailDelivery = new CaptureAuthEmailDelivery();
const repository = createMemoryRepository();
const app = await createApp(config, repository, emailDelivery);

const latestToken = (
  to: string,
  kind: "verify_email" | "reset_password"
) => {
  const message = emailDelivery.messages.findLast(
    (candidate) => candidate.to === to && candidate.kind === kind
  );
  if (!message) throw new Error(`Missing ${kind} email for ${to}`);
  if (message.kind === "admin_mfa") {
    throw new Error(`Expected an action-link email for ${to}`);
  }
  const actionUrl = new URL(message.actionUrl);
  const fragmentUrl = new URL(actionUrl.hash.slice(1), "https://valx.test");
  const token = fragmentUrl.searchParams.get("token");
  if (!token) throw new Error(`Missing token in ${kind} email`);
  return token;
};

const latestActionUrl = (
  to: string,
  kind: "verify_email" | "reset_password"
) => {
  const message = emailDelivery.messages.findLast(
    (candidate) => candidate.to === to && candidate.kind === kind
  );
  if (!message || message.kind === "admin_mfa") {
    throw new Error(`Missing ${kind} email for ${to}`);
  }
  return new URL(message.actionUrl);
};

const latestAdminMfaCode = (to: string) => {
  const message = emailDelivery.messages.findLast(
    (candidate) => candidate.to === to && candidate.kind === "admin_mfa"
  );
  if (!message || message.kind !== "admin_mfa") {
    throw new Error(`Missing admin MFA email for ${to}`);
  }
  return message.code;
};

const latestDetailerInvitationToken = (to: string) => {
  const message = emailDelivery.messages.findLast(
    (candidate) => candidate.to === to && candidate.kind === "detailer_invite"
  );
  if (!message || message.kind !== "detailer_invite") {
    throw new Error(`Missing detailer invitation email for ${to}`);
  }
  const actionUrl = new URL(message.actionUrl);
  const invitationUrl = new URL(actionUrl.hash.slice(1), "https://valx.test");
  const token = invitationUrl.searchParams.get("token");
  if (!token) throw new Error(`Missing detailer invitation token for ${to}`);
  return token;
};

const verifyLatestRegistration = async (email: string) =>
  app.inject({
    method: "POST",
    url: "/v1/auth/verify-email",
    payload: { token: latestToken(email, "verify_email") }
  });

beforeAll(async () => app.ready());
afterAll(async () => {
  await app.close();
  await rm(documentStoragePath, { recursive: true, force: true });
});

describe("ValX API", () => {
  it("refuses production startup without real authentication email delivery", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://valx:password@database:5432/valx",
        AUTH_TOKEN_PEPPER: "a-production-pepper-with-more-than-32-characters",
        BETA_INVITE_CODE: "private-beta-code",
        SUPPORT_EMAIL: "support@valx.uk",
        AUTH_EMAIL_MODE: "capture"
      })
    ).toThrow("Production requires AUTH_EMAIL_MODE=smtp");
  });

  it("reports that real payments are not connected", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      paymentsConnected: false,
      integrations: { dvla: "mock", googleMaps: "mock" }
    });
  });

  it("reports repository readiness", async () => {
    const response = await app.inject({ method: "GET", url: "/ready" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ready" });
  });

  it("uses the shared approved pricing package", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/quotes",
      payload: {
        serviceId: "exterior-detail",
        vehicleType: "suv",
        distanceMiles: 4
      }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().quote).toMatchObject({
      jobPrice: 47.1,
      detailerEarnings: 37.68,
      serviceFee: 3.99,
      customerTotal: 51.09
    });
  });

  it("looks up a vehicle in mock mode", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/vehicles/lookup",
      payload: { registrationNumber: "RE22 CEX" }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().vehicle).toMatchObject({
      make: "Land Rover",
      model: "Range Rover Evoque",
      source: "mock"
    });
  });

  it("completes the invite-beta customer to detailer journey without payment", async () => {
    const customerRegistration = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        role: "customer",
        email: "customer.journey@valx.test",
        password: "Customer-password-2026",
        name: "ValX Customer",
        phone: "07123456789",
        waterAvailable: true
      }
    });
    expect(customerRegistration.statusCode).toBe(201);
    expect(customerRegistration.json()).toMatchObject({
      verificationRequired: true,
      verificationDelivery: "sent"
    });
    const customerVerification = await verifyLatestRegistration(
      "customer.journey@valx.test"
    );
    expect(customerVerification.statusCode).toBe(200);
    const customerToken = customerVerification.json().token as string;
    const customerHeaders = {
      authorization: `Bearer ${customerToken}`
    };

    const vehicleResponse = await app.inject({
      method: "POST",
      url: "/v1/customer/vehicles",
      headers: customerHeaders,
      payload: {
        registrationNumber: "RE22 CEX",
        make: "Land Rover",
        model: "Range Rover Evoque",
        type: "suv",
        lookupSource: "mock"
      }
    });
    expect(vehicleResponse.statusCode).toBe(201);

    const addressResponse = await app.inject({
      method: "POST",
      url: "/v1/customer/addresses",
      headers: customerHeaders,
      payload: {
        label: "1 Pilot Street, Oxford, OX1 1AA",
        postcode: "OX1 1AA",
        waterAvailable: true
      }
    });
    expect(addressResponse.statusCode).toBe(201);

    const quoteResponse = await app.inject({
      method: "POST",
      url: "/v1/customer/quotes",
      headers: customerHeaders,
      payload: {
        serviceId: "exterior-interior",
        vehicleType: "suv",
        distanceMiles: 1.8
      }
    });
    expect(quoteResponse.statusCode).toBe(200);
    expect(quoteResponse.json().paymentState).toBe("not_connected");

    const bookingResponse = await app.inject({
      method: "POST",
      url: "/v1/customer/bookings",
      headers: customerHeaders,
      payload: {
        vehicleId: vehicleResponse.json().vehicle.id,
        addressId: addressResponse.json().address.id,
        quoteId: quoteResponse.json().quote.id,
        bookingType: "prebook",
        scheduledFor: "2026-08-15T09:30:00.000Z"
      }
    });
    expect(bookingResponse.statusCode).toBe(201);
    expect(bookingResponse.json().booking).toMatchObject({
      status: "confirmed",
      paymentState: "not_connected"
    });
    const bookingId = bookingResponse.json().booking.id as string;
    const repeatedBookingResponse = await app.inject({
      method: "POST",
      url: "/v1/customer/bookings",
      headers: customerHeaders,
      payload: {
        vehicleId: vehicleResponse.json().vehicle.id,
        addressId: addressResponse.json().address.id,
        quoteId: quoteResponse.json().quote.id,
        bookingType: "prebook",
        scheduledFor: "2026-08-15T09:30:00.000Z"
      }
    });
    expect(repeatedBookingResponse.json().booking.id).toBe(bookingId);

    const detailerRegistration = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        role: "detailer",
        email: "detailer.journey@valx.test",
        password: "Detailer-password-2026",
        name: "ValX Detailer",
        phone: "07987654321",
        ownWaterSupply: true,
        serviceRadiusMiles: 12,
        vatRegistered: false
      }
    });
    expect(detailerRegistration.statusCode).toBe(201);
    const detailerVerification = await verifyLatestRegistration(
      "detailer.journey@valx.test"
    );
    expect(detailerVerification.statusCode).toBe(200);
    const detailerHeaders = {
      authorization: `Bearer ${detailerVerification.json().token as string}`
    };

    const unapprovedOffers = await app.inject({
      method: "GET",
      url: "/v1/detailer/offers",
      headers: detailerHeaders
    });
    expect(unapprovedOffers.statusCode).toBe(200);
    expect(unapprovedOffers.json().offers).toHaveLength(0);

    expect(
      await repository.approveDetailerByEmail(
        "detailer.journey@valx.test",
        "Automated API test"
      )
    ).toBe(true);

    const offersResponse = await app.inject({
      method: "GET",
      url: "/v1/detailer/offers",
      headers: detailerHeaders
    });
    expect(offersResponse.json().offers).toHaveLength(1);

    const acceptResponse = await app.inject({
      method: "POST",
      url: `/v1/detailer/bookings/${bookingId}/accept`,
      headers: detailerHeaders
    });
    expect(acceptResponse.statusCode).toBe(200);
    expect(acceptResponse.json().booking.status).toBe("assigned");

    for (const status of [
      "on_way",
      "arrived",
      "in_progress",
      "completed"
    ]) {
      const statusResponse = await app.inject({
        method: "PATCH",
        url: `/v1/detailer/bookings/${bookingId}/status`,
        headers: detailerHeaders,
        payload: { status }
      });
      expect(statusResponse.statusCode).toBe(200);
      expect(statusResponse.json().booking.status).toBe(status);
    }

    const customerBookings = await app.inject({
      method: "GET",
      url: "/v1/customer/bookings",
      headers: customerHeaders
    });
    expect(customerBookings.json().bookings[0]).toMatchObject({
      id: bookingId,
      status: "completed",
      detailerName: "ValX Detailer",
      paymentState: "not_connected"
    });
  });

  it("verifies email and securely resets a forgotten password", async () => {
    const email = "auth.security@valx.test";
    const originalPassword = "Original-password-2026";
    const newPassword = "Replacement-password-2026";
    const registration = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        role: "customer",
        email,
        password: originalPassword,
        name: "Auth Security",
        phone: "07123450000",
        waterAvailable: true
      }
    });
    expect(registration.statusCode).toBe(201);

    const blockedLogin = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email, password: originalPassword }
    });
    expect(blockedLogin.statusCode).toBe(403);
    expect(blockedLogin.json().error).toBe("email_verification_required");

    const verificationToken = latestToken(email, "verify_email");
    const verification = await app.inject({
      method: "POST",
      url: "/v1/auth/verify-email",
      payload: { token: verificationToken }
    });
    expect(verification.statusCode).toBe(200);
    expect(verification.json().user.emailVerified).toBe(true);
    const originalSession = verification.json().token as string;

    const reusedVerification = await app.inject({
      method: "POST",
      url: "/v1/auth/verify-email",
      payload: { token: verificationToken }
    });
    expect(reusedVerification.statusCode).toBe(400);

    const unknownReset = await app.inject({
      method: "POST",
      url: "/v1/auth/forgot-password",
      payload: { email: "unknown@valx.test" }
    });
    expect(unknownReset.statusCode).toBe(202);
    expect(unknownReset.json()).toEqual({ accepted: true });

    const resetRequest = await app.inject({
      method: "POST",
      url: "/v1/auth/forgot-password",
      payload: { email }
    });
    expect(resetRequest.statusCode).toBe(202);
    const resetToken = latestToken(email, "reset_password");

    const reset = await app.inject({
      method: "POST",
      url: "/v1/auth/reset-password",
      payload: { token: resetToken, password: newPassword }
    });
    expect(reset.statusCode).toBe(204);

    const revokedSession = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { authorization: `Bearer ${originalSession}` }
    });
    expect(revokedSession.statusCode).toBe(401);

    const oldLogin = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email, password: originalPassword }
    });
    expect(oldLogin.statusCode).toBe(401);
    const newLogin = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email, password: newPassword }
    });
    expect(newLogin.statusCode).toBe(200);

    const reusedReset = await app.inject({
      method: "POST",
      url: "/v1/auth/reset-password",
      payload: { token: resetToken, password: originalPassword }
    });
    expect(reusedReset.statusCode).toBe(400);
  });

  it("requires one-time email MFA for administrator sign-in", async () => {
    const email = "admin.security@valx.test";
    const password = "Admin-password-2026";
    await repository.createAdmin({
      email,
      name: "Admin Security",
      passwordHash: await hashPassword(password)
    });

    const resetRequest = await app.inject({
      method: "POST",
      url: "/v1/auth/forgot-password",
      payload: { email }
    });
    expect(resetRequest.statusCode).toBe(202);
    const resetUrl = latestActionUrl(email, "reset_password");
    expect(resetUrl.origin).toBe("http://localhost:3001");
    expect(resetUrl.pathname).toBe("/reset-password");
    expect(resetUrl.searchParams.get("token")).toBeTruthy();
    expect(resetUrl.hash).toBe("");

    const genericLogin = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email, password }
    });
    expect(genericLogin.statusCode).toBe(403);
    expect(genericLogin.json().error).toBe("admin_login_required");

    const adminLogin = await app.inject({
      method: "POST",
      url: "/v1/admin/auth/login",
      payload: { email, password }
    });
    expect(adminLogin.statusCode).toBe(202);
    expect(adminLogin.json()).toEqual({ accepted: true });

    const code = latestAdminMfaCode(email);
    const wrongCode = await app.inject({
      method: "POST",
      url: "/v1/admin/auth/verify-mfa",
      payload: { email, code: code === "000000" ? "999999" : "000000" }
    });
    expect(wrongCode.statusCode).toBe(401);

    const verified = await app.inject({
      method: "POST",
      url: "/v1/admin/auth/verify-mfa",
      payload: { email, code }
    });
    expect(verified.statusCode).toBe(200);
    expect(verified.json().user.role).toBe("admin");

    const session = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { authorization: `Bearer ${verified.json().token}` }
    });
    expect(session.statusCode).toBe(200);
    expect(session.json().user.email).toBe(email);

    const reusedCode = await app.inject({
      method: "POST",
      url: "/v1/admin/auth/verify-mfa",
      payload: { email, code }
    });
    expect(reusedCode.statusCode).toBe(401);
  });

  it("runs secure invited detailer onboarding and administrator approval", async () => {
    const adminEmail = "onboarding.admin@valx.test";
    const adminPassword = "Admin-onboarding-2026";
    const detailerEmail = "portsmouth.detailer@valx.test";
    await repository.createAdmin({
      email: adminEmail,
      name: "Onboarding Admin",
      passwordHash: await hashPassword(adminPassword)
    });
    await app.inject({
      method: "POST",
      url: "/v1/admin/auth/login",
      payload: { email: adminEmail, password: adminPassword }
    });
    const mfa = await app.inject({
      method: "POST",
      url: "/v1/admin/auth/verify-mfa",
      payload: { email: adminEmail, code: latestAdminMfaCode(adminEmail) }
    });
    const adminHeaders = {
      authorization: `Bearer ${mfa.json().token as string}`
    };

    const invitation = await app.inject({
      method: "POST",
      url: "/v1/admin/detailer-invitations",
      headers: adminHeaders,
      payload: { email: detailerEmail }
    });
    expect(invitation.statusCode).toBe(201);
    expect(invitation.json().delivery).toBe("sent");
    const invitationToken = latestDetailerInvitationToken(detailerEmail);

    const wrongRecipient = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        role: "detailer",
        email: "wrong-recipient@valx.test",
        password: "Detailer-password-2026",
        name: "Wrong Recipient",
        phone: "07111111112",
        invitationToken,
        ownWaterSupply: true,
        serviceRadiusMiles: 15,
        vatRegistered: false
      }
    });
    expect(wrongRecipient.statusCode).toBe(403);

    const registration = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        role: "detailer",
        email: detailerEmail,
        password: "Detailer-password-2026",
        name: "Portsmouth Pilot Detailer",
        phone: "07111111113",
        invitationToken,
        ownWaterSupply: true,
        serviceRadiusMiles: 15,
        vatRegistered: false
      }
    });
    expect(registration.statusCode).toBe(201);
    const verified = await verifyLatestRegistration(detailerEmail);
    const detailerHeaders = {
      authorization: `Bearer ${verified.json().token as string}`
    };

    const saved = await app.inject({
      method: "PATCH",
      url: "/v1/detailer/onboarding",
      headers: detailerHeaders,
      payload: {
        businessName: "Portsmouth Mobile Detailing",
        tradingAddress: "1 Pilot Road, Portsmouth",
        operatingPostcode: "PO1 1AA",
        experienceYears: 5,
        ownWaterSupply: true,
        serviceRadiusMiles: 15,
        vatRegistered: false,
        instagram: "portsmouth.detailing",
        rightToWorkDeclared: true,
        termsAccepted: true
      }
    });
    expect(saved.statusCode).toBe(200);

    const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
    const uploadDocument = (type: string, expiresAt?: string) =>
      app.inject({
        method: "POST",
        url: `/v1/detailer/onboarding/documents?type=${type}&fileName=${type}.pdf${expiresAt ? `&expiresAt=${expiresAt}` : ""}`,
        headers: { ...detailerHeaders, "content-type": "application/pdf" },
        payload: pdf
      });
    expect((await uploadDocument("identity")).statusCode).toBe(201);
    expect((await uploadDocument("public_liability_insurance", "2027-08-04")).statusCode).toBe(201);
    const motorDocument = await uploadDocument("motor_insurance", "2027-09-10");
    expect(motorDocument.statusCode).toBe(201);

    const submitted = await app.inject({
      method: "POST",
      url: "/v1/detailer/onboarding/submit",
      headers: detailerHeaders
    });
    expect(submitted.statusCode).toBe(200);
    expect(submitted.json().onboarding.status).toBe("submitted");

    const beforeApproval = await app.inject({
      method: "GET",
      url: "/v1/detailer/offers",
      headers: detailerHeaders
    });
    expect(beforeApproval.json().offers).toHaveLength(0);

    const list = await app.inject({
      method: "GET",
      url: "/v1/admin/detailers",
      headers: adminHeaders
    });
    const candidate = list.json().detailers.find(
      (detailer: { email: string }) => detailer.email === detailerEmail
    );
    expect(candidate).toMatchObject({ status: "submitted", operatingPostcode: "PO1 1AA" });
    expect(candidate.documents).toHaveLength(3);

    const download = await app.inject({
      method: "GET",
      url: `/v1/admin/detailer-documents/${motorDocument.json().document.id}`,
      headers: adminHeaders
    });
    expect(download.statusCode).toBe(200);
    expect(download.headers["cache-control"]).toBe("no-store");

    const approval = await app.inject({
      method: "PATCH",
      url: `/v1/admin/detailers/${candidate.userId}/review`,
      headers: adminHeaders,
      payload: {
        decision: "approved",
        notes: "Identity and both insurance policies checked for the Portsmouth pilot."
      }
    });
    expect(approval.statusCode).toBe(200);
    expect(approval.json().onboarding).toMatchObject({ status: "approved" });
  });

  it("queues support and account deletion, then revokes the session", async () => {
    const registration = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        role: "customer",
        email: "delete.me@valx.test",
        password: "Customer-password-2026",
        name: "Delete Me",
        phone: "07111111111",
        waterAvailable: true
      }
    });
    const verified = await verifyLatestRegistration("delete.me@valx.test");
    const headers = {
      authorization: `Bearer ${verified.json().token as string}`
    };
    const support = await app.inject({
      method: "POST",
      url: "/v1/support/requests",
      headers,
      payload: {
        category: "account",
        message: "Please help me understand my private beta account."
      }
    });
    expect(support.statusCode).toBe(201);

    const deletion = await app.inject({
      method: "POST",
      url: "/v1/account/deletion-request",
      headers,
      payload: { confirmation: "DELETE", reason: "Private beta test" }
    });
    expect(deletion.statusCode).toBe(202);
    expect(deletion.json().deletionRequest.status).toBe("requested");

    const me = await app.inject({ method: "GET", url: "/v1/me", headers });
    expect(me.statusCode).toBe(401);
  });
});
