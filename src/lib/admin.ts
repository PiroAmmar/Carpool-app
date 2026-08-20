/**
 * Utilities for administrative role and email checks.
 */

function getAdminEmails(): string[] {
  const envAdmin = (process.env.ADMIN_EMAIL ?? '').toLowerCase().trim();
  return [
    'piroammar388@gmail.com',
    'ammarcarpool@gmail.com',
    ...(envAdmin ? envAdmin.split(',').map((e) => e.trim()) : []),
  ];
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return getAdminEmails().includes(normalized);
}
