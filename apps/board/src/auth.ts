import { createNeonAuth } from '@neondatabase/auth/next/server';

export function auth() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !secret) throw new Error('Admin authentication is not configured');
  return createNeonAuth({ baseUrl, cookies: { secret }, logLevel: 'silent' });
}

export { isAdmin } from './admin-authorization.js';
