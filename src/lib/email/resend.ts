import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

// Resend test domain until a real sending domain is verified.
// Swap RESEND_FROM_EMAIL once nu.edu.pk (or a subdomain) is verified in Resend.
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Carpool Hub <onboarding@resend.dev>';
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'piroammar388@gmail.com';
