import { z } from "zod";

const environment = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_HOST: z.string().default("127.0.0.1"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:8081"),
  DATABASE_URL: z.string().optional(),
  AUTH_TOKEN_PEPPER: z.string().min(16).default("valx-local-pepper-change-me"),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(168),
  EMAIL_VERIFICATION_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(15)
    .max(1440)
    .default(60),
  PASSWORD_RESET_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(10)
    .max(120)
    .default(30),
  AUTH_EMAIL_MODE: z.enum(["capture", "smtp"]).default("capture"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().max(65535).default(587),
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().min(3).default("ValX <support@valx.uk>"),
  BETA_REGISTRATION_MODE: z.enum(["invite_only", "open"]).default("invite_only"),
  BETA_INVITE_CODE: z.string().min(8).optional(),
  BETA_ALLOWED_EMAILS: z.string().default(""),
  SUPPORT_EMAIL: z.string().email().default("support@example.invalid"),
  PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  ADMIN_APP_URL: z.string().url().default("http://localhost:3001"),
  DOCUMENT_STORAGE_PATH: z.string().min(1).default("./.private/detailer-documents"),
  DOCUMENT_MAX_BYTES: z.coerce.number().int().min(1024).max(10 * 1024 * 1024).default(5 * 1024 * 1024),
  DVLA_MODE: z.enum(["mock", "live"]).default("mock"),
  DVLA_API_BASE_URL: z
    .string()
    .url()
    .default(
      "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1"
    ),
  DVLA_API_KEY: z.string().optional(),
  GOOGLE_MAPS_MODE: z.enum(["mock", "live"]).default("mock"),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  GOOGLE_PLACES_BASE_URL: z
    .string()
    .url()
    .default("https://places.googleapis.com/v1"),
  GOOGLE_ROUTES_BASE_URL: z
    .string()
    .url()
    .default("https://routes.googleapis.com/directions/v2")
});

export type ApiConfig = z.infer<typeof environment> & {
  corsOrigins: string[];
  betaAllowedEmails: string[];
  smtpSecure: boolean;
};

export const loadConfig = (
  input: NodeJS.ProcessEnv = process.env
): ApiConfig => {
  const parsed = environment.parse(input);
  if (parsed.NODE_ENV === "production") {
    z.string().min(1).parse(parsed.DATABASE_URL);
    z.string().min(32).parse(parsed.AUTH_TOKEN_PEPPER);
    if (
      parsed.BETA_REGISTRATION_MODE === "invite_only" &&
      !parsed.BETA_INVITE_CODE &&
      !parsed.BETA_ALLOWED_EMAILS.trim()
    ) {
      throw new Error(
        "Production invite-only registration needs BETA_INVITE_CODE or BETA_ALLOWED_EMAILS"
      );
    }
    if (parsed.SUPPORT_EMAIL.endsWith(".invalid")) {
      throw new Error("Production requires a monitored SUPPORT_EMAIL");
    }
    if (parsed.AUTH_EMAIL_MODE !== "smtp") {
      throw new Error("Production requires AUTH_EMAIL_MODE=smtp");
    }
    z.string().min(1).parse(parsed.SMTP_HOST);
    z.string().min(1).parse(parsed.SMTP_USER);
    z.string().min(12).parse(parsed.SMTP_PASSWORD);
  }
  if (parsed.NODE_ENV === "production" && parsed.DVLA_MODE === "live") {
    z.string().min(1).parse(parsed.DVLA_API_KEY);
  }
  if (parsed.NODE_ENV === "production" && parsed.GOOGLE_MAPS_MODE === "live") {
    z.string().min(1).parse(parsed.GOOGLE_MAPS_API_KEY);
  }
  return {
    ...parsed,
    smtpSecure: parsed.SMTP_SECURE === "true",
    betaAllowedEmails: parsed.BETA_ALLOWED_EMAILS.split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
    corsOrigins: parsed.API_CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  };
};
