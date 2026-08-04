import nodemailer from "nodemailer";
import type { ApiConfig } from "./config.js";

export type AuthEmailMessage = {
  kind: "verify_email" | "reset_password";
  to: string;
  actionUrl: string;
  expiresInMinutes: number;
};

export interface AuthEmailDelivery {
  send(message: AuthEmailMessage): Promise<void>;
}

export class CaptureAuthEmailDelivery implements AuthEmailDelivery {
  readonly messages: AuthEmailMessage[] = [];

  async send(message: AuthEmailMessage) {
    this.messages.push(message);
  }
}

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const createAuthEmailDelivery = (
  config: ApiConfig
): AuthEmailDelivery => {
  if (config.AUTH_EMAIL_MODE === "capture") {
    return new CaptureAuthEmailDelivery();
  }

  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.smtpSecure,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASSWORD
    },
    requireTLS: !config.smtpSecure,
    tls: { minVersion: "TLSv1.2" }
  });

  return {
    async send(message) {
      const verification = message.kind === "verify_email";
      const title = verification
        ? "Verify your ValX email address"
        : "Reset your ValX password";
      const instruction = verification
        ? "Verify this email address to finish creating your ValX account."
        : "Use the secure link below to choose a new ValX password.";
      const expiry = `${message.expiresInMinutes} minutes`;
      const safeUrl = escapeHtml(message.actionUrl);

      await transport.sendMail({
        from: config.SMTP_FROM,
        to: message.to,
        subject: title,
        text: `${instruction}\n\n${message.actionUrl}\n\nThis link expires in ${expiry}. If you did not request this, you can ignore this email.`,
        html: `<p>${instruction}</p><p><a href="${safeUrl}">Continue securely</a></p><p>This link expires in ${expiry}. If you did not request this, you can ignore this email.</p>`
      });
    }
  };
};
