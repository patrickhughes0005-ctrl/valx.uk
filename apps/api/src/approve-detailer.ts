import { createPostgresRepository } from "./repository.js";
import { normaliseEmail } from "./security.js";

const valueAfter = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const email = valueAfter("--email");
const operator = valueAfter("--operator");
const confirmed = process.argv.includes("--confirm");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}
if (!email || email.length > 254 || !email.includes("@")) {
  throw new Error("A valid --email value is required");
}
if (
  !operator ||
  operator.trim().length < 3 ||
  operator.trim().length > 120
) {
  throw new Error("A named --operator value is required for the audit log");
}
if (!confirmed) {
  throw new Error("Add --confirm after completing the detailer checks");
}

const repository = createPostgresRepository(databaseUrl);

try {
  const approved = await repository.approveDetailerByEmail(
    normaliseEmail(email),
    operator.trim()
  );
  if (!approved) {
    throw new Error("No active detailer account matched that email address");
  }
  process.stdout.write("Detailer approved and audit event recorded.\n");
} finally {
  await repository.close();
}
