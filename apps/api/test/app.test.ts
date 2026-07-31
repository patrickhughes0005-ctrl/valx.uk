import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config";

const config = loadConfig({
  NODE_ENV: "test",
  BETA_REGISTRATION_MODE: "open",
  DVLA_MODE: "mock",
  GOOGLE_MAPS_MODE: "mock"
});
const app = await createApp(config);

beforeAll(async () => app.ready());
afterAll(async () => app.close());

describe("ValX API", () => {
  it("reports that real payments are not connected", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      paymentsConnected: false,
      integrations: { dvla: "mock", googleMaps: "mock" }
    });
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
    const customerToken = customerRegistration.json().token as string;
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
    const detailerHeaders = {
      authorization: `Bearer ${detailerRegistration.json().token as string}`
    };

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
    const headers = {
      authorization: `Bearer ${registration.json().token as string}`
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
