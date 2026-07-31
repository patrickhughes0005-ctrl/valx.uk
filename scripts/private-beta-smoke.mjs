import { randomBytes } from "node:crypto";

const apiUrl = process.env.STAGING_API_URL?.replace(/\/$/, "");
const inviteCode = process.env.BETA_INVITE_CODE;

if (!apiUrl || !inviteCode) {
  throw new Error(
    "STAGING_API_URL and BETA_INVITE_CODE are required for the staging smoke test"
  );
}

const stamp = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const password = `ValX-beta-${randomBytes(12).toString("base64url")}!`;

async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path}: ${JSON.stringify(body)}`);
  }
  return body;
}

const customer = await request("/v1/auth/register", {
  method: "POST",
  body: {
    role: "customer",
    email: `customer-${stamp}@beta.valx.test`,
    password,
    name: "Staging Customer",
    phone: "07123456789",
    inviteCode,
    waterAvailable: true
  }
});

const detailer = await request("/v1/auth/register", {
  method: "POST",
  body: {
    role: "detailer",
    email: `detailer-${stamp}@beta.valx.test`,
    password,
    name: "Staging Detailer",
    phone: "07987654321",
    inviteCode,
    ownWaterSupply: true,
    serviceRadiusMiles: 12,
    vatRegistered: false
  }
});

const vehicle = await request("/v1/customer/vehicles", {
  method: "POST",
  token: customer.token,
  body: {
    registrationNumber: "BETA 01",
    make: "ValX",
    model: "Pilot Vehicle",
    type: "suv",
    lookupSource: "manual"
  }
});

const address = await request("/v1/customer/addresses", {
  method: "POST",
  token: customer.token,
  body: {
    label: "1 Staging Street, Oxford, OX1 1AA",
    postcode: "OX1 1AA",
    waterAvailable: true
  }
});

const quote = await request("/v1/customer/quotes", {
  method: "POST",
  token: customer.token,
  body: {
    serviceId: "exterior-interior",
    vehicleType: "suv",
    distanceMiles: 1.8
  }
});

if (quote.paymentState !== "not_connected") {
  throw new Error("Staging unexpectedly reports a connected payment state");
}

const created = await request("/v1/customer/bookings", {
  method: "POST",
  token: customer.token,
  body: {
    vehicleId: vehicle.vehicle.id,
    addressId: address.address.id,
    quoteId: quote.quote.id,
    bookingType: "prebook",
    scheduledFor: new Date(Date.now() + 86_400_000).toISOString()
  }
});

const offers = await request("/v1/detailer/offers", {
  token: detailer.token
});
if (!offers.offers.some(({ id }) => id === created.booking.id)) {
  throw new Error("The customer booking was not offered to the eligible detailer");
}

await request(`/v1/detailer/bookings/${created.booking.id}/accept`, {
  method: "POST",
  token: detailer.token
});

for (const status of ["on_way", "arrived", "in_progress", "completed"]) {
  await request(`/v1/detailer/bookings/${created.booking.id}/status`, {
    method: "PATCH",
    token: detailer.token,
    body: { status }
  });
}

const history = await request("/v1/customer/bookings", {
  token: customer.token
});
const completed = history.bookings.find(({ id }) => id === created.booking.id);
if (completed?.status !== "completed" || completed.paymentState !== "not_connected") {
  throw new Error("The completed booking history did not match the beta contract");
}

for (const token of [customer.token, detailer.token]) {
  await request("/v1/account/deletion-request", {
    method: "POST",
    token,
    body: { confirmation: "DELETE", reason: "Automated staging smoke account" }
  });
}

console.log(
  `ValX staging smoke passed: ${created.booking.id} completed without payment`
);
