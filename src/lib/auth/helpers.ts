// Helper untuk sistem login murni Username + Password tanpa perlu email
export const INTERNAL_EMAIL_DOMAIN = 'bumiayu.internal';

export function usernameToEmail(username: string): string {
  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  return `${cleanUsername}@${INTERNAL_EMAIL_DOMAIN}`;
}

export function emailToUsername(email: string): string {
  if (email.endsWith(`@${INTERNAL_EMAIL_DOMAIN}`)) {
    return email.replace(`@${INTERNAL_EMAIL_DOMAIN}`, '');
  }
  return email;
}
