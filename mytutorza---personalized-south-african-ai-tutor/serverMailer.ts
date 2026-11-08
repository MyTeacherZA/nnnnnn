/**
 * ============================================================================
 * MyTutorZA: Transactional mail (password recovery)
 * ============================================================================
 * Uses SMTP via nodemailer. Configure with:
 *   SMTP_HOST   e.g. smtp.gmail.com
 *   SMTP_PORT   465 (TLS) or 587 (STARTTLS)
 *   SMTP_USER   the mailbox that authenticates, e.g. lexiparcio@gmail.com
 *   SMTP_PASS   app password (for Gmail: a 16-character App Password)
 *   SMTP_FROM   "MyTutorZA <lexiparcio@gmail.com>"  (defaults to SMTP_USER)
 *   SMTP_SECURE "true" for port 465
 *
 * If these are not set, password-reset emails are skipped and the API reports
 * `smtp_not_configured` instead of pretending the mail was sent.
 */

import nodemailer from 'nodemailer';

export interface MailSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
}

export function getMailSettings(): MailSettings {
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || '';
  return {
    host: process.env.SMTP_HOST || '',
    port,
    user,
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.MAIL_FROM || user,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
  };
}

export function isMailConfigured(): boolean {
  const s = getMailSettings();
  return !!(s.host && s.user && s.pass && s.from);
}

export async function sendMail(params: { to: string; subject: string; html: string; text: string }) {
  const settings = getMailSettings();
  if (!isMailConfigured()) {
    throw new Error('SMTP is not configured');
  }

  // TLS stays strict in production; the two escape hatches below exist only
  // for local/dev SMTP sinks that use self-signed certificates.
  const ignoreTls = process.env.SMTP_IGNORE_TLS === 'true';
  const rejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false';

  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    ignoreTLS: ignoreTls,
    auth: { user: settings.user, pass: settings.pass },
    tls: { rejectUnauthorized },
  });

  return transporter.sendMail({
    from: settings.from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
}
