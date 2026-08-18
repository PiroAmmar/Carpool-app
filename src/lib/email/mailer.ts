import nodemailer from 'nodemailer';

// Dedicated Gmail account for automated sends — not the admin's personal inbox.
// Auth uses a Gmail App Password (requires 2FA enabled on the account),
// not the account's regular login password.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendEmail(params: { to?: string; bcc?: string[]; subject: string; html: string }) {
  try {
    await transporter.sendMail({
      from: `Ammar FAST Carpool <${process.env.GMAIL_USER}>`,
      to: params.to || process.env.GMAIL_USER,
      bcc: params.bcc,
      subject: params.subject,
      html: params.html,
    });
    return { error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown SMTP error';
    return { error: { message } };
  }
}

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'piroammar388@gmail.com';
