import {
  createHmac,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);
const KEY_LENGTH = 64;

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

export const hashPassword = async (password: string) => {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt.toString("base64url")}:${derived.toString("base64url")}`;
};

export const verifyPassword = async (password: string, encoded: string) => {
  const [algorithm, saltValue, hashValue] = encoded.split(":");
  if (algorithm !== "scrypt" || !saltValue || !hashValue) return false;
  const expected = Buffer.from(hashValue, "base64url");
  const actual = (await scrypt(
    password,
    Buffer.from(saltValue, "base64url"),
    expected.length
  )) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export const createSessionToken = () => randomBytes(32).toString("base64url");

export const createOneTimeToken = () => randomBytes(32).toString("base64url");

export const hashSessionToken = (token: string, pepper: string) =>
  createHmac("sha256", pepper).update(token).digest("hex");

export const hashOneTimeToken = (token: string, pepper: string) =>
  createHmac("sha256", pepper)
    .update(`valx-auth-token:${token}`)
    .digest("hex");

export const constantTimeTextEqual = (left: string, right: string) => {
  const leftDigest = createHmac("sha256", "valx-constant-time")
    .update(left)
    .digest();
  const rightDigest = createHmac("sha256", "valx-constant-time")
    .update(right)
    .digest();
  return timingSafeEqual(leftDigest, rightDigest);
};
