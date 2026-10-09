/**
 * Outgoing email.
 *
 * Used for newsletter double opt-in. SMTP details come from environment
 * variables; when they are missing, nothing is silently dropped — the
 * caller is told mail is not configured so the dashboard can say so
 * plainly instead of pretending a message was sent.
 */
let transportPromise: Promise<any | null> | null = null;

export type MailStatus = { available: boolean; reason: string };

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;
  const from = process.env.SMTP_FROM || user || '';
  return { host, user, pass, port, from };
}

async function getTransport(): Promise<any | null> {
  if (transportPromise) return transportPromise;
  transportPromise = (async () => {
    const { host, user, pass, port } = smtpConfig();
    if (!host || !user || !pass) return null;
    try {
      const mod: any = await import('nodemailer');
      const nodemailer = mod?.default || mod;
      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // 465 is implicit TLS; 587 upgrades with STARTTLS
        auth: { user, pass },
      });
    } catch (err) {
      console.warn('[mail] nodemailer is not installed:', err);
      return null;
    }
  })();
  return transportPromise;
}

export async function mailStatus(): Promise<MailStatus> {
  const { host, user, pass } = smtpConfig();
  if (!host || !user || !pass) {
    return { available: false, reason: 'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM.' };
  }
  const t = await getTransport();
  return t
    ? { available: true, reason: `Sending through ${host}` }
    : { available: false, reason: 'nodemailer could not be loaded on this server.' };
}

export async function sendMail(to: string, subject: string, html: string, text: string): Promise<{ sent: boolean; error?: string }> {
  const transport = await getTransport();
  if (!transport) {
    const { reason } = await mailStatus();
    return { sent: false, error: reason };
  }
  try {
    await transport.sendMail({ from: smtpConfig().from, to, subject, html, text });
    return { sent: true };
  } catch (err: any) {
    console.warn('[mail] send failed:', err?.message || err);
    return { sent: false, error: err?.message || 'The email could not be sent.' };
  }
}

/** Throwaway-inbox providers. Blocking these removes most junk signups
 * without demanding anything extra from a real subscriber. */
const DISPOSABLE = new Set([
  'mailinator.com', 'yopmail.com', 'guerrillamail.com', 'sharklasers.com', 'grr.la',
  '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'throwawaymail.com', 'getnada.com',
  'trashmail.com', 'dispostable.com', 'maildrop.cc', 'fakeinbox.com', 'mailnesia.com',
  'tempinbox.com', 'mytemp.email', 'emailondeck.com', 'spamgourmet.com', 'moakt.com',
  'mohmal.com', 'inboxbear.com', 'tempmailo.com', 'minuteinbox.com', 'burnermail.io',
]);

export function isDisposableEmail(email: string): boolean {
  const domain = String(email).split('@')[1]?.toLowerCase().trim();
  if (!domain) return false;
  if (DISPOSABLE.has(domain)) return true;
  // Also catch sub-domains such as mail.yopmail.com
  return [...DISPOSABLE].some((d) => domain.endsWith(`.${d}`));
}
