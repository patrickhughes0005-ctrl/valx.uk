import { createPostgresRepository } from "./repository.js";
import { hashPassword, normaliseEmail } from "./security.js";

const arg = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const email = arg("--email");
const name = arg("--name");
const confirmed = process.argv.includes("--confirm");
const databaseUrl = process.env.DATABASE_URL;
const initialPassword = process.env.VALX_ADMIN_INITIAL_PASSWORD;

if (!confirmed || !email || !name) {
  throw new Error("Use --email, --name and --confirm to bootstrap an admin");
}
if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!initialPassword || initialPassword.length < 16) {
  throw new Error("VALX_ADMIN_INITIAL_PASSWORD must be at least 16 characters");
}

const repository = createPostgresRepository(databaseUrl);
try {
  const admin = await repository.createAdmin({
    email: normaliseEmail(email),
    name: name.trim(),
    passwordHash: await hashPassword(initialPassword)
  });
  console.log(`ValX administrator ready: ${admin.email}`);
} finally {
  await repository.close();
}
