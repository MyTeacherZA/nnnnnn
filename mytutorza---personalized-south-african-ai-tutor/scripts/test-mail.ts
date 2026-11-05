/**
 * SMTP self-test for password-recovery email.
 *
 *   npm run mail:test -- you@example.com
 *
 * Reads .env (or the current environment), prints the settings it will use
 * (never the password), then sends a real test email.
 */

import dotenv from 'dotenv';
import { getMailSettings, isMailConfigured, sendMail } from '../serverMailer';

dotenv.config();

const to = process.argv[2] || process.env.SMTP_USER || '';

async function main() {
  const s = getMailSettings();

  console.log('SMTP configuration being used:');
  console.log('  host :', s.host || '(missing)');
  console.log('  port :', s.port, s.secure ? '(implicit TLS)' : '(STARTTLS / plain)');
  console.log('  user :', s.user || '(missing)');
  console.log('  from :', s.from || '(missing)');
  console.log('  pass :', process.env.SMTP_PASS ? `set (${process.env.SMTP_PASS.replace(/\s/g, '').length} chars)` : '(missing)');

  if (!isMailConfigured()) {
    console.error('\n✗ SMTP is not configured.');
    console.error('  Set SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM in your .env file.');
    process.exit(1);
  }

  if (!to) {
    console.error('\n✗ No recipient. Usage: npm run mail:test -- you@example.com');
    process.exit(1);
  }

  console.log(`\nSending test email to ${to} …`);
  const info = await sendMail({
    to,
    subject: 'MyTutorZA SMTP test',
    text: 'If you can read this, password-recovery email delivery is working.',
    html: '<p>If you can read this, <strong>password-recovery email delivery is working</strong>.</p>',
  });
  console.log('✓ Sent. messageId:', info.messageId);
}

main().catch((err: any) => {
  const message = err?.message || String(err);
  console.error('\n✗ Send failed:', message);

  if (/535|5\.7\.8|Invalid login|Username and Password not accepted|BadCredentials/i.test(message)) {
    console.error('  → The provider rejected the username/password.');
    console.error('    Gmail needs a 16-character App Password (requires 2-Step Verification),');
    console.error('    not your normal Google password. See SETUP_GUIDE.md §2.');
  } else if (/ENOTFOUND|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN/i.test(message)) {
    console.error('  → Cannot reach the SMTP host. Check SMTP_HOST / SMTP_PORT.');
  } else if (/certificate|self.signed|CERT/i.test(message)) {
    console.error('  → TLS problem. Use SMTP_PORT=465 with SMTP_SECURE=true for Gmail.');
  }

  process.exit(1);
});
