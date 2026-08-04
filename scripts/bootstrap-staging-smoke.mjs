import {
  createOneTimeToken,
  hashOneTimeToken,
  hashPassword,
  normaliseEmail
} from "/workspace/apps/api/dist/security.js";
import { createPostgresRepository } from "/workspace/apps/api/dist/repository.js";

const databaseUrl = process.env.DATABASE_URL;
const tokenPepper = process.env.AUTH_TOKEN_PEPPER;
const customerEmail = process.env.STAGING_SMOKE_CUSTOMER_EMAIL;
const customerPassword = process.env.STAGING_SMOKE_CUSTOMER_PASSWORD;
const detailerEmail = process.env.STAGING_SMOKE_DETAILER_EMAIL;
const detailerPassword = process.env.STAGING_SMOKE_DETAILER_PASSWORD;

if (
  !databaseUrl ||
  !tokenPepper ||
  !customerEmail ||
  !customerPassword ||
  !detailerEmail ||
  !detailerPassword
) {
  throw new Error(
    "DATABASE_URL, AUTH_TOKEN_PEPPER and all four STAGING_SMOKE variables are required"
  );
}
if (customerEmail === detailerEmail) {
  throw new Error("The staging customer and detailer must use different emails");
}
if (customerPassword.length < 16 || detailerPassword.length < 16) {
  throw new Error("Dedicated staging passwords must contain at least 16 characters");
}

const repository = createPostgresRepository(databaseUrl);

async function issueAndConsumeToken(userId, purpose, consume) {
  const token = createOneTimeToken();
  const tokenHash = hashOneTimeToken(token, tokenPepper);
  await repository.createAuthToken({
    userId,
    purpose,
    tokenHash,
    expiresAt: new Date(Date.now() + 5 * 60 * 1_000)
  });
  if (!(await consume(tokenHash))) {
    throw new Error(`Could not consume ${purpose} token for staging account`);
  }
}

async function ensureAccount({ role, email, password }) {
  const normalisedEmail = normaliseEmail(email);
  let user = await repository.findUserByEmail(normalisedEmail);
  if (user && user.role !== role) {
    throw new Error(`Dedicated staging email already belongs to role ${user.role}`);
  }
  if (!user) {
    user = await repository.createUser({
      role,
      email: normalisedEmail,
      name: role === "customer" ? "Staging Smoke Customer" : "Staging Smoke Detailer",
      phone: role === "customer" ? "07111110001" : "07111110002",
      passwordHash: await hashPassword(password),
      ...(role === "customer"
        ? { waterAvailable: true }
        : {
            ownWaterSupply: true,
            serviceRadiusMiles: 12,
            vatRegistered: false
          })
    });
  }

  await issueAndConsumeToken(user.id, "reset_password", async (tokenHash) =>
    repository.resetPassword(tokenHash, await hashPassword(password))
  );

  user = await repository.findUserByEmail(normalisedEmail);
  if (!user?.emailVerifiedAt) {
    await issueAndConsumeToken(user.id, "verify_email", (tokenHash) =>
      repository.verifyEmail(tokenHash)
    );
  }
}

try {
  await ensureAccount({
    role: "customer",
    email: customerEmail,
    password: customerPassword
  });
  await ensureAccount({
    role: "detailer",
    email: detailerEmail,
    password: detailerPassword
  });
  if (
    !(await repository.approveDetailerByEmail(
      normaliseEmail(detailerEmail),
      "Automated staging bootstrap"
    ))
  ) {
    throw new Error("Dedicated staging detailer could not be approved");
  }
  console.log(
    "Dedicated staging smoke accounts are verified and the detailer is approved"
  );
} finally {
  await repository.close();
}
