import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * SMTP email via nodemailer. Configuration is read from the environment so the
 * app runs fine without it: when SMTP isn't configured (or a send fails),
 * `sendMail` resolves to `{ sent: false }` instead of throwing — the in-app
 * notification is the source of truth and must never be blocked by email.
 *
 * Env:
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE ("true" for 465),
 *   SMTP_USER, SMTP_PASS, SMTP_FROM (falls back to SMTP_USER).
 */

let cached: Transporter | null | undefined;

function transporter(): Transporter | null {
  if (cached !== undefined) return cached;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    cached = null;
    return cached;
  }

  const port = Number(process.env.SMTP_PORT || "587");
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : port === 465;

  cached = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  return cached;
}

export function emailConfigured(): boolean {
  return transporter() !== null;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ sent: boolean; error?: string }> {
  const tx = transporter();
  if (!tx) return { sent: false };

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "";
  try {
    await tx.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
    });
    return { sent: true };
  } catch (err) {
    // Never surface as a 500 — log and report softly so the notification stands.
    const error = err instanceof Error ? err.message : String(err);
    console.error("[email] send failed:", error);
    return { sent: false, error };
  }
}
